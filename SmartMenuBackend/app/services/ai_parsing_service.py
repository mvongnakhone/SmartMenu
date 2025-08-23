import os
import requests
import json

# Use environment variable for API key
API_KEY = os.environ.get('OPENAI_API_KEY')
API_URL = 'https://api.openai.com/v1/chat/completions'

def parse_menu_with_ai(text):
    """
    Parses OCR text using OpenAI's API to structure menu items
    
    Args:
        text (str): The OCR text to parse
        
    Returns:
        list: The structured menu data as a list of dictionaries
    """
    try:
        # Skip if no text is available
        if not text:
            return 'No text to parse'

        response = requests.post(
            API_URL,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {API_KEY}'
            },
            json={
                "model": "gpt-3.5-turbo",
                "messages": [
                    {
                        "role": "system",
                        "content": """You are parsing a Thai restaurant menu into structured JSON.

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

                        6. Do not combine or skip any menu items.

                        7. If price is missing, use 0."""
                    },
                    {
                        "role": "user",
                        "content": f"Parse this Thai menu text into structured JSON:\n{text}"
                    }
                ],
                "temperature": 0.3,
                "max_tokens": 2000
            }
        )

        data = response.json()

        if 'error' in data:
            print(f"AI parsing API error: {data.get('error')}")
            return 'AI parsing failed'
        
        # Check if we're hitting token limits
        if 'usage' in data and data['usage'].get('completion_tokens', 0) >= 1990:
            print('TOKEN LIMIT REACHED: The AI response was cut off due to token limitations.')

        # Parse the response to ensure it's valid JSON
        result = data['choices'][0]['message']['content']
        parsed_json = json.loads(result)
        
        # Format the JSON for logging - each object on a single line
        formatted_json_for_logs = "[\n"
        for item in parsed_json:
            formatted_json_for_logs += f"  {json.dumps(item, ensure_ascii=False)},\n"
        formatted_json_for_logs = formatted_json_for_logs.rstrip(",\n") + "\n]"
        
        print(f"Formatted JSON for logs: {formatted_json_for_logs}")
        
        # Return the parsed JSON directly without additional formatting
        return parsed_json
    except Exception as e:
        print(f"Error during AI parsing: {e}")
        return f'AI parsing failed: {str(e)}' 