# SmartMenu

SmartMenu is a mobile app that helps foreign tourists in Thailand read and
understand local restaurant menus. The user takes a photo of a Thai menu and the
app returns a structured, translated menu with prices in their preferred
currency, plus descriptions, regions and reference images for each dish where
available.

The system has two parts:

- **`SmartMenuApp/`** — Expo / React Native client (iOS, Android, Web).
- **`SmartMenuBackend/`** — Flask API that wraps Google Cloud Vision, OpenAI
  and Google Cloud Translate.

## Pipeline

```
 Photo (camera or gallery)
        │
        ▼
 [App] crop + rotate (expo-image-manipulator)
        │  multipart/form-data
        ▼
 [Backend] /api/vision/detect
   • OpenCV deskew (projection profile)
   • Google Cloud Vision DOCUMENT_TEXT_DETECTION
   • Bounding-box line reconstruction (optional)
        │  raw OCR text
        ▼
 [Backend] /api/parse
   • OpenAI (gpt-3.5-turbo or gpt-4)
   • Chunking for long menus
   • Returns [{ name, price }, ...]
        │  parsed Thai items
        ▼
 [Backend] /api/translate
   • Google Cloud Translate v2
   • Batch translate via "|||" delimiter
   • Returns [{ name, thaiName, price }, ...]
        │
        ▼
 [App] MenuMatchService
   • Fuzzy match against three local datasets
     (kaggle, expectedparse, wiki)
   • Adds description, region, category, image
        │
        ▼
 [App] ResultsScreen
   • Currency conversion
   • Matched vs. unmatched item lists
```

## Features

- Camera capture and gallery import with manual crop and rotation.
- OCR with optional bounding-box-based line reconstruction for skewed or
  multi-column menus.
- AI parsing toggle — `FAST` (gpt-3.5-turbo) or `ACCURATE` (gpt-4).
- Thai → English translation that preserves the original Thai name and price
  on every item.
- Local enrichment from three bundled dish datasets (Kaggle, expected-parse,
  Wikipedia).
- Currency selector: THB, USD, GBP, EUR, JPY, CNY.
- A `MenuAccuracyTest` screen and Jest suite for measuring end-to-end parsing
  accuracy against reference menus.

## Repository layout

```
SmartMenu/
├── README.md                  ← you are here
├── SmartMenuApp/              ← Expo / React Native client
│   ├── App.js                 ← navigation root + context providers
│   ├── app.json               ← Expo config (incl. extra.backendUrl)
│   ├── src/
│   │   ├── screens/           ← Home, Results, VisionTest
│   │   ├── components/        ← Header, toggles
│   │   ├── context/           ← Currency, BoundingBox, AIModel providers
│   │   ├── services/          ← Vision / AIParsing / Translation / MenuMatch
│   │   ├── dataset/           ← kaggle / expectedparse / wiki dish data
│   │   └── tests/             ← MenuAccuracyTest + Jest specs
│   └── README.md
└── SmartMenuBackend/          ← Flask API
    ├── app.py                 ← routes + bootstrap
    ├── app/services/          ← vision / ai_parsing / translation
    ├── tests/                 ← pytest suite
    ├── requirements.txt
    ├── Procfile               ← gunicorn app:app
    └── README.md
```

## Quick start

### 1. Backend

```bash
cd SmartMenuBackend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # then fill in API keys
python app.py                     # serves on http://0.0.0.0:5001
```

See [`SmartMenuBackend/README.md`](SmartMenuBackend/README.md) for the full API
reference and deployment notes.

### 2. App

```bash
cd SmartMenuApp
npm install
# Point the app at your backend (LAN IP for a real device, localhost for web/sim)
# Edit SmartMenuApp/app.json → expo.extra.backendUrl
npx expo start
```

See [`SmartMenuApp/README.md`](SmartMenuApp/README.md) for device-specific
setup, available scripts, and the accuracy test harness.

## Required API keys

The backend talks to three external services. All three keys are read from
environment variables at startup:

| Variable                      | Used by                  | Where to get it                                      |
| ----------------------------- | ------------------------ | ---------------------------------------------------- |
| `GOOGLE_VISION_API_KEY`       | `/api/vision/detect`     | Google Cloud Console → Vision API                    |
| `OPENAI_API_KEY`              | `/api/parse`             | https://platform.openai.com/api-keys                 |
| `GOOGLE_TRANSLATE_API_KEY`    | `/api/translate`         | Google Cloud Console → Cloud Translation API         |
| `PORT` *(optional)*           | Flask bind port          | Defaults to `5001`                                   |

## Testing

Backend (pytest, mocks all external HTTP calls):

```bash
cd SmartMenuBackend
pytest
```

App (Jest via `jest-expo`):

```bash
cd SmartMenuApp
npm test
```

The Jest suite includes `MenuAccuracyTest.test.js`, which scores parsed output
against curated `expected_parse/ThaiMenu*.json` references using string
similarity for names and exact match for prices.

## Deployment

The backend is configured for [Railway](https://railway.app) via `Procfile`
(`web: gunicorn app:app`) and `runtime.txt` (`python-3.11.0`). Push to the
connected repo and Railway will build and deploy. Set the three API keys as
service environment variables.

The app is built with Expo and can be distributed via EAS Build for iOS/Android
or served as a static web build with `expo start --web`.

## License

This project was developed during a 2025 internship at KMUTT. No license has
been declared yet — treat it as all rights reserved until one is added.
