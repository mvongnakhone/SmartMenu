import os
import base64
import requests
from google.cloud import vision
import io
import tempfile
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Use environment variable for API key
API_KEY = os.environ.get('GOOGLE_VISION_API_KEY')
API_URL = f"https://vision.googleapis.com/v1/images:annotate?key={API_KEY}"

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
        
        # Convert image to base64
        base64_image = image_to_base64(image_file)
        
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