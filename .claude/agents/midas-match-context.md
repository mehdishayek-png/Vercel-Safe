---
name: Midas Match Context
description: Project context and architecture reference for all audit agents. Read this first before running any other agent.
color: "#4f46e5"
emoji: "\U0001F4D6"
vibe: Know the codebase before you judge it.
---

# Midas Match — Project Context

This document provides the architectural context that all audit agents need before evaluating this codebase.

## What This App Is
Midas Match is an AI-powered job matching platform. Users upload a resume (PDF), the app extracts skills via LLM, then scans 8+ job sources and scores each job against the user's profile. Users can save jobs, track applications, generate cover letters, and prep for interviews.

**Live URL**: https://midasmatch.com

## Tech Stack
- **Framework**: Next.js 14+ (App Router, `app/` directory)
- **Styling**: Tailwind CSS with custom brand tokens (`brand-*`, `accent-*`, `surface-*`)
- **Dark Mode**: Class-based (`dark:` prefix), toggled via system preference
- **Auth**: Clerk (`@clerk/nextjs`) — `useUser()`, `SignedIn/SignedOut`, `SignInButton`
- **State**: React Context (`contexts/AppContext.jsx`) — profile, jobs, tokens, filters
- **Payments**: Razorpay (INR pricing, 50 tokens = ₹399)
- **Database**: Upstash Redis (token balances, scan counts, job cache, saved jobs)
- **AI/LLM**: OpenRouter API → Google Gemini 2.5 Flash (primary), Mistral 7B (fallback)
- **PDF Parsing**: `pdf-parse` library
- **Animations**: Framer Motion
- **Deployment**: Vercel

## Key User Flows
1. **Resume Upload**: Upload PDF → `/api/parse-resume` → pdf-parse → LLM extraction → profile object
2. **Job Search**: Profile + preferences → `/api/match-jobs-stream` (SSE) → fetch from 8+ sources → score → stream results
3. **Deep Analysis**: Top 20 jobs → `/api/analyze-job` (batch) → LLM verdict, signals, gaps
4. **Save/Apply**: Toggle save/applied → `/api/saved-jobs` → Redis persistence
5. **Interview Prep**: Select saved job → `/api/interview-prep` → LLM-generated Q&A
6. **Cover Letter**: Job detail page → `/api/cover-letter` → LLM-generated letter
7. **Payment**: Settings → Razorpay checkout → `/api/razorpay/verify` → credit tokens

## Directory Structure
```
app/
  page.js                    # Landing page
  dashboard/
    page.js                  # Main dashboard (upload + results)
    search/page.js           # Search page (profile + filters + results)
    saved/page.js            # Saved jobs
    applications/page.js     # Applied jobs
    job/[id]/page.js         # Job detail page
    prep/page.js             # Interview prep
    settings/page.js         # Account settings + tokens
  api/
    parse-resume/route.js    # PDF upload + LLM extraction
    match-jobs/route.js      # Non-streaming job matching
    match-jobs-stream/route.js # SSE streaming job matching
    analyze-job/route.js     # Deep LLM analysis per job
    saved-jobs/route.js      # Save/unsave jobs (Redis)
    tokens/route.js          # Token balance endpoint
    razorpay/                # Payment order + verify
    cover-letter/route.js    # Cover letter generation
    interview-prep/route.js  # Interview Q&A generation
    search-suggestions/route.js
    cron/scan-jobs/route.js  # Scheduled job scanning
components/
  Header.jsx                 # Top nav bar
  Sidebar.jsx                # Dashboard sidebar
  FilterPanel.jsx            # Job search filters
  MatchResultsGrid.jsx       # Job results grid
  JobCard.jsx                # Individual job card
  JobDashboard.jsx           # Legacy dashboard wrapper
  ResumeStrength.jsx         # Resume readiness indicator
  HowItWorks.jsx             # Landing page steps
  Features.jsx               # Landing page features
  GuideModal.jsx             # First-time user guide
  dashboard/
    CandidatePanel.jsx       # Profile/skills editor
    OnboardingPanel.jsx      # Upload prompt
    ScanControls.jsx         # Search controls + token display
    ActivityLog.jsx          # Scan activity feed
  ui/
    Input.jsx, Button.jsx, Card.jsx, Toast.jsx, Combobox.jsx, CompanyLogo.jsx
lib/
  resume-parser.js           # PDF parsing + LLM profile extraction
  job-fetcher.js             # Multi-source job aggregation
  ats-fetcher.js             # ATS board fetching (Greenhouse, Lever, Ashby)
  panda-matcher.js           # Heuristic scoring engine (10 multipliers)
  skill-normalizer.js        # Skill atomization + deduplication
  tokens.js                  # Token/scan tracking (Redis)
  rate-limit.js              # IP/user rate limiting
  cache.js                   # Redis caching layer
  email.js                   # Transactional email (Resend)
contexts/
  AppContext.jsx             # Global state provider
```

## Dark Mode Tokens
- App background: `dark:bg-[#0f1117]`
- Card background: `dark:bg-[#1a1d27]`
- Hover/surface: `dark:bg-[#22252f]`
- Borders: `dark:border-[#2d3140]`
- Primary text: `dark:text-gray-100`
- Secondary text: `dark:text-gray-400`
- Muted text: `dark:text-gray-500`

## Auth States to Test
- **Signed out**: Can upload resume + 3 free scans/day (IP-tracked)
- **Signed in (free)**: 5 free scans/day, 1 free Midas Search/week, 5 free deep scans
- **Signed in (tokens)**: 1 token per scan, 2 tokens per Midas Search
- **Admin**: Unlimited everything (checked via ADMIN_USER_IDS env var)

## Known Issues / Areas of Concern
- PDF parser can fail on scanned/image-based PDFs (no OCR)
- Some job sources return empty descriptions (data pipeline issue)
- Location detection relies on country-state-city library matching
- Job data is stored in localStorage for detail pages (can be lost)
- No automated test suite exists yet

## Support Email
midasmatchsupport@gmail.com
