from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
import json
from dotenv import load_dotenv
from app.services.vision_service import detect_text
from app.services.ai_parsing_service import parse_menu_with_ai
from app.services.translation_service import translate_text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "SmartMenu API is running"}), 200

@app.route('/api/vision/detect', methods=['POST'])
def vision_detect():
    """Endpoint for text detection in images"""
    if 'image' not in request.files:
        logger.error("No image file in request")
        return jsonify({"error": "No image provided"}), 400
    
    image_file = request.files['image']
    
    if image_file.filename == '':
        logger.error("Empty filename")
        return jsonify({"error": "No image selected"}), 400
    
    # Get the bounding box parameter (defaults to enabled if not specified)
    use_bounding_box = request.form.get('use_bounding_box', 'true').lower() == 'true'
    logger.info(f"Bounding box processing: {'enabled' if use_bounding_box else 'disabled'}")
    
    try:
        # Process the image with Vision API
        logger.info(f"Processing image: {image_file.filename}")
        vision_response = detect_text(image_file, use_bounding_box)
        return jsonify(vision_response), 200
    except Exception as e:
        logger.exception(f"Error processing image: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/parse', methods=['POST'])
def parse_menu():
    """Endpoint for parsing menu text using AI"""
    data = request.json
    
    if not data or 'text' not in data:
        logger.error("No text provided in request")
        return jsonify({"error": "No text provided"}), 400
    
    try:
        # Parse the menu text
        logger.info("Parsing menu text")
        parsed_result = parse_menu_with_ai(data['text'])
        
        # Log the result in a clean, formatted way - each object on a single line
        if isinstance(parsed_result, list):
            formatted_result = "[\n"
            for item in parsed_result:
                formatted_result += f"  {json.dumps(item, ensure_ascii=False)},\n"
            formatted_result = formatted_result.rstrip(",\n") + "\n]"
            logger.info(f"\n=== AI PARSED RESPONSE ===\n{formatted_result}\n=========================")
        
        # Return the raw parsed result without additional formatting
        return jsonify({"result": parsed_result}), 200
    except Exception as e:
        logger.exception(f"Error parsing menu: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/translate', methods=['POST'])
def translate():
    """Endpoint for translating text"""
    data = request.json
    
    if not data or 'text' not in data:
        logger.error("No text provided in request")
        return jsonify({"error": "No text provided"}), 400
    
    target_lang = data.get('target_lang', 'en')
    
    try:
        # Translate the text
        logger.info(f"Translating text to {target_lang}")
        translated_text = translate_text(data['text'], target_lang)
        
        # Log the translated text in a clean, formatted way
        if translated_text and isinstance(translated_text, str) and not translated_text.startswith('Translation failed'):
            logger.info(f"\n=== TRANSLATED TEXT ===\n{translated_text}\n======================")
        
        return jsonify({"translated_text": translated_text}), 200
    except Exception as e:
        logger.exception(f"Error translating text: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    logger.info(f"Starting Flask app on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True) 