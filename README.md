# Image BG Remover

AI-powered tool to remove image backgrounds.

## Features

- 🚀 Drag & drop image upload
- 🤖 AI-powered background removal (Remove.bg API)
- 🔍 Side-by-side comparison
- 💾 One-click download
- 📱 Mobile-friendly
- 🔒 Privacy-first: no image storage

## Tech Stack

- **Frontend**: Next.js 15 + Tailwind CSS
- **API**: Next.js API Routes
- **AI**: Remove.bg API

## Getting Started

### 1. Clone and Install

```bash
cd project
npm install
```

### 2. Configure API Key

Get your free API key at [https://www.remove.bg/api](https://www.remove.bg/api):

```bash
# Copy the example env file
cp .env.local.example .env.local

# Edit .env.local and add your API key
REMOVE_BG_API_KEY=your_api_key_here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Deployment

### Vercel (Recommended)

```bash
npm run build
vercel deploy
```

Set environment variable `REMOVE_BG_API_KEY` in Vercel dashboard.

### Cloudflare Pages

1. Build: `npm run build`
2. Output: `.next`
3. Set environment variable `REMOVE_BG_API_KEY`

## License

MIT
