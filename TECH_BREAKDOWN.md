# 🏗️ Midas Match: Technical Audit & Story (100+ Deployments)

This document synthesizes the architectural journey of Midas Match, a solo-built AI job matching engine. It captures the exhaustive tech stack, the hardest engineering hurdles, and the "vibe coder" breakthroughs that turned a hobby project into a production-ready SaaS.

---

## 🛠️ 1. Exhaustive Tech Stack

### **Core Framework & Infrastructure**
*   **Next.js 14 (App Router)**: The backbone of the project, leveraging Server Actions and high-concurrency API routes.
*   **Vercel**: Deployment, Serverless Functions (optimized for 90s execution), and auto-scaling.
*   **Vercel Analytics & Speed Insights**: Monitoring engagement and performance bottlenecks.
*   **Clerk v6**: Robust auth and user management.
*   **Zustand v5**: Lightweight, high-performance state management (4 dedicated stores: Profile, Search, Jobs, Token).
*   **Upstash Redis**: The singleton source of truth for caching, rate-limiting, and the atomic token economy.

### **AI & Agentic Orchestration**
*   **The Orchestrator**: **Antigravity (Gemini 3.1 Pro)** for high-level architecture and task execution.
*   **The Reasoning Engine**: **Gemma 2 27B** via **MCP (Model Context Protocol)** for complex logic and structural decisions.
*   **The Deep Analyzer**: **Claude 3.5 Sonnet** (via OpenRouter) — often aliased to Gemini Flash (`callSonnet → callFlash`) for extreme cost efficiency.
*   **The "Worker Bee" Layer**: **Gemini 1.5 Flash** for resume parsing, cover letter generation, and interview prep.
*   **Legacy Core**: Claude CLI (initial MVP foundations before MAX plan regression).

### **Data & Scraping Swarm (25+ Sources)**
*   **2,741 Indexed Career Pages**: Massive registry of direct ATS boards (Workday, Greenhouse, Lever, Ashby).
*   **Free Swarm (Primary)**:
    *   **LinkedIn Guest Scraper**: No-auth extraction (metro geoIds).
    *   **Workday Public Entrypoints**: 713 verified direct POST API tenants.
    *   **Hacker News Hiring Thread Parser**: Custom LLM-based parser for high-signal jobs.
    *   **Tier 3 APIs**: Remotive, RemoteOK, Jobicy, Arbeitnow, The Muse.
*   **Paid/Premium Layer (Fallback)**:
    *   **DataForSEO**: Deep Google Jobs search (Task-Poll model).
    *   **JSearch (RapidAPI)** / **Serper.dev**.

### **Payments & Product**
*   **Razorpay**: Integrated for the Indian market.
*   **Zod**: Strict schema validation for all incoming match payloads.
*   **Bundle Optimization**: Replaced legacy 2.5MB geo package with a 3KB curated city list to save mobile performance.

---

## 🧗 2. Top 5 Technical Challenges

1.  **Atomic Tokens on Stateless Infra**: 
    *   **Challenge**: Token deductions and vesting schedules were hitting race conditions in distributed Vercel environments.
    *   **Solution**: Moved the entire billing logic into **Upstash Redis via Atomic Lua scripts**. Every deduction is a single, non-blocking operation.
2.  **Scoring 8,000+ Jobs without LLMs**:
    *   **Challenge**: Traditional LLM prompts cost $5.00/scan for this volume.
    *   **Solution**: Built the **Panda Matcher** from scratch (1,746 lines). Uses 10 multipliers, 48 domain clusters, and IDF (Inverse Document Frequency) weighting to handle 90% of the work for zero cost.
3.  **25 Sources under 90s Timeout**:
    *   **Challenge**: Sequential fetching took minutes.
    *   **Solution**: Registry-driven parallel streaming with **Circuit Breakers**. If a source lags, it's auto-disabled. SSE (Server-Sent Events) keeps the user engaged with live updates.
4.  **Location Scoring without a Geo API**:
    *   **Challenge**: $0.05 per Lat/Long API call was too much.
    *   **Solution**: Built a lookup system with **200+ city aliases** and a 5-tier scoring logic. Zero API calls, zero latency.
5.  **The 2.5MB Bundle Wall**:
    *   **Challenge**: Large geo libraries were killing mobile TBT (Total Blocking Time).
    *   **Solution**: Purged the libraries and built a custom 3KB curated city list of 150+ major job hubs.

---

## ✨ 3. Clever Architectural Workarounds

*   **callSonnet → callFlash Alias**: Permanent redirect of expensive Sonnet calls to Gemini Flash for a 100x cost reduction without losing job-matching precision.
*   **Lazy Vest Release**: Token vesting doesn't use a cron job. It releases atomically only when the user checks their balance, saving thousands of unnecessary executions.
*   **safe() Guard for React**: A simple wrapper that prevents LLM-generated objects from crashing React components (Fix for the infamous #31 crash).
*   **Cold-Start Circuit Breaker**: Uses in-memory state to track source failures, using Vercel cold starts as a natural "reset" mechanism for the circuit.
*   **HN Hiring Thread Parser**: An LLM-powered background scraper that turns messy Hacker News comments into clean, searchable job data for free.

---

> [!TIP]
> **LinkedIn Hook Idea:**
> "I built 100 deployments of a Job AI, and the hardest part wasn't the AI. It was the 60-second execution wall."
> (Then pivot into the Parallel Swarm and the JD Enrichment wins!)
