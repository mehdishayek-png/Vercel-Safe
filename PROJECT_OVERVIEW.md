# Midas Platform - Project Overview

## 📌 Project Summary
Midas is a Next.js-based application that serves as an intelligent job search and curation agent. Rather than serving as an automated "auto-apply" bot, it functions as a highly targeted **Search Agent** that accepts user preferences (skills, experience, location, remote preferences) and pulls in matching job listings from multiple data sources. It then uses LLMs (OpenAI / OpenRouter) to semantically score, rank, and filter those jobs, presenting users with a highly curated list of opportunities.

The project recently pivoted from an open local tool to a **SaaS architectural model**, protecting routes with authentication and managing expensive API usage per user.

## 🛠️ Tech Stack & Dependencies
* **Framework:** Next.js 14 (App Router)
* **Frontend:** React 18, Tailwind CSS, Framer Motion (animations), Lucide React (icons)
* **Authentication:** Clerk (`@clerk/nextjs` v6)
* **Caching:** Upstash Redis (`@upstash/redis`)
* **AI/LLM Providers:** OpenAI API, OpenRouter API (Gemini/Claude configurations via route)
* **Job Data Providers:** 
  * SerpAPI (Google Jobs - Primary source for localized roles)
  * JSearch (RapidAPI)
  * Apify (LinkedIn Scraper)
  * RSS Feeds (WeWorkRemotely, RemoteOK, Remotive, Jobicy, SimplyHired)
  * Native Lever API

## 🚀 Core Features & Architecture

### 1. Authentication & API Protection (SaaS Model)
The application wraps its core layouts in `<ClerkProvider>` and utilizes Next.js Middleware (`middleware.js`) to secure the dashboard (`/`). Critical API routes (`/api/match-jobs`, `/api/analyze-job`) enforce `auth()` checks to ensure only signed-in users can trigger expensive LLM inferences and external data fetches.

### 2. Multi-Source Job Intake (`lib/job-fetcher.js`)
The `job-fetcher.js` file orchestrates gathering jobs. It parallelizes fetching from numerous free RSS feeds and handles rate-limited endpoints like the Lever API. It leverages a premium **SerpAPI Production Plan ($150/mo)** unconditionally to ensure reliable, high-volume localized Google Jobs data is pulled on every search.

### 3. Intelligent Job Matching (`lib/matcher.js` & `lib/matcher-enhanced.js`)
The application features a bifurcated matching engine:
* **`matcher.js` (Standard/Local):** A rapid heuristic-based filter that scores jobs locally based on keyword density, title seniority alignment, and location tags without making network calls. It passes the top ~60 candidates to an LLM for final scoring.
* **`matcher-enhanced.js` (Semantic):** A more robust pipeline utilizing `text-embedding-3-small` (OpenAI embeddings) to calculate Cosine Similarity between user resumes/profiles and job descriptions. It weighs semantic similarity, strict skill extraction, and features punitive logic to heavily penalize seniority mismatches (e.g., stopping a 2-year junior from seeing VP roles).

### 4. Semantic Caching Layer (`lib/cache.js`)
To prevent burning through SerpAPI credits and redundant LLM analysis, the platform uses **Upstash Redis**. Queries and job results are cached with uniquely generated footprint keys (based on query, location, and parameters) for up to 24 hours.

## 📂 Key File Structure
* **`app/page.js`**: The main Landing Page containing the Hero hook and authentication gateway.
* **`components/JobDashboard.jsx`**: The core interactive UI where signed-in users configure their search and view matched opportunities. It handles progress loading states and localized API error messages gracefully.
* **`components/Header.jsx`**: The navigation shell housing the Clerk `<UserButton />` and `<SignInButton />`.
* **`app/api/match-jobs/route.js`**: The primary POST endpoint that receives the user's profile, fetches jobs, runs the matching algorithms, and returns curated results.
* **`app/api/analyze-job/route.js`**: A secondary endpoint used for deep-scanning a specific job description against a user's resume/skills to provide detailed application feedback.
* **`.env.local`**: Houses all secrets including Clerk keys, Upstash Redis tokens, OpenRouter/OpenAI keys, and SerpAPI keys.

## ✅ Recent Enhancements (Go-Live Ready)
* Migrated from "Auto-Apply" terminology to "Search Agent" to better set user expectations.
* Added deterministic error UI to prevent silent failures when APIs timeout or return 0 results.
* Updated `@clerk/nextjs` from synchronous to asynchronous `auth()` calls per v6 requirements.
* Unlocked and engaged the new Unthrottled SerpAPI quota logic to aggressively retrieve local jobs.
