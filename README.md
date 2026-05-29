# Dreamstream

Dreamstream is an Expo React Native app that turns a spoken dream into a structured interpretation and an AI-generated visual concept. It was built as a personal mobile product, but structured as a portfolio-ready project: native audio recording, multimodal Gemini requests, local dream history, multilingual UI, and EAS internal builds.

## Highlights

- Records dream audio directly from the mobile device
- Sends audio to Gemini for transcription, symbolic interpretation, emotional theme extraction, and visual prompt generation
- Uses a model fallback chain to reduce failures during temporary Gemini overloads
- Generates a dream-inspired image from the visual prompt
- Saves dream history locally with AsyncStorage
- Supports multiple interface/output languages
- Ships with Expo SDK 54 and EAS Build configuration for Android preview APKs

## Tech Stack

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript
- NativeWind / Tailwind CSS
- Gemini API
- Expo AV for recording
- Expo FileSystem for local audio/image handling
- AsyncStorage for local persistence
- EAS Build for installable Android previews

## AI Pipeline

1. The user records a dream through the native microphone flow.
2. The app reads the local audio file as base64 with Expo FileSystem.
3. Gemini analyzes the audio and returns structured JSON:
   - transcription
   - interpretation
   - visual prompt
   - emotional theme
4. The visual prompt is sent to the image model.
5. The final dream card can be saved into local history.

Current text model order:

```text
gemini-3.5-flash
gemini-flash-latest
gemini-2.5-flash
gemini-2.5-flash-lite
```

## Getting Started

### Prerequisites

- Node.js 20.19.x or newer recommended for Expo SDK 54
- npm
- Expo Go for local mobile testing
- A Gemini API key

### Installation

```bash
npm install
```

Create a local `.env` file:

```bash
cp .env.example .env
```

Then add your Gemini API key:

```env
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

Start the app:

```bash
npx expo start -c
```

Scan the QR code with Expo Go.

## Environment Variables

```env
EXPO_PUBLIC_GEMINI_API_KEY=
EXPO_PUBLIC_GEMINI_TEXT_MODEL=gemini-3.5-flash
EXPO_PUBLIC_GEMINI_TEXT_MODEL_FALLBACKS=gemini-flash-latest,gemini-2.5-flash,gemini-2.5-flash-lite
EXPO_PUBLIC_GEMINI_IMAGE_MODEL=imagen-4.0-generate-001
```

Important: `EXPO_PUBLIC_*` variables are bundled into the mobile app. This is acceptable for a private prototype, but a production release should move sensitive API calls behind a backend or proxy.

## Android Preview Build

This project includes an EAS `preview` profile for internal Android testing:

```bash
npx eas-cli@latest build -p android --profile preview
```

The resulting APK can be installed directly on an Android device.

## Project Structure

```text
App.tsx
src/
  components/
    AudioRecorder.tsx
    DreamCalendar.tsx
    DreamResult.tsx
    LanguageSelector.tsx
    LoadingView.tsx
  i18n/
    languages.ts
  services/
    geminiService.ts
    storageService.ts
  types/
    index.ts
assets/
```

## Portfolio Notes

Dreamstream demonstrates:

- mobile-first product design with Expo and React Native
- native device APIs for microphone recording and file handling
- multimodal AI integration with structured output parsing
- defensive API fallback handling
- local-first persistence for user-generated content
- practical release workflow with EAS Build

## Roadmap

- Migrate recording from deprecated `expo-av` to `expo-audio`
- Add duration guidance and recording safeguards for longer dreams
- Move Gemini calls behind a backend for safer public distribution
- Add screenshots and a short demo video
- Polish iOS/TestFlight distribution

## License

This project is currently shared as a portfolio project. Add a license before accepting external contributions or reuse.
