# SmartMenu App

Expo / React Native client for SmartMenu. Captures or imports a photo of a
Thai menu, sends it through the SmartMenu backend pipeline (OCR → AI parsing →
translation), enriches each item against three local dish datasets, and
displays the result with currency conversion.

## Requirements

- Node.js 18 or newer.
- Expo SDK 53 (`expo` ~`53.0.20`, React Native `0.79`, React 19).
- A running [SmartMenuBackend](../SmartMenuBackend/README.md) instance,
  reachable from the device or simulator.
- For native builds: Xcode (iOS) and/or Android Studio.

## Setup

```bash
npm install
```

### Point the app at the backend

The backend URL is read from `app.json` → `expo.extra.backendUrl`:

```json
{
  "expo": {
    "extra": {
      "backendUrl": "http://192.168.1.10:5001"
    }
  }
}
```

Pick the right host:

- **iOS simulator / web:** `http://localhost:5001`.
- **Android emulator:** `http://10.0.2.2:5001`.
- **Physical device:** the LAN IP of the machine running the backend
  (e.g. `http://192.168.1.10:5001`). The device and the backend must be on the
  same network.
- **Hosted backend:** the public URL (e.g. `https://smartmenu.up.railway.app`).

The value flows through `Constants.expoConfig?.extra?.backendUrl` in each
service file; if it is missing the services fall back to `http://localhost:5001`
(VisionService) or `http://localhost:5000` (other services).

## Run

```bash
npm run start         # Expo dev server with QR code
npm run ios           # build + run iOS native shell
npm run android       # build + run Android native shell
npm run web           # serve the web build
```

The app requests camera and media-library permissions on first use.

## App structure

```
SmartMenuApp/
├── App.js                       ← Stack navigator + context providers
├── app.json                     ← Expo config (incl. extra.backendUrl)
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js        ← camera, gallery, crop + rotate UI
│   │   ├── ResultsScreen.js     ← processing pipeline + result list
│   │   └── VisionTestScreen.js  ← raw OCR debugging screen
│   ├── components/
│   │   ├── Header.js            ← app bar + currency selector + side menu
│   │   ├── AIModelToggle.js     ← FAST (gpt-3.5) vs ACCURATE (gpt-4)
│   │   └── BoundingBoxToggle.js ← toggle bounding-box OCR layout
│   ├── context/
│   │   ├── CurrencyContext.js   ← currency, exchange rates, symbols
│   │   ├── BoundingBoxContext.js
│   │   └── AIModelContext.js
│   ├── services/
│   │   ├── VisionService.ts     ← POST /api/vision/detect
│   │   ├── AIParsingService.ts  ← POST /api/parse
│   │   ├── TranslationService.ts← POST /api/translate
│   │   └── MenuMatchService.ts  ← local fuzzy match + enrichment
│   ├── dataset/                 ← bundled dish data (json + csv)
│   │   ├── kaggle_dishes.json
│   │   ├── expectedparse_dataset.json
│   │   └── wiki_dishes.json
│   └── tests/
│       ├── MenuAccuracyTest.js          ← in-app accuracy harness
│       ├── MenuAccuracyTest.test.js     ← Jest spec for the comparator
│       ├── ManualVisionTest.js
│       └── expected_parse/              ← reference menus (ThaiMenu1..4.json)
└── assets/                      ← icons, splash, placeholder, test menus
```

## Processing pipeline (in `ResultsScreen`)

`ResultsScreen` walks through five states (`STEPS.IDLE` → `OCR` → `PARSING` →
`TRANSLATION` → `ENRICHMENT` → `COMPLETE`/`ERROR`). For each photo it:

1. Calls `detectText(photoUri, useBoundingBox)` and extracts text via
   `getDetectedText`.
2. Calls `parseMenuWithAI(text, useAccurateModel)` and JSON-parses the result.
3. Calls `translateText(parsedItems, 'en')` to produce
   `[{ name, thaiName, price }]`. Translation failures fall back to the
   untranslated items rather than aborting the screen.
4. Calls `matchAndEnrichMenuItems(items)` to attach `description`, `region`,
   `category`, `imageUrl`, `matchSource`, and `matchConfidence` from the local
   datasets (kaggle → expectedparse → wiki, first match above 0.8 similarity
   wins).
5. Splits the results into matched and unmatched lists for display.

Currency conversion is applied at render time using the rates in
`CurrencyContext` (`THB` is the base; `USD`, `GBP`, `EUR`, `JPY`, `CNY` are
derived).

## User-facing toggles

Available from the side menu (hamburger icon in `Header`):

- **AI Model** — `FAST` (gpt-3.5-turbo) by default, `ACCURATE` (gpt-4) for
  better parsing on noisy menus at the cost of latency.
- **Bounding Box** — when enabled, the backend reconstructs lines from the
  Vision response's per-word bounding boxes. Helpful for multi-column menus.
- **Currency** — global selector in the header.

## Testing

```bash
npm test
```

Uses `jest-expo`. The main spec is `src/tests/MenuAccuracyTest.test.js`, which
exercises:

- `compareMenuItems(parsed, expected)` — name + price scoring with a 0.85
  string-similarity threshold for fuzzy name matches, including JSON-string
  inputs and partial-match counts.
- `loadExpectedMenuItems(name)` — loading the curated `expected_parse/*.json`
  reference menus.

The corresponding in-app screen (`MenuAccuracyTest`) runs the full pipeline on
each `assets/test_menus/ThaiMenu*.jpg` image, compares against the reference
JSON, and reports per-menu and aggregate scores along with a runtime timer.

## Building

For App Store / Play Store distribution use [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npx eas build --platform ios
npx eas build --platform android
```

Bundle identifiers are already configured in `app.json`
(`com.movongna.SmartMenuApp`).

## Troubleshooting

- **`Network request failed`** — `expo.extra.backendUrl` is wrong, or the
  device cannot reach the backend host. Verify with
  `curl <backendUrl>/health` from the same network.
- **`No text was detected in the image`** — the Vision step returned nothing.
  Try a sharper photo or toggle the bounding-box setting off to check the raw
  OCR output via the *Vision API Test* screen.
- **`Failed to parse menu items` / `Failed to parse menu JSON`** — the model
  returned non-JSON. The backend already strips common markdown fences; if it
  persists, switch to the accurate model from the side menu.
- **Camera permission loop on iOS simulator** — the simulator does not have a
  camera. Use the gallery button or test on a real device.
