import Constants from 'expo-constants';

// Get the backend API URL from environment or use a default
const API_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:5000';

/**
 * Parses OCR text using backend API to structure menu items
 * @param {string} translatedText - The translated OCR text
 * @returns {Promise<string>} - The structured menu data
 */
export const parseMenuWithAI = async (translatedText) => {
  try {
    // Skip if no translated text is available
    if (!translatedText) {
      return 'No text to parse';
    }

    const response = await fetch(`${API_URL}/api/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: translatedText
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('AI parsing API error:', data.error);
      return 'AI parsing failed';
    }
    
    // Return the result directly as JSON
    return data.result;
  } catch (error) {
    console.error('Error during AI parsing:', error);
    return 'AI parsing failed: ' + error.message;
  }
}; 