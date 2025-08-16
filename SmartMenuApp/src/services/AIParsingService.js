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
            content: `You are parsing a Thai restaurant menu into structured JSON.

Format the output as:
[
  {"name": "ชื่อเมนู", "price": 120},
  ...
]

Parsing Rules:

1. Each item must be a separate JSON object with:
   - "name": exact Thai menu item name from the text
   - "price": integer (no quotes, no decimals). If not listed, use 0.

2. If one menu line contains multiple dishes **with different prices**, split them into separate entries. For example:
   - "ไข่เจียว/ไข่เจียวหมูสับ 75/85" becomes:
     - {"name": "ไข่เจียว", "price": 75}
     - {"name": "ไข่เจียวหมูสับ", "price": 85}

3. If one line contains multiple dishes **with the same price**, do not split them. For example:
   - "กะเพราหมูสับ/ไก่สับ 95" becomes:
     - {"name": "กะเพราหมูสับ/ไก่สับ", "price": 95}

4. Do not translate anything to English.

5. Do not add extra text — only output the JSON array.

6. 

7. Do not combine or skip any menu items.

8. If price is missing, use 0.`
          },
          {
            role: "user",
            content: `Parse this Thai menu text into structured JSON:\n${translatedText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('AI parsing API error:', data.error);
      return 'AI parsing failed';
    }
    
    // Check if we're hitting token limits
    if (data.usage && data.usage.completion_tokens >= 1990) {
      console.log('⚠️ TOKEN LIMIT REACHED: The AI response was cut off due to token limitations.');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error during AI parsing:', error);
    return 'AI parsing failed: ' + error.message;
  }
}; 