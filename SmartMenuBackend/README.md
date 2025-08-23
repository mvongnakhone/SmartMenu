# SmartMenu Backend

This is the Flask API backend for the SmartMenu application. It provides endpoints for text detection, menu parsing, and translation services.

## Setup

1. Clone the repository
2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Create a `.env` file based on `.env.example` and add your API keys

## Running Locally

```
python app.py
```

The server will start on port 5001 by default.

## API Endpoints

### Health Check
- `GET /health` - Check if the API is running

### Vision Service
- `POST /api/vision/detect` - Detect text in an image
  - Request: Form data with `image` file
  - Response: JSON with detected text

### AI Parsing Service
- `POST /api/parse` - Parse menu text using AI
  - Request: JSON with `text` field
  - Response: JSON with parsed menu items

### Translation Service
- `POST /api/translate` - Translate text
  - Request: JSON with `text` field and optional `target_lang` field (default: 'en')
  - Response: JSON with translated text

## Deployment

This application is configured for deployment on Railway. Simply push to the repository and Railway will automatically deploy the application.

## Environment Variables

- `GOOGLE_VISION_API_KEY` - Google Cloud Vision API key
- `GOOGLE_TRANSLATE_API_KEY` - Google Cloud Translate API key
- `OPENAI_API_KEY` - OpenAI API key
- `PORT` - Port to run the server on (default: 5001) 