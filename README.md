# Receipt Scanner

A mobile-first web application for scanning receipts and building per-item price history. Upload or photograph a receipt; an AI provider (OpenAI or Google Gemini) extracts structured line-item data; the app stores a receipt history and derives an item catalog and price-insights view so you can see, per item, where it was cheapest and how prices trend over time.

Built for community kitchens and budget-conscious volunteer organizations. Single-tenant, no login.

## Features

- **Camera scan** — capture receipts with the device camera
- **Upload** — process existing receipt images or PDFs
- **AI extraction** — automatic line-item extraction via OpenAI or Google Gemini (switchable in Settings)
- **Store & unit management** — maintain canonical store names and units
- **Receipt history** — search, sort, filter, edit, delete, and export saved receipts
- **Items catalog** — unique items derived from receipts, with per-item price history
- **Insights** — per-item price stats and a price-trend chart (cheapest store, average, % change)
- **Export** — download receipts as JSON

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file with a key for each AI provider you want to use:
```
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

- OpenAI key: https://platform.openai.com/api-keys
- Gemini key: https://makersuite.google.com/app/apikey

You only need a key for the provider(s) you plan to use. The active provider is
selected in **Settings → AI Provider** and **defaults to OpenAI**.

**Models:** OpenAI uses the `openai` SDK (Responses API) with `gpt-4o`; Gemini uses
`@google/genai` with `gemini-2.0-flash-exp`.

3. Run the development server:
```bash
npm run dev
```

4. Open http://localhost:3000

## Data & persistence

Data is **not** stored in the browser. All persistence is **server-side JSON files
under `data/`** via Node `fs` — there is no database. See `DEVELOPER_GUIDE.md §13`
and `CONTEXT.md` for details. Never commit real/private receipt data or API keys.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript (strict)
- OpenAI (`gpt-4o`) and Google Gemini (`gemini-2.0-flash-exp`) for extraction
- Recharts (charts)
- Lucide React (icons)
- Tailwind CSS 4 + CSS variables (centralized styling)

## Documentation

- `DEVELOPER_GUIDE.md` — structure & engineering conventions
- `CONTEXT.md` — what the app is and how it works (source of truth)
- `DESIGN_GUIDE.md` — visual language and UI patterns
- `docs/PRD.md` — product requirements
