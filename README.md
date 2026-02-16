# JobBot AI — Premium Vercel Edition

An autonomous AI agent that finds jobs, tailors resumes, and applies for you. Rebuilt with a premium "Cosmic Night" UI and secure server-side architecture.

## 🚀 Features

- **AI-Native UI**: Glassmorphism, 3D glows, and Framer Motion animations.
- **Autonomous Agent**: Scans 50+ job boards (RSS, LinkedIn, google jobs via SerpAPI).
- **Resume Optimizer**: Tailors your keywords for each specific role.
- **Secure Backend**: API keys are stored in server environment variables, not the browser.
- **One-Click Apply**: Streamlined workflow for mass application.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Framer Motion
- **AI Models**: Google Gemini 2.5 Flash (via OpenRouter)
- **Deployment**: Vercel Serverless

## 📦 Setup & Deployment

### 1. Prerequisites
You need API keys for:
- [OpenRouter](https://openrouter.ai) (Required for AI)
- [SerpAPI](https://serpapi.com) (Optional, for Google Jobs)
- [RapidAPI JSearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) (Optional, for more jobs)

### 2. Install & Run Locally
```bash
git clone https://github.com/YOUR_USERNAME/jobbot-vercel.git
cd jobbot-vercel
npm install

# Create .env.local with your keys
echo "OPENROUTER_KEY=sk-..." > .env.local

npm run dev
```

### 3. Deploy to Vercel
1. Push this repo to GitHub.
2. Import project in Vercel.
3. **IMPORTANT**: Set **Root Directory** to `./` (or leave empty).
4. Add your **Environment Variables** in Vercel settings:
   - `OPENROUTER_KEY`
   - `SERPAPI_KEY`
   - `JSEARCH_KEY`
5. Deploy!

## 📄 License
MIT
