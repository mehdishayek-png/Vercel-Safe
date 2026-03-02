# 🌌 JobBot AI - Master Project Documentation

Welcome to the central intelligence hub for **JobBot AI Vercel Edition**. This document breaks down the entire project architecture, the core matching logic, Go-Live critical operations, and the specialized AI agents (workflows) driving continuous development and stability.

---

## 📅 1. Project Overview & Architecture

JobBot AI is a Next.js-based application that serves as an autonomous, intelligent job search and curation agent. It has transitioned from a local script to a fully-fledged **SaaS (Software as a Service) platform** hosted on Vercel.

Rather than being a simple "auto-apply" bot, it functions as a highly targeted **Search Agent**. It accepts user preferences (skills, domain, experience level, remote toggles, location constraints) and fetches relevant roles from premium job data providers. Then, utilizing advanced LLMs (via OpenRouter), it scores, semantically filters, and curates only the most relevant opportunities.

### 🛠️ Core Technology Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** React 18, Tailwind CSS, Framer Motion (Glassmorphism & Micro-animations)
- **Authentication:** Clerk (`@clerk/nextjs` v6)
- **Database & Caching:** Upstash Redis (`@upstash/redis`), Upstash Rate Limiting
- **Payments & Premium:** Razorpay integrations / Stripe
- **AI/LLM Providers:** OpenRouter API (Accessing models like Google Gemini 2.5 Flash, Mistral, Claude)
- **Data Suppliers:**
  - **SerpAPI (Google Jobs)** - The primary powerhouse for high-quality, localized roles.
  - JSearch (RapidAPI)
  - Native Lever API & Various RSS Feeds (WeWorkRemotely, RemoteOK, Remotive).

---

## 🧠 2. The Matching Engine (v7 Python Port to JS)

The matching engine located in `lib/matcher.js` was historically entirely rewritten. The previous version lacked true semantic awareness and flat seniority scaling resulting in mismatched roles (i.e. Coordinator matched to Director).

We ported the highly reliable **Python `run_auto_apply.py` v7** pipeline over to JavaScript. 

### Key Engine Features:
- **Title Synonym Expansion:** Translates titles cross-domain. A user searching "Software Engineer" will implicitly match "Developer," "Programmer," "SDE," etc.
- **Secondary Keyword Scoring:** 40+ domain-level terms (e.g., finance, logistics) that provide specific relevance multipliers.
- **Full Stem Mapping:** Connects 20+ root words: `financial ↔ finance`, `analyst ↔ analytics`.
- **Pre-Scoring Deduplication:** Deduplicates jobs by `company:title` before routing them through expensive LLM inference.
- **The Granular 5-Level Seniority Matrix:**
  - Level 5: Exec (Director, VP, CTO)
  - Level 4: Senior (Team Lead, Sr.)
  - Level 3: Manager
  - Level 2: Mid
  - Level 1: Entry (Specialist, Coordinator)
  - *Dynamic Scoring:* Reaching down in seniority (Manager applying to Coordinator) provides a small bonus (`+5`). Reaching up heavily penalized (Specialist applying to Director triggers a brutal `-30` penalty).

### Scoring Pipeline (Locally + LLM)
1. **Local Heuristic:** Primary keyword weights + Seniority gap alignment + Word boundaries to avoid false positives (e.g., stopping 'coordinator' matching 'coo').
2. **LLM Batching:** Top candidates fetched run through OpenRouter/Gemini 2.5 Flash. Prompt enforces strict seniority constraints.
3. **Post-Processing:** Boosts added for exact location alignment or highly-rated platforms (LinkedIn, Indeed). End result capped at the Top 25 most potent matches.

---

## 🚦 3. Go-Live Criticals

For a smooth production launch or deployment, the following operational gates are established:

### Operations & Tokens
- **SaaS Guardrails:** Crucial API routes (`/api/match-jobs`, `/api/analyze-job`, `/api/tokens`) enforce strict `auth()` checks to ensure that anonymous users cannot bleed proxy API quotas.
- **Clerk v6 Async:** Make sure to handle `await auth()` correctly in React Server Components per Clerk v6.
- **Semantic Caching:** Utilizing `lib/cache.js`, all user queries are cached for 24 hours on Upstash. If a user runs the identical search param configuration, it serves results instantly from Redis and preserves SerpAPI credits.
- **Premium Admin Bypass:** Deployed a hard bypass enabling specific **admin emails** to automatically override search blocks. This prevents founders/QA from locking themselves out of premium features (like the `Super Search`) when running extensive tests.

### Required Environment Setup (`.env.local`)
To go live, Vercel requires these specific variables to be active:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`
- `OPENROUTER_API_KEY`
- `SERPAPI_KEY` (Premium unthrottled plan active)
- `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`
- Payment Gateway keys (Razorpay/Stripe).

---

## 🤖 4. Autonomous Agents & Specialized Workflows

The JobBot platform utilizes a highly collaborative, specialized team of workflow agents (located in `.agents/workflows`). You can summon these personas to step in and fix code, audit strategy, or run tests with expert precision:

1. **CEO & Head of Product** (`/ceo-head-of-product`)
   - **Role:** Visionary leadership and roadmap planner.
   - **Function:** Enforces product-market fit, defines features, ensures UI/UX aligns with user needs, and prevents scope creep.
2. **Backend Next.js & API Expert** (`/backend-nextjs-expert`)
   - **Role:** Server-side architect.
   - **Function:** Handles `/api` routes, Upstash rate limits, OpenRouter batching, scaling optimizations, and edge caching logic.
3. **Frontend UI Designer** (`/frontend-designer`)
   - **Role:** Modern creative developer.
   - **Function:** Crafts vibrant, accessible styling using Tailwind CSS, Framer Motion, micro-animations, ensuring the "Cosmic Night" theme feels premium.
4. **Scoring Architect / Algorithmic Data Balancer** (`/scoring-architect`)
   - **Role:** Mathematical logic mapping.
   - **Function:** Fine-tunes the `matcher.js` thresholds, adjusts the seniority matrix penalties, and calibrates LLM prompt instructions to prevent false-positive matching.
5. **Business Strategy & Monetization Lead** (`/business-monetization-lead`)
   - **Role:** Revenue extraction engineering.
   - **Function:** Focuses on conversion rate optimization, SaaS tier planning (tokens/credits logic), and optimizing the user journey from free trial to paid subscriber.
6. **Growth Hacker / SEO Specialist** (`/growth-seo-specialist`)
   - **Role:** Organic traffic driver.
   - **Function:** Manages meta tags, semantic HTML, schema logic, and load times to rank JobBot high naturally.
7. **Legal & Compliance Auditor** (`/legal-compliance-auditor`)
   - **Role:** Data and privacy safety node.
   - **Function:** Reviews Stripe/Razorpay handling, guarantees GDPR compliance for scraped candidate resumes, and evaluates Terms of Service.
8. **Site Reliability Engineer / DevOps** (`/sre-devops`)
   - **Role:** Uptime logic and deployment stability.
   - **Function:** Investigates failing Vercel builds, ensures `.env` security, manages Git rollbacks, and monitors GitHub Actions.
9. **UI/UX App Tester** (`/app-tester-ui`)
   - **Role:** Visual QA.
   - **Function:** Sweeps the UI looking for "Super Search grayed out" errors, Z-index overlapping, mobile unresponsiveness, and weird visual bugs.
10. **E2E App Tester** (`/app-tester-e2e`)
    - **Role:** Application logic QA.
    - **Function:** End-to-end testing from sign-in, configuring job preferences, running a match, generating an AI review, and confirming correct token deduction.

---
*Generated by Antigravity under the direction of the Core Team.*
