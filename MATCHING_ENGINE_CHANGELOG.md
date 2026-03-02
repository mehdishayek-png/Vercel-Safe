# JobBot Matching Engine — Changelog

## Overview

Replaced the broken JS matching engine with a faithful port of the **reliable Python `run_auto_apply.py` v7** pipeline, plus a new granular seniority system to fix the specialist→manager mismatch problem.

---

## Files Changed

| Action | File | Description |
|--------|------|-------------|
| **REPLACE** | `lib/matcher.js` | Complete rewrite — reliable Python pipeline ported to JS |
| **REPLACE** | `app/api/match-jobs/route.js` | Simplified — removed `useEnhanced` toggle, uses only reliable matcher |
| **DELETE** | `lib/matcher-enhanced.js` | No longer needed — the embedding/semantic approach was causing bad matches |

---

## What Was Wrong (Old `matcher.js`)

### 1. Missing Title Synonyms
The Python version had a huge `TITLE_SYNONYMS` map that expanded job title keywords semantically. For example, if your headline was "software engineer", it would also match jobs containing "developer", "programmer", "sde", etc. **The JS version had none of this** — it only matched exact skill/headline words.

### 2. Missing Secondary Keywords
The Python had ~40 domain-level terms (finance, operations, consulting, compliance, etc.) that added secondary relevance signals. The JS version had no secondary keyword system at all.

### 3. Incomplete Stem Mapping
Python had **20+ stem pairs** (financial↔finance, analyst↔analytics, consultant↔consulting, accountant↔accounting, etc.). The JS version only had **7 pairs** (operations, management, manager, automation, integration, development, engineering).

### 4. Wrong Thresholds
- **Entry threshold**: Python used `35` (generous, let LLM decide). JS used `25` (too low, let junk through).
- **Final adaptive thresholds**: Python tried `55 → 50 → 45`. JS tried `70 → 65 → 60` (way too aggressive — killed good matches).

### 5. No Deduplication Before Scoring
Python deduplicated jobs by company+title before scoring. JS skipped this, wasting LLM calls on duplicate entries.

### 6. Flat Seniority System (THE BIG ONE)
The old system had only **2 tiers**: `senior` and `mid`. "Manager" was classified as `mid` and got a **+3 bonus** for anyone with ≥2 years experience. This meant a "Customer Experience Specialist" would score **higher** on "Customer Experience Manager" roles because of the keyword overlap + seniority bonus.

---

## What's New (New `matcher.js`)

### 1. Title Synonym Expansion
Ported the full `TITLE_SYNONYMS` dictionary covering:
- Construction & Project Management
- Customer Support & Success
- Engineering & Development
- Data & Analytics
- Sales & Marketing
- Operations & Management
- Design & Creative

Each base title maps to 5-7 semantic equivalents. Individual words from multi-word synonyms are also added.

### 2. Secondary Keywords
40+ domain terms now act as secondary relevance signals (+2 points each). Only activated if the term appears in the candidate's headline or skills, preventing false positives.

### 3. Full Stem Mapping
20+ stem pairs ported from Python, including:
- financial ↔ finance
- analyst ↔ analytics ↔ analysis
- consultant ↔ consulting
- accountant ↔ accounting
- strategy ↔ strategic
- technical ↔ tech ↔ technology
- And more...

### 4. Corrected Thresholds
- **Entry**: `35` (match Python — generous, let LLM decide)
- **Final adaptive**: `55 → 50 → 45` (match Python — ensures results)

### 5. Deduplication
Jobs are deduplicated by `company:title` key before scoring, matching the Python behavior.

### 6. Granular 5-Level Seniority System (NEW — better than Python)

| Level | Name | Example Titles |
|-------|------|----------------|
| 5 | Exec | Director, VP, CTO, Head of, Principal |
| 4 | Senior | Senior, Sr., Lead, Team Lead |
| 3 | Manager | Manager, Supervisor |
| 2 | Mid | Mid-level, Intermediate |
| 1 | Entry | Specialist, Coordinator, Analyst, Associate, Assistant |
| 0 | Open | No seniority marker detected |

**Scoring based on gap (job level − candidate level):**

| Gap | Effect | Example |
|-----|--------|---------|
| ≤ 0 | **+5 bonus** | Manager applying to Coordinator (reaching down) |
| 1 | **+2 slight stretch** | Specialist applying to Mid-level role |
| 2 | **−15 penalty** | Specialist applying to Manager |
| 3+ | **−30 heavy penalty** | Specialist applying to Director |

**Bug fix: Substring matching.** Short markers like `coo`, `ceo`, `cto` now use word-boundary matching (`\b`) to prevent "coordinator" from matching "coo" or "coordinator" from matching "director".

### 7. Seniority-Aware LLM Prompt
The LLM prompt now explicitly instructs the model:
- Specialist/Coordinator → Manager = score MUST be <50
- Specialist → Director/VP = score MUST be <30
- Match the EXACT seniority tier, not just domain overlap

### 8. Better Experience Estimation
Ported the Python's 4-method fallback chain:
1. Explicit `experience_years` from frontend
2. Years mentioned in headline ("5+ years")
3. Seniority markers in headline
4. Role-based estimation with skill count as proxy

---

## Scoring Pipeline (unchanged from reliable Python)

```
Phase 1: Local Keyword Scoring (0 API calls)
├── Primary keyword matching (weighted by length: 5/8/12 points)
├── Secondary keyword matching (+2 each)
├── Title word overlap bonus (+4/+8)
├── Seniority alignment (−30 to +5)
├── Non-English filter
└── Hard seniority kill (junior candidate + exec job)

Phase 2: LLM Batch Scoring (1-4 API calls)
├── Top 50 candidates sent to Gemini 2.5 Flash
├── Batches of 15 jobs per call
├── Fallback to Mistral 7B if Gemini fails
└── Combined: 40% local + 60% LLM

Phase 3: Post-Processing
├── Source priority boost (+5 for Indeed/LinkedIn/Naukri/etc.)
├── Location boost (+8 if job mentions user's country/city)
├── Adaptive threshold (55 → 50 → 45)
├── Company diversity (max 3 per company)
└── Final cap at 25 matches
```

---

## Before & After: "Customer Experience Specialist"

### Job: "Customer Experience Manager"

| Signal | Before (Old) | After (New) |
|--------|-------------|-------------|
| Keyword match | +24 (customer, experience, etc.) | +24 (same) |
| Seniority | **+3 bonus** (manager = "mid", years ≥ 2) | **−15 penalty** (specialist→manager = gap 2) |
| LLM score | ~75 (domain overlap looks great) | ~40 (prompt says specialist≠manager) |
| **Combined** | **~65 (shown as good match)** | **~30 (filtered out)** |

### Job: "Customer Experience Specialist"

| Signal | Before (Old) | After (New) |
|--------|-------------|-------------|
| Keyword match | +24 | +24 |
| Seniority | +5 (open tier bonus) | **+5 bonus** (same level) |
| LLM score | ~75 | ~80 |
| **Combined** | **~65** | **~70 (shown as strong match)** |
