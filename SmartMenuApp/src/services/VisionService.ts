import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

// Get the backend API URL from environment or use a default
const API_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:5001';

// Type definitions for Vision API response
interface VisionResponse {
  bounding_box_text?: string;
  responses?: Array<{
    textAnnotations?: Array<{
      description?: string;
    }>;
  }>;
  error?: string;
}

/**
 * Detects text in an image using the backend API
 * @param {string} imageUri - The file URI of the image
 * @param {boolean} useBoundingBox - Whether to use bounding box text processing
 * @returns {Promise<Object>} - The API response with detected text
 */
export const detectText = async (
  imageUri: string, 
  useBoundingBox: boolean = true
): Promise<VisionResponse> => {
  try {
    console.log('Sending request to Vision API via backend...');
    console.log('Backend URL:', API_URL);
    console.log('Using bounding box processing:', useBoundingBox);
    
    // Create a FormData object to send the image
    const formData = new FormData();
    
    // Append the image file to FormData
    // Use the file URI directly instead of converting to base64 and creating a Blob
    formData.append('image', {
      uri: imageUri,
      type: imageUri.endsWith('png') ? 'image/png' : 'image/jpeg',
      name: imageUri.split('/').pop() || 'image.jpg',
    } as any);
    
    // Add bounding box preference as a parameter
    formData.append('use_bounding_box', useBoundingBox ? 'true' : 'false');
    
    // Make API request to our backend
    const response = await fetch(`${API_URL}/api/vision/detect`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Parse response
    const result: VisionResponse = await response.json();
    
    if (result.error) {
      throw new Error(result.error || 'Error detecting text');
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
 * @param {boolean} useBoundingBox - Whether to use bounding box processed text
 * @returns {string} - All detected text as a single string
 */
export const getDetectedText = (
  visionResponse: VisionResponse, 
  useBoundingBox: boolean = true
): string => {
  try {
    // Use bounding box processed text if enabled and available
    if (useBoundingBox && 
        visionResponse?.bounding_box_text && 
        typeof visionResponse.bounding_box_text === 'string' && 
        !visionResponse.bounding_box_text.startsWith("Error") && 
        !visionResponse.bounding_box_text.startsWith("No text")) {
      console.log('Using bounding box processed text:', visionResponse.bounding_box_text);
      return visionResponse.bounding_box_text;
    }
    
    // Use original text when bounding box is disabled or not available
    if (!visionResponse?.responses?.[0]?.textAnnotations?.[0]?.description) {
      return "No text detected";
    }

    // Get the full text from the first annotation which contains all detected text
    const fullText = visionResponse.responses[0].textAnnotations[0].description;
    console.log('Using original extracted text:', fullText);
    
    return fullText;
  } catch (error) {
    console.error('Error getting detected text:', error);
    return "Error extracting text";
  }
}; 