// services/TranslationService.js
import Constants from 'expo-constants';

// Get the backend API URL from environment or use a default
const API_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:5000';

/**
 * Translates a given string or menu items into the target language.
 * @param {string|Array} text - The text to translate or array of menu items.
 * @param {string} targetLang - Target language code (e.g., 'en', 'th').
 * @returns {Promise<string|Array>} - The translated text or menu items.
 */
export const translateText = async (text, targetLang = 'en') => {
  try {
    // Ensure text is properly formatted for the request
    const textToTranslate = text;
    
    const response = await fetch(`${API_URL}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: textToTranslate,
        target_lang: targetLang,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Translation API error:', data.error);
      return 'Translation failed';
    }

    return data.translated_text;
  } catch (error) {
    console.error('Error during translation:', error);
    return 'Translation failed';
  }
};
