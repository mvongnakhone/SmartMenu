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

def parse_menu_with_ai(text, use_accurate_model=False):
    """
    Parses OCR text using OpenAI's API to structure menu items
    
    Args:
        text (str): The OCR text to parse
        use_accurate_model (bool): Whether to use the more accurate but slower model
        
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
            return process_large_menu(text, use_accurate_model)
        
        return process_menu_chunk(text, use_accurate_model)
    
    except Exception as e:
        print(f"Error during AI parsing: {e}")
        return f'AI parsing failed: {str(e)}'

def preprocess_menu_text(text):
    """
    Preprocesses the menu text to improve parsing accuracy
    
    Args:
        text (str): Raw OCR text from vision service
        
    Returns:
        str: Preprocessed text ready for AI parsing
    """
    # Remove extra spaces but preserve line breaks
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # Skip empty lines
        if not line.strip():
            continue
            
        # Clean up extra spaces
        cleaned_line = re.sub(r'\s+', ' ', line).strip()
        
        # Skip lines that are too short (likely noise)
        if len(cleaned_line) < 3:
            continue
            
        cleaned_lines.append(cleaned_line)
    
    # Join back with newlines
    return '\n'.join(cleaned_lines)

def process_menu_chunk(chunk_text, use_accurate_model=False):
    """
    Process a single chunk of menu text
    
    Args:
        chunk_text (str): The chunk of menu text to process
        use_accurate_model (bool): Whether to use the more accurate but slower model
        
    Returns:
        list: The parsed menu items for this chunk
    """
    try:
        # Preprocess text to improve parsing accuracy
        preprocessed_text = preprocess_menu_text(chunk_text)
        
        # Choose model based on user preference
        model = "gpt-4" if use_accurate_model else "gpt-3.5-turbo"
        print(f"Using model: {model}")
        
        # Choose system prompt based on model
        if use_accurate_model:
            system_prompt = """
            Parse this messy Thai menu text (from OCR) into structured JSON. This is a critical task requiring high accuracy.

            [
            {"name": "ชื่อเมนู", "price": 120},
            ...
            ]

            Rules:
                1. Each item = one JSON object with:
                   - name: exact Thai text of the dish name
                   - price: integer only (no quotes, no decimals). Use 0 if missing.

                2. Slashes or Commas:
                   - Same price (e.g. "กะเพราหมูสับ/ไก่สับ 95") → ONE item.
                   - Different prices (e.g. "ไข่เจียว/ไข่เจียวหมูสับ 75/85") → split into TWO items.

                3. Do NOT translate or add extra text.

                4. Do NOT skip items.

                5. OCR may be messy; apply sophisticated understanding to:
                   - Correctly match dish names with their prices
                   - Understand multi-line dish entries
                   - Handle formatting inconsistencies
                   - Recognize dish categories/sections

                6. If multiple dishes are on one line, split them accurately.
                
                7. Be especially precise with numerals, pricing formats, and dish boundaries.

                Output ONLY the JSON array with no extra text. Format must be a valid parseable JSON array.
            """
        else:
            system_prompt = """
            Parse this messy Thai menu text (from OCR) into structured JSON:

            [
            {"name": "ชื่อเมนู", "price": 120},
            ...
            ]

            Rules:
                1. Each item = one JSON object with:
                   - name: exact Thai text
                   - price: integer only (no quotes, no decimals). Use 0 if missing.

                2. Slashes or Commas:
                   - Same price (e.g. "กะเพราหมูสับ/ไก่สับ 95") → ONE item.
                   - Different prices (e.g. "ไข่เจียว/ไข่เจียวหมูสับ 75/85") → split into TWO items.

                3. Do NOT translate or add extra text.

                4. Do NOT skip items.

                5. OCR may be messy; extract best-effort matches.

                6. If multiple dishes are on one line, split them.

                Output ONLY the JSON array.
            """
            
        response = requests.post(
            API_URL,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {API_KEY}'
            },
            json={
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": f"Parse this Thai menu text into structured JSON:\n{preprocessed_text}"
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
        print(f"Raw AI response: {result}")
        
        # Clean up potential JSON formatting issues
        # Sometimes GPT-4 returns JSON with leading/trailing text
        result_cleaned = result.strip()
        
        # Find the first '[' and last ']' to extract just the JSON array
        start_idx = result_cleaned.find('[')
        end_idx = result_cleaned.rfind(']')
        
        if start_idx >= 0 and end_idx > start_idx:
            result_cleaned = result_cleaned[start_idx:end_idx + 1]
            print(f"Cleaned JSON: {result_cleaned}")
        
        try:
            parsed_json = json.loads(result_cleaned)
            
            # Format the JSON for logging - each object on a single line
            formatted_json_for_logs = "[\n"
            for item in parsed_json:
                formatted_json_for_logs += f"  {json.dumps(item, ensure_ascii=False)},\n"
            formatted_json_for_logs = formatted_json_for_logs.rstrip(",\n") + "\n]"
            
            print(f"Formatted JSON for logs: {formatted_json_for_logs}")
            
            # Return the parsed JSON directly without additional formatting
            return parsed_json
            
        except json.JSONDecodeError as json_err:
            print(f"JSON parse error: {json_err}")
            print(f"Failed to parse: {result_cleaned}")
            # Try a more lenient approach if the first attempt failed
            try:
                # Sometimes models include markdown formatting - try to clean it up
                if result_cleaned.startswith("```json"):
                    clean_json = result_cleaned.replace("```json", "").replace("```", "").strip()
                    parsed_json = json.loads(clean_json)
                    return parsed_json
                return []
            except:
                print("Secondary JSON parsing also failed")
                return []
    
    except Exception as e:
        print(f"Error during chunk processing: {e}")
        import traceback
        traceback.print_exc()
        return []

def process_large_menu(text, use_accurate_model=False):
    """
    Process a large menu by splitting it into chunks
    
    Args:
        text (str): The full menu text
        use_accurate_model (bool): Whether to use the more accurate but slower model
        
    Returns:
        list: The combined parsed menu items from all chunks
    """
    # Preprocess text first
    preprocessed_text = preprocess_menu_text(text)
    
    # Split text into chunks at appropriate boundaries (end of lines)
    chunks = split_text_into_chunks(preprocessed_text, MAX_CHUNK_LENGTH)
    
    print(f"Split menu into {len(chunks)} chunks")
    
    # Process each chunk
    all_results = []
    for i, chunk in enumerate(chunks):
        print(f"Processing chunk {i+1}/{len(chunks)}")
        chunk_result = process_menu_chunk(chunk, use_accurate_model)
        
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