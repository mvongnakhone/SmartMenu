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
            content: `You are a specialized parser for restaurant menu OCR text. Your sole task is to extract every single dish with its associated price.

          IMPORTANT RULES:
          1. ONLY output dishes that have both a name and a price
          2. IGNORE all headers, footers, categories, and decorative text
          3. DO NOT group items by categories
          4. DO NOT include any text that isn't a dish name or price
          5. Use position data to correctly match dishes with their prices
          6. For dishes with multiple variants (e.g. different sizes/proteins), list each as a separate item
          
          OUTPUT FORMAT:
          Return a JSON array with objects containing:
          - name: The dish name (required)
          - price: The price as a number (required)
          - currency: Currency symbol if present (optional)
          
          Example output:
          [
            {"name": "Pad Thai", "price": 12.95, "currency": "$"},
            {"name": "Green Curry with Chicken", "price": 14.95, "currency": "$"}
          ]
          
          The text is provided with position information (x,y coordinates) to help you understand the menu layout.
          Use this position data to correctly associate menu items with their prices.`
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