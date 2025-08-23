import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

// Get the backend API URL from environment or use a default
const API_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:5001';

/**
 * Detects text in an image using the backend API
 * @param {string} imageUri - The file URI of the image
 * @returns {Promise<Object>} - The API response with detected text
 */
export const detectText = async (imageUri) => {
  try {
    console.log('Sending request to Vision API via backend...');
    console.log('Backend URL:', API_URL);
    
    // Create a FormData object to send the image
    const formData = new FormData();
    
    // Append the image file to FormData
    // Use the file URI directly instead of converting to base64 and creating a Blob
    formData.append('image', {
      uri: imageUri,
      type: imageUri.endsWith('png') ? 'image/png' : 'image/jpeg',
      name: imageUri.split('/').pop() || 'image.jpg',
    });
    
    // Make API request to our backend
    const response = await fetch(`${API_URL}/api/vision/detect`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Parse response
    const result = await response.json();
    
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