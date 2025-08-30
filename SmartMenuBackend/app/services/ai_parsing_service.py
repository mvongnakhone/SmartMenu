import os
import requests
import json
import re

# Use environment variable for API key
API_KEY = os.environ.get('OPENAI_API_KEY')
API_URL = 'https://api.openai.com/v1/chat/completions'

# Constants for chunking
MAX_CHUNK_LENGTH = 2500  # Characters per chunk
MAX_TOKENS = 2000  # Max tokens per response

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
            
        # Check if text is too long and needs chunking
        if len(text) > MAX_CHUNK_LENGTH:
            print(f"Text is {len(text)} characters, exceeding {MAX_CHUNK_LENGTH}. Using chunked processing.")
            return process_large_menu(text)
        
        return process_menu_chunk(text)
    
    except Exception as e:
        print(f"Error during AI parsing: {e}")
        return f'AI parsing failed: {str(e)}'

def process_menu_chunk(chunk_text):
    """
    Process a single chunk of menu text
    
    Args:
        chunk_text (str): The chunk of menu text to process
        
    Returns:
        list: The parsed menu items for this chunk
    """
    try:
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
                        "content": f"Parse this Thai menu text into structured JSON:\n{chunk_text}"
                    }
                ],
                "temperature": 0.3,
                "max_tokens": MAX_TOKENS
            }
        )

        data = response.json()

        if 'error' in data:
            print(f"AI parsing API error: {data.get('error')}")
            return 'AI parsing failed'
        
        # Check if we're hitting token limits
        if 'usage' in data and data['usage'].get('completion_tokens', 0) >= (MAX_TOKENS - 10):
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
        print(f"Error during chunk processing: {e}")
        return []

def process_large_menu(text):
    """
    Process a large menu by splitting it into chunks
    
    Args:
        text (str): The full menu text
        
    Returns:
        list: The combined parsed menu items from all chunks
    """
    # Split text into chunks at appropriate boundaries (end of lines)
    chunks = split_text_into_chunks(text, MAX_CHUNK_LENGTH)
    
    print(f"Split menu into {len(chunks)} chunks")
    
    # Process each chunk
    all_results = []
    for i, chunk in enumerate(chunks):
        print(f"Processing chunk {i+1}/{len(chunks)}")
        chunk_result = process_menu_chunk(chunk)
        
        # Skip failed chunks
        if isinstance(chunk_result, str) and chunk_result.startswith('AI parsing failed'):
            continue
            
        # Add chunk results to overall results
        if isinstance(chunk_result, list):
            all_results.extend(chunk_result)
    
    print(f"Completed processing {len(chunks)} chunks, extracted {len(all_results)} menu items")
    return all_results

def split_text_into_chunks(text, max_length):
    """
    Split text into chunks of approximately max_length characters,
    breaking at sentence or line boundaries when possible
    
    Args:
        text (str): The text to split
        max_length (int): The maximum length for each chunk
        
    Returns:
        list: List of text chunks
    """
    chunks = []
    lines = text.split('\n')
    current_chunk = ""
    
    for line in lines:
        # If adding this line would exceed max_length, start a new chunk
        if len(current_chunk) + len(line) + 1 > max_length and current_chunk:
            chunks.append(current_chunk)
            current_chunk = line
        else:
            # Add line to current chunk with a newline if the chunk isn't empty
            if current_chunk:
                current_chunk += '\n' + line
            else:
                current_chunk = line
    
    # Don't forget the last chunk
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks 