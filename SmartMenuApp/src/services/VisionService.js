import * as FileSystem from 'expo-file-system';
import { GOOGLE_VISION_API_KEY } from '@env';

// Use environment variable for API key
const API_KEY = GOOGLE_VISION_API_KEY;
const API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`;

/**
 * Converts an image file to base64
 * @param {string} uri - The file URI of the image
 * @returns {Promise<string>} - Base64 encoded image
 */
export const imageToBase64 = async (uri) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

/**
 * Detects text in an image using Google Cloud Vision API
 * @param {string} imageUri - The file URI of the image
 * @returns {Promise<Object>} - The API response with detected text
 */
export const detectText = async (imageUri) => {
  try {
    // Convert image to base64
    const base64Image = await imageToBase64(imageUri);
    
    // Prepare request body
    const body = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'DOCUMENT_TEXT_DETECTION'
            },
          ],
          imageContext: {
            languageHints: ['th', 'en']
          }
        },
      ],
    };

    console.log('Sending request to Vision API...');
    
    // Make API request
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Parse response
    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message || 'Error detecting text');
    }
    
    return result;
  } catch (error) {
    console.error('Error in text detection:', error);
    throw error;
  }
};

/**
 * Extracts all detected text from Vision API response
 * @param {Object} visionResponse - The response from Google Cloud Vision API
 * @returns {string} - All detected text as a single string
 */
export const getDetectedText = (visionResponse) => {
  try {
    if (!visionResponse?.responses?.[0]?.textAnnotations?.[0]?.description) {
      return "No text detected";
    }

    // Get the full text from the first annotation which contains all detected text
    const fullText = visionResponse.responses[0].textAnnotations[0].description;
    console.log('Extracted text:', fullText);
    
    return fullText;
  } catch (error) {
    console.error('Error getting detected text:', error);
    return "Error extracting text";
  }
}; 

/**
 * Detects text with position information in a single step
 * @param {string} imageUri - The file URI of the image
 * @returns {Promise<Object>} - Simplified structure with text and positions
 */
export const detectTextWithPositions = async (imageUri) => {
  try {
    // Get the full API response
    const visionResponse = await detectText(imageUri);
    
    // Extract the full text for display purposes
    const fullText = getDetectedText(visionResponse);
    
    // Extract text elements with positions
    const textElements = [];
    
    if (visionResponse?.responses?.[0]?.textAnnotations) {
      // Skip the first annotation (which is the full text)
      const annotations = visionResponse.responses[0].textAnnotations.slice(1);
      
      // Process each text element
      for (const annotation of annotations) {
        textElements.push({
          text: annotation.description,
          position: annotation.boundingPoly.vertices,
          center: {
            x: annotation.boundingPoly.vertices.reduce((sum, v) => sum + v.x, 0) / 4,
            y: annotation.boundingPoly.vertices.reduce((sum, v) => sum + v.y, 0) / 4
          }
        });
      }
    }
    
    // Return both the full text and the structured text elements
    return {
      fullText,
      textElements
    };
  } catch (error) {
    console.error('Error detecting text with positions:', error);
    throw error;
  }
};