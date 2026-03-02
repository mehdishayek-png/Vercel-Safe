// heuristic-stress-test.js
// Isolated testing environment for the Scoring Architect constraints

function scoreJob(job, profile) {
    const title = (job.title || '').toLowerCase();
    const summary = (job.summary || '').toLowerCase();
    const combined = `${title} ${summary}`;

    // Generate deterministic variance so identical scores don't stack perfectly, 
    // but the score never changes on refresh.
    const deterministicVariance = combined.length % 5;
    let score = 30 + deterministicVariance; // Base variance of 0-4

    const primaryKw = profile.primaryKw || [];
    const candidateHeadline = (profile.headline || '').toLowerCase();
    const candidateYears = profile.experience_years || 0;

    // 1. "The Ultimate Ability" (Title Synergy Multiplier)
    let titleSynergyMultiplier = 1.0;
    if (candidateHeadline && title.includes(candidateHeadline)) {
        titleSynergyMultiplier = 1.3; // 30% buff for exact role match
    }

    // 2. Dynamic Weighting & "Keyword Density Debuff"
    // If a job is 2,000 words long, finding 5 keywords means nothing compared to finding 5 in a 300 word job.
    const wordCount = combined.split(/\s+/).length;
    // Assume average JD is 400 words. If it's 800+ words, we start scaling down the value of each keyword.
    const densityPenalty = Math.max(0.4, Math.min(1.0, 400 / wordCount));

    let keywordHits = 0;
    let rawKeywordScore = 0;
    for (const kw of primaryKw) {
        if (combined.includes(kw)) {
            keywordHits++;
            // Diminishing returns over time. Punish rapid-fire keywords harder.
            const diminishingFactor = Math.max(0.1, 1.0 - (keywordHits * 0.15));

            let kwScore = 0;
            if (kw.length > 10) kwScore = 14;
            else if (kw.length > 6) kwScore = 9;
            else kwScore = 4;

            rawKeywordScore += (kwScore * diminishingFactor * densityPenalty);
        }
    }

    // Hard Cap on Keyword Spam: You can only get a maximum of 30 points from raw keyword hits.
    score += Math.min(rawKeywordScore, 30);

    // 3. "Armor Penetration" (Core Stack Ratio)
    // Core stack bonus is also heavily penalized if the density is garbage (spammers)
    if (keywordHits >= 4) {
        score += (15 * densityPenalty);
    }

    // 4. "The Goldilocks Multiplier" (Seniority Matching)
    const isSeniorJob = title.includes('senior') || title.includes('lead') || title.includes('principal') || title.includes('vp') || title.includes('director');
    const isMidJob = title.includes('mid') || (!isSeniorJob && !title.includes('junior') && !title.includes('entry') && !title.includes('intern'));
    const isJuniorJob = title.includes('junior') || title.includes('entry') || title.includes('intern');

    let seniorityMultiplier = 1.0; // Assume Mid mapping to Mid by default

    if (candidateYears < 2) {
        // Entry Level Candidate
        if (isJuniorJob) seniorityMultiplier = 1.2;     // Perfect Match
        else if (isMidJob) seniorityMultiplier = 0.8;   // Reaching Up 1 (Okay)
        else if (isSeniorJob) seniorityMultiplier = 0.2; // Hard Silence (Denied)
    } else if (candidateYears >= 2 && candidateYears < 6) {
        // Mid Level Candidate
        if (isMidJob) seniorityMultiplier = 1.2;        // Perfect Match
        else if (isSeniorJob) seniorityMultiplier = 0.9; // Reaching Up 1 (Slight Penalty)
        else if (isJuniorJob) seniorityMultiplier = 0.6; // Slumming (Heavy Penalty to keep feed clean for actual Juniors)
    } else if (candidateYears >= 6) {
        // Senior Candidate
        if (isSeniorJob) seniorityMultiplier = 1.2;     // Perfect Match
        else if (isMidJob) seniorityMultiplier = 0.8;   // Reaching Down 1 (Penalty)
        else if (isJuniorJob) seniorityMultiplier = 0.1; // Hard Silence (Denied)
    }

    // Apply Multipliers
    // The Density Penalty acts as a final debuff on the entire score
    score = score * titleSynergyMultiplier * seniorityMultiplier * densityPenalty;

    if (title.includes('Spammer') || title.includes('Frontend Engineer')) {
        console.log(`[DEBUG - ${title}] Base: ${30 + deterministicVariance} | Raw KW: ${rawKeywordScore.toFixed(1)} -> Capped: ${Math.min(rawKeywordScore, 30)} | CoreBonus: ${(keywordHits >= 4 ? (15 * densityPenalty) : 0).toFixed(1)} | Density: ${densityPenalty.toFixed(2)} | Final: ${Math.min(Math.round(score), 100)}`);
    }

    return Math.min(Math.round(score), 100);
}

// --- MOCK DATA ---
const profiles = [
    {
        name: "React Dev",
        headline: "frontend engineer",
        experience_years: 4,
        primaryKw: ["react", "javascript", "css", "html", "redux", "typescript", "tailwind"]
    },
    {
        name: "Veteran Architect",
        headline: "software engineer",
        experience_years: 12, // High tenure, generic title
        primaryKw: ["java", "spring boot", "microservices", "kubernetes", "aws", "system architecture"]
    }
];

const jobs = [
    { id: 1, title: "Frontend Engineer", summary: "Looking for a frontend engineer with great react, javascript, and tailwind skills." },
    { id: 2, title: "Senior Backend Developer", summary: "Must know java, spring boot, aws, and kubernetes. 8+ years required." },
    { id: 3, title: "Junior Web Developer", summary: "Entry level. Need basic javascript and html." },
    { id: 4, title: "Garbage Sorting Tech", summary: "Warehouse worker needed." }, // Garbage
    { id: 5, title: "Fullstack Keyword Spammer", summary: "We are an innovative tech company looking for a ninja rockstar who knows " + "react javascript css html redux typescript tailwind java spring aws kubernetes ".repeat(20) } // Tests density debuff with 200+ words
];

// --- RUN TEST ---
console.log("=== HEURISTIC STRESS TEST START ===");
profiles.forEach(p => {
    console.log(`\n\n--- Testing Profile: ${p.name} (${p.experience_years} years) ---`);
    console.log(`Headline: ${p.headline} | Skills: ${p.primaryKw.length}`);

    const results = jobs.map(j => {
        const score = scoreJob(j, p);
        return { id: j.id, title: j.title, score };
    });

    results.sort((a, b) => b.score - a.score);

    results.forEach(r => {
        console.log(`Score ${r.score.toString().padStart(3, ' ')} | [Job ${r.id}] ${r.title}`);
    });
});
console.log("\n=== TEST COMPLETE ===\n");
