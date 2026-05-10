# SmartMenu Backend

Flask API that powers the SmartMenu mobile app. It exposes three services that
together turn a photo of a Thai menu into structured, translated menu items:

1. **Vision** — Google Cloud Vision OCR with OpenCV deskewing and optional
   bounding-box-based line reconstruction.
2. **AI Parsing** — OpenAI (`gpt-3.5-turbo` or `gpt-4`) that converts messy
   OCR text into `[{ name, price }, ...]`. Long menus are processed in chunks.
3. **Translation** — Google Cloud Translate v2, with a batch mode that
   preserves the original Thai name and price for every item.

```
SmartMenuBackend/
├── app.py                          ← Flask entry point + routes
├── app/
│   └── services/
│       ├── vision_service.py       ← deskew, Vision API, bounding-box layout
│       ├── ai_parsing_service.py   ← OpenAI parsing + chunking
│       └── translation_service.py  ← Google Translate (single + batch)
├── tests/                          ← pytest suite (external calls mocked)
├── temp_images/                    ← runtime artefacts (gitignored)
├── requirements.txt
├── Procfile                        ← web: gunicorn app:app
├── runtime.txt                     ← python-3.11.0
└── README.md
```

## Setup

```bash
python -m venv venv
source venv/bin/activate              # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                  # then fill in API keys
```

`requirements.txt` pulls in Flask 2.2, `google-cloud-vision`, OpenCV
(`opencv-python-headless`), `numpy`, `scipy`, `gunicorn` and `python-dotenv`.

### Environment variables

| Variable                   | Required | Description                                |
| -------------------------- | -------- | ------------------------------------------ |
| `GOOGLE_VISION_API_KEY`    | yes      | Google Cloud Vision API key                |
| `OPENAI_API_KEY`           | yes      | OpenAI API key (used for both fast/accurate models) |
| `GOOGLE_TRANSLATE_API_KEY` | yes      | Google Cloud Translation API key           |
| `PORT`                     | no       | Bind port for `python app.py` (default `5001`) |

Variables are loaded by `python-dotenv` at startup, so a local `.env` file is
sufficient for development.

## Running locally

```bash
python app.py
```

Starts a Flask development server on `http://0.0.0.0:5001` with `debug=True`
and CORS enabled for all origins.

For a production-style run:

```bash
gunicorn app:app --bind 0.0.0.0:5001
```

## API reference

All endpoints return JSON. Errors are returned as
`{ "error": "<message>" }` with an appropriate 4xx/5xx status.

### `GET /health`

Liveness probe.

```bash
curl http://localhost:5001/health
# {"status": "ok", "message": "SmartMenu API is running"}
```

### `POST /api/vision/detect`

Detect text in a menu image.

- **Body:** `multipart/form-data`
  - `image` *(file, required)* — the menu photo (`image/jpeg` or `image/png`).
  - `use_bounding_box` *(string, optional, default `true`)* — when `true`, the
    response also includes `bounding_box_text`, where text annotations are
    grouped into lines using a vertical-tolerance heuristic and sorted left to
    right within each line. This produces cleaner input for the parser on
    multi-column menus.
- **Response (200):**
  ```json
  {
    "responses": [{ "textAnnotations": [...], "fullTextAnnotation": {...} }],
    "original_text": "raw concatenated OCR text",
    "bounding_box_text": "line-reconstructed text"
  }
  ```
- **Side effects:** every call clears `temp_images/` and writes
  `original_<ts>.jpg`, `deskewed_<ts>.jpg`, `ocr_original_<ts>.txt` and (when
  enabled) `bounding_box_results_<ts>.txt` for debugging.

```bash
curl -X POST http://localhost:5001/api/vision/detect \
  -F "image=@menu.jpg" \
  -F "use_bounding_box=true"
```

### `POST /api/parse`

Parse OCR text into structured menu items.

- **Body:** `application/json`
  ```json
  {
    "text": "ข้าวผัดหมู 60\nต้มยำกุ้ง 120\n...",
    "useAccurateModel": false
  }
  ```
  - `text` *(required)* — raw OCR text.
  - `useAccurateModel` *(optional, default `false`)* — `true` selects `gpt-4`,
    `false` selects `gpt-3.5-turbo`. The accurate model uses a stricter
    system prompt; both are constrained to return a JSON array.
- **Response (200):**
  ```json
  {
    "result": [
      { "name": "ข้าวผัดหมู", "price": 60 },
      { "name": "ต้มยำกุ้ง",  "price": 120 }
    ]
  }
  ```
- **Long menus:** input over `MAX_CHUNK_LENGTH` (2500 chars) is split at line
  boundaries, parsed chunk-by-chunk, and concatenated.
- **Side effects:** writes `ai_parse_raw_<ts>.txt` to `temp_images/`.

```bash
curl -X POST http://localhost:5001/api/parse \
  -H "Content-Type: application/json" \
  -d '{"text": "ข้าวผัดหมู 60\nต้มยำกุ้ง 120", "useAccurateModel": false}'
```

### `POST /api/translate`

Translate either a plain string or a list of menu items.

- **Body:** `application/json`
  ```json
  { "text": "...", "target_lang": "en" }
  ```
  `target_lang` defaults to `"en"`. `text` accepts:

  1. A **string** — returned translated as a string.
     ```json
     { "translated_text": "Pork fried rice" }
     ```
  2. A **list of menu items** with `name` and `price` — translated in a single
     batch (joined with `|||`) and returned with the original Thai name
     preserved as `thaiName`:
     ```json
     {
       "translated_text": [
         { "name": "Pork fried rice", "thaiName": "ข้าวผัดหมู", "price": 60 },
         { "name": "Tom Yum Goong",   "thaiName": "ต้มยำกุ้ง",  "price": 120 }
       ]
     }
     ```
- **Side effects:** writes `translations_menu_<lang>_<ts>.txt` (list mode) or
  `translation_text_<lang>_<ts>.txt` (string mode) to `temp_images/`.

```bash
curl -X POST http://localhost:5001/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": [{"name":"ข้าวผัดหมู","price":60}], "target_lang": "en"}'
```

## Vision pipeline details

`vision_service.py` does more than just call the Vision API:

1. **Deskew** — converts the image to grayscale, adaptive-thresholds it, and
   sweeps rotation angles from −10° to +10° in 0.5° steps. The angle that
   maximises the variance of the horizontal projection profile is chosen.
   Rotations producing less than a 2 % variance gain are skipped.
2. **OCR** — sends the deskewed bytes to
   `https://vision.googleapis.com/v1/images:annotate` with
   `DOCUMENT_TEXT_DETECTION` and `languageHints: ["th", "en"]`.
3. **Layout reconstruction** *(optional)* — when `use_bounding_box=true`, the
   per-word `textAnnotations` are grouped into lines by `center_y` (8 px
   tolerance), sorted by `x_min` within each line, and concatenated. This
   produces saner line breaks than the default `description` field for menus
   with multiple columns or staggered prices.

## Testing

```bash
pytest
```

The suite (`tests/test_ai_parsing_service.py`, `tests/test_translation_service.py`)
mocks all outbound HTTP and covers:

- Empty / `None` / very long inputs.
- Model selection (`gpt-3.5-turbo` vs `gpt-4`) based on the accurate-model flag.
- Chunking behaviour for menus over `MAX_CHUNK_LENGTH`.
- Batch translation, the `|||` delimiter contract, and Thai-name / price
  preservation.
- API-error and network-exception fallbacks (return strings the app understands).

## Deployment (Railway)

`Procfile` (`web: gunicorn app:app`) and `runtime.txt` (`python-3.11.0`) are
all Railway needs. Configure these service-level environment variables:

- `GOOGLE_VISION_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_TRANSLATE_API_KEY`
- `PORT` is provided by the platform; `app.py` reads it via
  `os.environ.get('PORT', 5001)`.

Railway will rebuild on every push to the connected branch.

## Troubleshooting

- **`No image provided`** — the request must be `multipart/form-data` with the
  field name `image`. JSON bodies are rejected by `/api/vision/detect`.
- **`AI parsing failed`** — usually a missing or invalid `OPENAI_API_KEY`, or
  the model returned non-JSON. Check `temp_images/ai_parse_raw_*.txt` for the
  raw model output.
- **`Translation failed`** — missing `GOOGLE_TRANSLATE_API_KEY`, quota
  exhausted, or unreachable network. Check the Flask log; the service falls
  back to the string `"Translation failed"` so the app can keep going with
  untranslated items.
- **Empty / wrong-language OCR** — try `use_bounding_box=false` and inspect
  `temp_images/deskewed_*.jpg` to verify the deskew step did not over-rotate
  the image.
