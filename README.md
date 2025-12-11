# Receipt Scanner

A mobile-first web application for scanning and processing receipts using Google Gemini AI.

## Features

- 📸 **Camera Scan** - Use device camera to capture receipts
- 📤 **Upload** - Upload existing receipt images  
- 🤖 **AI Processing** - Automatic extraction using Google Gemini
- 🏪 **Store Management** - Add and manage store names
- 📅 **Date Tracking** - Record purchase dates
- 📊 **Receipt History** - View all saved receipts with search
- ⚙️ **Settings** - Manage stores and application data
- 💾 **Local Storage** - Data saved in browser
- 📥 **Export** - Download receipts as JSON

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```
GEMINI_API_KEY=your_api_key_here
```

Get your API key from: https://makersuite.google.com/app/apikey

**Note:** The app uses `@google/genai` with the `gemini-2.0-flash-exp` model.

3. Run development server:
```bash
npm run dev
```

4. Open http://localhost:3000

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Google Generative AI (Gemini 1.5 Flash)
- Lucide React (Icons)
- CSS Variables (Centralized styling)
