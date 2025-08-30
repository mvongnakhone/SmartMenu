import os
import base64
import requests
from google.cloud import vision
import io
import tempfile
import logging
import cv2
import numpy as np
import shutil
import time
from scipy.signal import find_peaks

# Configure logging
logger = logging.getLogger(__name__)

# Use environment variable for API key
API_KEY = os.environ.get('GOOGLE_VISION_API_KEY')
API_URL = f"https://vision.googleapis.com/v1/images:annotate?key={API_KEY}"

# Define the path for temp images
TEMP_IMAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'temp_images')

def clean_temp_images():
    """
    Cleans up the temporary images folder before processing
    """
    try:
        if os.path.exists(TEMP_IMAGES_DIR):
            for file in os.listdir(TEMP_IMAGES_DIR):
                file_path = os.path.join(TEMP_IMAGES_DIR, file)
                try:
                    if os.path.isfile(file_path):
                        os.unlink(file_path)
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                except Exception as e:
                    logger.error(f"Error while deleting {file_path}: {e}")
        else:
            os.makedirs(TEMP_IMAGES_DIR, exist_ok=True)
            
        logger.info('Temporary images folder cleaned')
    except Exception as e:
        logger.error(f"Error cleaning temporary images: {e}")

def deskew_image(image_bytes):
    """
    Deskews an image using Projection Profile method
    
    Args:
        image_bytes: The image bytes
        
    Returns:
        tuple: Deskewed image bytes and any metadata
    """
    try:
        # Convert image bytes to numpy array
        image_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        
        # Create a timestamp for unique filenames
        timestamp = int(time.time())
        
        # Save original image
        original_path = os.path.join(TEMP_IMAGES_DIR, f"original_{timestamp}.jpg")
        cv2.imwrite(original_path, img)
        
        # Convert to grayscale and apply Gaussian blur to reduce noise
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Threshold the image - use adaptive thresholding for better results with varying lighting
        binary = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                      cv2.THRESH_BINARY_INV, 11, 2)
        
        # Apply morphological operations to clean up the binary image
        kernel = np.ones((3, 3), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        # Calculate initial variance for comparison
        initial_projection = np.sum(binary, axis=1)
        initial_variance = np.var(initial_projection)
        
        # Find the best angle using projection profiles
        angles = np.arange(-10, 10, 0.5)  # Test angles from -10 to 10 degrees
        best_angle = 0
        max_variance = initial_variance
        
        height, width = binary.shape
        center = (width // 2, height // 2)
        
        for angle in angles:
            # Rotate the binary image
            M = cv2.getRotationMatrix2D(center, angle, 1)
            rotated = cv2.warpAffine(binary, M, (width, height), flags=cv2.INTER_NEAREST)
            
            # Calculate horizontal projection profile (sum of pixels in each row)
            projection = np.sum(rotated, axis=1)
            
            # Calculate variance of the projection - higher variance indicates better alignment
            variance = np.var(projection)
            
            if variance > max_variance:
                max_variance = variance
                best_angle = angle
        
        # If the improvement is minimal, skip deskewing
        if max_variance / initial_variance < 1.05:  # Less than 5% improvement
            logger.info('Skipping deskew - minimal improvement expected')
            return image_bytes, {"original_path": original_path}
        
        # Rotate the original image by the best angle
        M = cv2.getRotationMatrix2D(center, best_angle, 1.0)
        deskewed = cv2.warpAffine(img, M, (width, height), 
                                 flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        
        # Save deskewed image
        deskewed_path = os.path.join(TEMP_IMAGES_DIR, f"deskewed_{timestamp}.jpg")
        cv2.imwrite(deskewed_path, deskewed)
        
        # Convert deskewed image back to bytes
        _, deskewed_bytes = cv2.imencode('.jpg', deskewed)
        deskewed_bytes = deskewed_bytes.tobytes()
        
        logger.info(f'Image deskewed with angle {best_angle}, original: {original_path}, deskewed: {deskewed_path}')
        return deskewed_bytes, {"original_path": original_path, "deskewed_path": deskewed_path, "angle": best_angle}
            
    except Exception as e:
        logger.exception(f"Error deskewing image: {e}")
        return image_bytes, {}

def image_to_base64(image_file):
    """
    Converts an image file to base64
    
    Args:
        image_file: The image file object
        
    Returns:
        str: Base64 encoded image
    """
    try:
        # Read the image file
        image_content = image_file.read()
        # Encode to base64
        base64_image = base64.b64encode(image_content).decode('utf-8')
        return base64_image
    except Exception as e:
        logger.error(f"Error converting image to base64: {e}")
        raise

def detect_text(image_file):
    """
    Detects text in an image using Google Cloud Vision API
    
    Args:
        image_file: The image file object
        
    Returns:
        dict: The API response with detected text
    """
    try:
        # Make sure we're at the beginning of the file
        image_file.seek(0)
        
        # Clean temp images folder before processing
        clean_temp_images()
        
        # Read the image
        image_content = image_file.read()
        
        # Deskew the image before processing
        deskewed_content, metadata = deskew_image(image_content)
        
        # Convert deskewed image to base64
        base64_image = base64.b64encode(deskewed_content).decode('utf-8')
        
        # Prepare request body
        body = {
            "requests": [
                {
                    "image": {
                        "content": base64_image,
                    },
                    "features": [
                        {
                            "type": "DOCUMENT_TEXT_DETECTION"
                        },
                    ],
                    "imageContext": {
                        "languageHints": ["th", "en"]
                    }
                },
            ],
        }

        logger.info('Sending request to Vision API...')
        
        # Make API request
        response = requests.post(
            API_URL,
            headers={
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            json=body
        )
        
        # Parse response
        result = response.json()
        
        # Check for errors
        if 'error' in result:
            error_message = result.get('error', {}).get('message', 'Error detecting text')
            logger.error(f"API Error: {error_message}")
            raise Exception(error_message)
        
        return result
    except Exception as e:
        logger.exception(f"Error in text detection: {e}")
        raise

def get_detected_text(vision_response):
    """
    Extracts all detected text from Vision API response
    
    Args:
        vision_response: The response from Google Cloud Vision API
        
    Returns:
        str: All detected text as a single string
    """
    try:
        if not vision_response or 'responses' not in vision_response or not vision_response['responses'] or \
           'textAnnotations' not in vision_response['responses'][0] or not vision_response['responses'][0]['textAnnotations']:
            return "No text detected"

        # Get the full text from the first annotation which contains all detected text
        full_text = vision_response['responses'][0]['textAnnotations'][0]['description']
        logger.info('Text successfully extracted from image')
        
        return full_text
    except Exception as e:
        logger.exception(f"Error getting detected text: {e}")
        return "Error extracting text" 