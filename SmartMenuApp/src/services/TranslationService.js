import { GOOGLE_TRANSLATE_API_KEY } from '@env';

const TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

/**
 * Translates a given string into the target language.
 * @param {string} text - The text to translate.
 * @param {string} targetLang - Target language code (e.g., 'en', 'th').
 * @returns {Promise<string>} - The translated text.
 */
export const translateText = async (text, targetLang = 'en') => {
  try {
    const response = await fetch(`${TRANSLATE_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        target: targetLang,
        format: 'text',
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('❌ Translation API error:', data.error);
      return 'Translation failed';
    }

    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error('❌ Error during translation:', error);
    return 'Translation failed';
  }
};