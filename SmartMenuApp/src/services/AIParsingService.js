import { OPENAI_API_KEY } from '@env';

// Use environment variable for API key
const API_KEY = OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Parses OCR text using OpenAI's API to structure menu items
 * @param {string} translatedText - The translated OCR text
 * @returns {Promise<string>} - The structured menu data
 */
export const parseMenuWithAI = async (translatedText) => {
  try {
    // Skip if no translated text is available
    if (!translatedText) {
      return 'No text to parse';
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that parses restaurant menu OCR text. Extract dish names, prices, and descriptions into a clean, structured format. Group items by categories if possible."
          },
          {
            role: "user",
            content: `I have OCR text from a menu translated to English. Please parse this into a structured menu format.\n\nTranslated Text (English):\n${translatedText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('AI parsing API error:', data.error);
      return 'AI parsing failed';
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error during AI parsing:', error);
    return 'AI parsing failed: ' + error.message;
  }
}; 