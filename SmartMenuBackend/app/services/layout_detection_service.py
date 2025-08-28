import os
import io
import base64
import logging
from typing import List, Dict, Any
import time

import requests
from PIL import Image, ImageDraw, ImageFont

try:
    import layoutparser as lp
except Exception as e:  # pragma: no cover
    lp = None

logger = logging.getLogger(__name__)

# Reuse Google Vision endpoint style from vision_service
API_KEY = os.environ.get('GOOGLE_VISION_API_KEY')
VISION_API_URL = f"https://vision.googleapis.com/v1/images:annotate?key={API_KEY}"

# Default PubLayNet label map (Text, Title, List, Table, Figure)
PUBLAYNET_LABELS = {
    0: "Text",
    1: "Title",
    2: "List",
    3: "Table",
    4: "Figure",
}

# PubLayNet Faster R-CNN weights URL (official layoutparser dropbox)
PUBLAYNET_FRCNN_WEIGHTS_URL = "https://www.dropbox.com/s/dgy9c10wykk4lq4/model_final.pth?dl=1"

# Create debug directory for visualizations
DEBUG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "debug")
os.makedirs(DEBUG_DIR, exist_ok=True)


def _pil_image_from_file(image_file) -> Image.Image:
    image_file.seek(0)
    return Image.open(io.BytesIO(image_file.read())).convert("RGB")


def _encode_image_crop_to_base64(pil_image: Image.Image) -> str:
    with io.BytesIO() as buffer:
        pil_image.save(buffer, format="JPEG", quality=92)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")


def _vision_text_for_base64(base64_image: str) -> Dict[str, Any]:
    body = {
        "requests": [
            {
                "image": {"content": base64_image},
                "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
                "imageContext": {"languageHints": ["th", "en"]},
            }
        ]
    }
    response = requests.post(
        VISION_API_URL,
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        json=body,
        timeout=60,
    )
    result = response.json()
    if "error" in result:
        message = result.get("error", {}).get("message", "Error detecting text")
        raise Exception(message)
    return result


def _extract_full_text_from_vision_response(resp: Dict[str, Any]) -> str:
    try:
        r0 = resp.get("responses", [{}])[0]
        annotations = r0.get("textAnnotations", [])
        if annotations:
            text = annotations[0].get("description", "")
            logger.debug(f"Found text via textAnnotations: {text[:50]}...")
            return text
        # Fallback to fullTextAnnotation.text if present
        fta = r0.get("fullTextAnnotation")
        if isinstance(fta, dict):
            text = fta.get("text", "")
            if text:
                logger.debug(f"Found text via fullTextAnnotation: {text[:50]}...")
                return text
        logger.debug("No text found in Vision response")
        return ""
    except Exception as e:
        logger.debug(f"Error extracting text: {e}")
        return ""


def _sanitize_iopath_cache() -> None:
    """Fix common iopath cache issue where filenames include '?dl=1'."""
    try:
        base_dir = os.path.expanduser("~/.torch/iopath_cache/s")
        if not os.path.isdir(base_dir):
            return
        for root, _, files in os.walk(base_dir):
            for fname in files:
                if "?dl=1" in fname and not fname.endswith(".lock"):
                    src = os.path.join(root, fname)
                    dst = os.path.join(root, fname.replace("?dl=1", ""))
                    if not os.path.exists(dst):
                        try:
                            os.rename(src, dst)
                            logger.info(f"Renamed cached file: {src} -> {dst}")
                        except Exception as e:
                            logger.warning(f"Failed renaming cached file {src}: {e}")
    except Exception as e:
        logger.debug(f"Cache sanitize skipped: {e}")


def _ensure_publaynet_weights_local() -> str:
    """Download PubLayNet Faster R-CNN weights to a local path without query suffix and return the path."""
    local_dir = os.path.expanduser("~/.cache/layoutparser/publaynet")
    os.makedirs(local_dir, exist_ok=True)
    local_path = os.path.join(local_dir, "faster_rcnn_R_50_FPN_3x_model_final.pth")

    # If already present and large enough, trust it
    try:
        if os.path.isfile(local_path) and os.path.getsize(local_path) > 100 * 1024 * 1024:
            return local_path
    except Exception:
        pass

    # Stream download to avoid memory spikes
    logger.info("Downloading PubLayNet weights to local cache (one-time)...")
    with requests.get(PUBLAYNET_FRCNN_WEIGHTS_URL, stream=True, timeout=300) as r:
        r.raise_for_status()
        with open(local_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)
    # Basic size check
    if os.path.getsize(local_path) < 100 * 1024 * 1024:
        raise RuntimeError("Downloaded PubLayNet weights seem incomplete. Please retry.")
    logger.info(f"Weights cached at: {local_path}")
    return local_path


def _pad_and_upsample_crop(image: Image.Image, bbox: List[int]) -> Image.Image:
    x1, y1, x2, y2 = bbox
    w = x2 - x1
    h = y2 - y1
    pad_x = max(4, int(0.02 * w))
    pad_y = max(4, int(0.02 * h))
    nx1 = max(0, x1 - pad_x)
    ny1 = max(0, y1 - pad_y)
    nx2 = min(image.width, x2 + pad_x)
    ny2 = min(image.height, y2 + pad_y)
    crop = image.crop((nx1, ny1, nx2, ny2))
    # Upsample small crops to aid OCR
    min_dim = min(crop.width, crop.height)
    if min_dim < 48:
        scale = max(1.5, 48.0 / max(1, min_dim))
        new_w = int(crop.width * scale)
        new_h = int(crop.height * scale)
        crop = crop.resize((new_w, new_h))
    return crop


def _visualize_layout(image: Image.Image, layout, filename: str, include_text: bool = False, text_blocks=None):
    """Save a visualization of the detected layout blocks."""
    # Make a copy of the image to draw on
    vis_image = image.copy()
    draw = ImageDraw.Draw(vis_image)
    
    # Try to load a font for text labels, use default if not available
    try:
        font = ImageFont.truetype("Arial.ttf", 20)
    except IOError:
        font = ImageFont.load_default()
    
    # Define colors for different block types
    colors = {
        "Text": (255, 0, 0, 128),      # Red
        "Title": (0, 255, 0, 128),     # Green
        "List": (0, 0, 255, 128),      # Blue
        "Table": (255, 255, 0, 128),   # Yellow
        "Figure": (255, 0, 255, 128),  # Magenta
        "Unknown": (128, 128, 128, 128)  # Gray
    }
    
    # Draw each block with its type as label
    for i, block in enumerate(layout):
        x1, y1, x2, y2 = map(int, [block.block.x_1, block.block.y_1, block.block.x_2, block.block.y_2])
        block_type = block.type if block.type in colors else "Unknown"
        color = colors[block_type]
        
        # Draw semi-transparent rectangle
        overlay = Image.new('RGBA', vis_image.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.rectangle([x1, y1, x2, y2], fill=color)
        
        # Draw border
        border_color = tuple(c for c in color[:3]) + (255,)  # Full opacity for border
        draw.rectangle([x1, y1, x2, y2], outline=border_color, width=2)
        
        # Add label with block type and confidence
        label = f"{block_type} ({i+1}): {block.score:.2f}"
        draw.text((x1+5, y1+5), label, fill=(255, 255, 255), font=font, stroke_width=2, stroke_fill=(0, 0, 0))
        
        # Add text content if available
        if include_text and text_blocks and i < len(text_blocks) and text_blocks[i].get('text'):
            text_preview = text_blocks[i]['text'][:50] + ('...' if len(text_blocks[i]['text']) > 50 else '')
            draw.text((x1+5, y1+30), text_preview, fill=(255, 255, 255), font=font, stroke_width=2, stroke_fill=(0, 0, 0))
    
    # Blend the overlay with the original image
    vis_image = Image.alpha_composite(vis_image.convert('RGBA'), overlay).convert('RGB')
    
    # Save the visualization
    output_path = os.path.join(DEBUG_DIR, filename)
    vis_image.save(output_path)
    logger.info(f"Saved layout visualization to {output_path}")
    return output_path


def detect_layout_and_ocr(image_file) -> Dict[str, Any]:
    """
    Run PubLayNet layout detection to segment the page, then run OCR per block
    using Google Vision. Returns blocks in reading order with text content.

    Returns:
        {
          "blocks": [
             {"type": "Text", "bbox": [x1,y1,x2,y2], "text": "..."},
             ...
          ],
          "model": "PubLayNet/faster_rcnn_R_50_FPN_3x",
        }
    """
    if lp is None:
        raise RuntimeError("layoutparser is not installed. Please install layoutparser[dl] and torch.")

    pil_image = _pil_image_from_file(image_file)
    logger.info(f"Processing image: {pil_image.width}x{pil_image.height}")

    # Prepare a clean local weights path and avoid '?dl=1' cache issue
    weights_path = _ensure_publaynet_weights_local()

    # Create model (CPU) with explicit local weights path
    model = lp.Detectron2LayoutModel(
        config_path="lp://PubLayNet/faster_rcnn_R_50_FPN_3x/config",
        model_path=weights_path,
        label_map=PUBLAYNET_LABELS,
        extra_config=[
            "MODEL.ROI_HEADS.SCORE_THRESH_TEST", 0.2,  # Lower threshold to detect more blocks
        ],
        enforce_cpu=True,
    )

    layout = model.detect(pil_image)
    logger.info(f"Detected {len(layout)} layout blocks")
    
    # Generate a timestamp for filenames
    timestamp = int(time.time())
    try:
        if hasattr(image_file, 'name'):
            # Try to extract timestamp from filename like temp_test_ThaiMenu4_1756391093670.jpg
            name_parts = os.path.basename(image_file.name).split('_')
            if len(name_parts) > 1:
                last_part = name_parts[-1].split('.')[0]
                if last_part.isdigit():
                    timestamp = last_part
    except Exception:
        pass
    
    # Save visualization of detected layout
    filename = f"layout_vis_{timestamp}.jpg"
    _visualize_layout(pil_image, layout, filename)
    
    # Add a fallback block for the entire image if no blocks detected
    if not layout:
        logger.info("No layout blocks detected, adding fallback for entire image")
        # Create a dummy block for the entire image
        dummy_block = {
            "type": "Text",
            "bbox": [0, 0, pil_image.width, pil_image.height],
        }
        vision_resp = _vision_text_for_base64(_encode_image_crop_to_base64(pil_image))
        text = _extract_full_text_from_vision_response(vision_resp)
        if text.strip():
            dummy_block["text"] = text.strip()
            return {"blocks": [dummy_block], "model": "PubLayNet/fallback_full_image"}
    
    # Sort blocks roughly top-to-bottom, left-to-right for reading order
    blocks_sorted = sorted(layout, key=lambda b: (b.block.y_1, b.block.x_1))

    results: List[Dict[str, Any]] = []
    block_count = 0
    text_blocks = 0
    blocks_with_text = []

    for block in blocks_sorted:
        # Include Table blocks as they often contain menu entries
        if block.type not in ("Text", "Title", "List", "Table"):
            logger.debug(f"Skipping block type: {block.type}")
            continue
            
        block_count += 1
        x1, y1, x2, y2 = map(int, [block.block.x_1, block.block.y_1, block.block.x_2, block.block.y_2])
        logger.debug(f"Processing {block.type} block {block_count}: {x1},{y1} - {x2},{y2}")
        
        # Save crop for debugging
        crop = _pad_and_upsample_crop(pil_image, [x1, y1, x2, y2])
        crop_path = os.path.join(DEBUG_DIR, f"block_{block_count}_{block.type}_{timestamp}.jpg")
        crop.save(crop_path)
        
        b64 = _encode_image_crop_to_base64(crop)
        vision_resp = _vision_text_for_base64(b64)
        text = _extract_full_text_from_vision_response(vision_resp)
        
        if not text.strip():
            logger.debug(f"No text in block {block_count}, skipping")
            continue
            
        text_blocks += 1
        block_result = {
            "type": block.type,
            "bbox": [x1, y1, x2, y2],
            "text": text.strip(),
        }
        results.append(block_result)
        blocks_with_text.append(block_result)

    logger.info(f"Processed {block_count} blocks, found text in {text_blocks} blocks")
    
    # Save visualization with text
    if blocks_with_text:
        text_vis_filename = f"layout_text_vis_{timestamp}.jpg"
        _visualize_layout(pil_image, layout, text_vis_filename, include_text=True, text_blocks=blocks_with_text)
    
    # If no blocks had text, try whole image as fallback
    if not results:
        logger.info("No blocks with text, trying whole image fallback")
        vision_resp = _vision_text_for_base64(_encode_image_crop_to_base64(pil_image))
        text = _extract_full_text_from_vision_response(vision_resp)
        if text.strip():
            results.append({
                "type": "Text",
                "bbox": [0, 0, pil_image.width, pil_image.height],
                "text": text.strip()
            })
            logger.info(f"Added fallback whole image text: {len(text)} chars")

    return {"blocks": results, "model": "PubLayNet/faster_rcnn_R_50_FPN_3x"} 