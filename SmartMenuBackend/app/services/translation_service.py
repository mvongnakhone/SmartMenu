import os
import requests
import json

# Use environment variable for API key
API_KEY = os.environ.get('GOOGLE_TRANSLATE_API_KEY')
API_URL = f"https://translation.googleapis.com/language/translate/v2?key={API_KEY}"

def translate_text(text, target_lang='en'):
    """
    Translates a given string into the target language.
    
    Args:
        text (str or list): The text to translate, or a list of menu items with 'name' fields to translate.
        target_lang (str): Target language code (e.g., 'en', 'th').
        
    Returns:
        str or list: The translated text or list of translated menu items.
    """
    try:
        # Check if input is a list of menu items
        if isinstance(text, list) and all(isinstance(item, dict) and 'name' in item for item in text):
            # Extract all menu item names for batch translation
            menu_names = [item['name'] for item in text]
            
            # Join all names with a special delimiter for batch translation
            batch_text = "|||".join(menu_names)
            
            # Translate the batch
            response = requests.post(
                API_URL,
                headers={
                    'Content-Type': 'application/json',
                },
                json={
                    'q': batch_text,
                    'target': target_lang,
                    'format': 'text',
                }
            )
            
            data = response.json()
            
            if 'error' in data:
                print(f"Translation API error: {data.get('error')}")
                return 'Translation failed'
            
            # Split the translated text back into individual items
            translated_names = data['data']['translations'][0]['translatedText'].split('|||')
            
            # Create a new list with both original Thai names and translated names
            translated_menu = []
            for i, item in enumerate(text):
                if i < len(translated_names):
                    translated_menu.append({
                        "name": translated_names[i],
                        "thaiName": item['name'],
                        "price": item['price']
                    })
            
            return translated_menu
        else:
            # Handle regular text translation
            text_to_translate = text
            if isinstance(text, (dict, list)):
                text_to_translate = json.dumps(text)
                
            response = requests.post(
                API_URL,
                headers={
                    'Content-Type': 'application/json',
                },
                json={
                    'q': text_to_translate,
                    'target': target_lang,
                    'format': 'text',
                }
            )
            
            data = response.json()
            
            if 'error' in data:
                print(f"Translation API error: {data.get('error')}")
                return 'Translation failed'
            
            return data['data']['translations'][0]['translatedText']
    except Exception as e:
        print(f"Error during translation: {e}")
        return 'Translation failed' 