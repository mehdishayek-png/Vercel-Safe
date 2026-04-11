# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - Core Matcher Overhaul

### Added
- **Native Salary Normalizer:** Integrated `lib/pre-filter.js` currency-aware scale thresholds (`ANNUAL_THRESHOLDS`). The engine correctly normalizes INR Monthly payloads to INR Annual before converting to USD, preventing low-paying international jobs from breaching high USD salary floors.
- **Weekday AES Key Fallbacks:** Integrated dynamic environment variable routing (`process.env.WEEKDAY_ENCRYPT_KEY` and `WEEKDAY_DECRYPT_KEY`) into the Weekday.works scraper, removing the fatal hardcoded AES keys. Added telemetry triggers to intercept AES `JSON.parse` decryption errors.
- **Weekday Scraper Kill Switch:** Added a fast-toggle `process.env.DISABLE_WEEKDAY_SCRAPER` boolean to sever the undocumented API stream without code execution.
- **Gemini Phase 0 Embeddings:** Integrated batch computation for semantic scoring within `lib/matcher.js` enabling dynamic `cosineSimilarity` evaluations for candidate alignment profiles.

### Changed
- **LinkedIn Sourcing Constraints:** Reconfigured `lib/sources/linkedin-guest.js` temporal bounds. Restricted `f_TPR` to grab exclusively `24h` fresh jobs. Eliminates >90% of the 1000+ applicant roles while minimizing SERP API volume calls.
- **Skill Atomizer Engine:** Overhauled the multi-word skill decomposition engine in `lib/skill-normalizer.js`. Removed destructive length-based heuristic fallback algorithms. Dictionary (`COMPOUND_BREAKDOWNS`) sanitized to discard generic verbs (e.g. "authentication", "workflow") and strictly preserve contextual skill phrases (e.g., "SSO").
- **LLM Extraction Directive:** Edited `google/gemini-2.5-flash` context window prompt. Instructed model to perform surgical string isolation instead of shredding multi-verb skills recursively.

### Fixed
- **Hacker News Splitter (Hydration Path):** Repaired fatal Next.js regex mapping in Cutshort and Apno SSR payload extractions. Fixed brute-force `String.split()` array explosions causing serverless boundary crashes in `fetchHNWhoIsHiring()`.
