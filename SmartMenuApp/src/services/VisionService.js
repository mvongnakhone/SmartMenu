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

/**
 * Runs layout-aware OCR using the backend PubLayNet pipeline
 * @param {string} imageUri - The file URI of the image
 * @returns {Promise<Object>} - The API response with blocks
 */
export const layoutOcr = async (imageUri) => {
  try {
    console.log('Sending request to Layout OCR via backend...');
    console.log('Backend URL:', API_URL);

    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: imageUri.endsWith('png') ? 'image/png' : 'image/jpeg',
      name: imageUri.split('/').pop() || 'image.jpg',
    });

    const response = await fetch(`${API_URL}/api/vision/layout-ocr`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error || 'Error during layout OCR');
    }
    
    // Debug what we got back
    console.log(`Layout OCR returned ${result.blocks?.length || 0} blocks with model: ${result.model || 'unknown'}`);
    if (result.blocks?.length > 0) {
      result.blocks.forEach((block, i) => {
        console.log(`Block ${i+1} (${block.type}): ${block.text?.slice(0, 50)}${block.text?.length > 50 ? '...' : ''}`);
      });
    } else {
      console.log('No layout blocks returned');
    }
    
    return result;
  } catch (error) {
    console.error('Error in layout OCR:', error);
    throw error;
  }
};

/**
 * Concatenate text from layout blocks in reading order
 * @param {Object} layoutResult - Response from layout-ocr endpoint
 * @returns {string} - Combined text content or "No text detected"
 */
export const getTextFromBlocks = (layoutResult) => {
  try {
    const blocks = layoutResult?.blocks || layoutResult?.result?.blocks || [];
    if (!Array.isArray(blocks) || blocks.length === 0) {
      console.log('No blocks found in layout result');
      return 'No text detected';
    }
    const parts = blocks
      .map((b) => (b?.text || '').trim())
      .filter((t) => t.length > 0);
      
    console.log(`Found ${parts.length} text blocks out of ${blocks.length} total blocks`);
    
    if (parts.length === 0) {
      console.log('No text content in any blocks');
      return 'No text detected';
    }
    
    const combined = parts.join('\n');
    console.log(`Combined text (${combined.length} chars): ${combined.slice(0, 100)}...`);
    return combined;
  } catch (error) {
    console.error('Error extracting text from blocks:', error);
    return 'No text detected';
  }
}; 