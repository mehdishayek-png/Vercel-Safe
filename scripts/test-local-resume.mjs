import fs from 'fs';
import path from 'path';

import { parseResumePDF } from '../lib/resume-parser.js';
import { fetchAllJobsStreaming } from '../lib/job-fetcher.js';
import { calculatePandaScore } from '../lib/panda-matcher.js';

async function runSimulation(pdfPath) {
    if (!fs.existsSync(pdfPath)) {
        console.error(`\n❌ Error: File not found at ${pdfPath}`);
        console.error(`Make sure to pass the absolute path to your PDF inside single quotes!`);
        process.exit(1);
    }

    console.log(`\n📄 Reading PDF from: ${pdfPath}`);
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    console.log(`\n🤖 Sending text to Gemini/Claude to extract atomic skills...`);
    const profile = await parseResumePDF(pdfBuffer);

    console.log(`\n============ 👤 EXTRACTED PROFILE ============`);
    console.log(`Name:        ${profile.name}`);
    console.log(`Headline:    ${profile.headline}`);
    console.log(`Location:    ${profile.location || 'Not extracted'}`);
    console.log(`Years Exp:   ${profile.experience_years}`);
    console.log(`Skills:      ${profile.skills.join(', ')}`);
    console.log(`Search Trm:  ${profile.search_keywords?.join(', ')}\n`);

    const preferences = { 
        remoteOnly: false, 
        superSearch: false, 
        location: profile.location || 'Remote',
        midasSearch: true,
        forceRefresh: true // Bypass Redis cache so we hit live APIs + Firecrawl
    };

    console.log(`📡 Fetching live jobs for [${profile.headline}] in [${preferences.location}]...`);
    console.log(`(This bypasses cache, so Firecrawl and scrapers will run)`);

    // Force development mode
    process.env.NODE_ENV = 'development';

    const allJobs = [];
    const fetchResult = await fetchAllJobsStreaming(
        profile,
        {}, // apiKeys
        (source, fetchedJobs) => {
            console.log(`  [+] ${source}: found ${fetchedJobs.length} jobs`);
            allJobs.push(...fetchedJobs);
        },
        (msg) => console.log(`  [Fetcher] ${msg}`),
        preferences
    );

    const jobs = fetchResult.jobs;
    console.log(`\n✅ Fetched ${jobs.length} unique deduplicated jobs. Running Panda matcher...`);

    // Match each job against Candidate
    const scoredJobs = [];
    for (const job of jobs) {
        const result = await calculatePandaScore(job, profile, preferences);
        scoredJobs.push({ job, result });
    }

    // Sort by Panda Score DESC
    scoredJobs.sort((a, b) => b.result.score - a.result.score);

    // Output Top 5
    console.log(`\n🏆 TOP 5 MATCHES FOR THIS RESUME 🏆`);
    const top5 = scoredJobs.slice(0, 5);
    for (let i = 0; i < top5.length; i++) {
        const { job, result } = top5[i];
        
        let matchLabel = result.score >= 75 ? '🟢 High Match' : result.score >= 50 ? '🟡 Good Match' : '⚪ Worth a Look';

        console.log(`\n  #${i + 1} | ${job.title}`);
        console.log(`  🏢 ${job.company}  |  📍 ${job.location || 'Not Specified'}  |  🎯 ${result.score} pts (${matchLabel})`);
        console.log(`  🔗 ${job.apply_url || 'No URL'}`);
        
        if (job._enriched) {
            console.log(`  🔥 (Successfully enriched by Firecrawl API!)`);
        }
        
        const matchSkills = result.matches?.map(m => `+${m.value} ${m.skill}`).join(', ');
        console.log(`  ✨ Overlaps: ${matchSkills || 'None'}`);
        
        const killers = Object.entries(result.multipliers || {})
            .filter(([k,v]) => parseFloat(v) < 1.0)
            .map(([k,v]) => `${k}=${v}`)
            .join(', ');
            
        if (killers) console.log(`  ⚠️ Penalties: ${killers}`);
        console.log('  --------------------------------------------------');
    }
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log(`Usage: node scripts/test-local-resume.mjs '/Users/admin/Downloads/Mehdi_Shayek_AI_Product_Ops.pdf'`);
    process.exit(1);
}

runSimulation(args[0]).catch(e => {
    console.error('\n❌ Fatal Error:', e.message);
});
