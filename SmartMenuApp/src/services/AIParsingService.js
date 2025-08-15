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

/**
 * Parses text with position information directly using ChatGPT
 * @param {Object} textData - Object containing fullText and textElements with positions
 * @returns {Promise<string>} - The structured menu data
 */
export const parseWithChatGPT = async (textData) => {
  try {
    if (!textData || !textData.fullText) {
      return 'No text to parse';
    }

    // Create a simple JSON representation of the text elements with their positions
    const simplifiedData = {
      fullText: textData.fullText,
      elements: textData.textElements.map(el => ({
        text: el.text,
        x: Math.round(el.center.x),
        y: Math.round(el.center.y)
      }))
    };

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
            content: `You are a helpful assistant that parses Thai restaurant menu OCR text. 
            Extract dish names, prices, and descriptions into a clean, structured format. 
            Group items by categories if possible.
            
            Pay special attention to:
            1. Thai dishes with multiple options (e.g., pork/chicken variants)
            2. Special pricing indicators like "ตามน้ำหนัก" (by weight)
            3. Dishes that might be missing prices
            4. Common Thai menu categories like appetizers, soups, curries, stir-fries, etc.
            
            The text is provided with position information (x,y coordinates) to help you understand the menu layout.
            Use this position data to correctly associate menu items with their prices.
            Items with similar y-coordinates are likely on the same line.
            Prices typically appear to the right of menu items (higher x-coordinate).`
          },
          {
            role: "user",
            content: `I have OCR text from a Thai menu with position information. Please parse this into a structured menu format.\n\n${JSON.stringify(simplifiedData, null, 2)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('AI parsing API error:', data.error);
      return 'AI parsing failed';
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error during position-aware AI parsing:', error);
    return 'AI parsing failed: ' + error.message;
  }
}; 