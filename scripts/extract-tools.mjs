#!/usr/bin/env node
/**
 * Phase 2 Entity Extraction: Auto-Discover New Tech Tools from Job Descriptions
 *
 * Usage:
 *   node --env-file=.env.local scripts/extract-tools.mjs
 */

import { readdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, join } from 'node:path';
import readline from 'node:readline';

// Import existing tools so we don't extract what we already know
import { NICHE_TOOLS } from '../lib/panda-matcher.js';

const FLASH_MODEL = 'google/gemini-2.5-flash';
const BATCH_SIZE = 50;

async function getLatestLogFile() {
    const dir = resolve(process.cwd(), 'logs', 'matches');
    try {
        const files = await readdir(dir);
        const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
        if (jsonlFiles.length === 0) return null;
        
        let latestFile = null;
        let latestTime = 0;
        
        for (const f of jsonlFiles) {
            const p = join(dir, f);
            const stats = await stat(p);
            if (stats.mtimeMs > latestTime) {
                latestTime = stats.mtimeMs;
                latestFile = p;
            }
        }
        return latestFile;
    } catch {
        return null;
    }
}

async function extractDescriptions(filePath, max = 50) {
    const stream = createReadStream(filePath);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    const descriptions = [];
    
    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const entry = JSON.parse(line);
            if (entry?.job?.description) {
                // Shorten to not blow up token limits wildly
                descriptions.push(entry.job.description.substring(0, 3000));
            }
            if (descriptions.length >= max) break;
        } catch (e) {
            // Ignore parse errors on malformed lines
        }
    }
    return descriptions;
}

async function runLLMExtraction(descriptions) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error('ERROR: OPENROUTER_API_KEY is not set. Did you pass --env-file=.env.local?');
        process.exit(1);
    }
    
    console.log(`Sending ${descriptions.length} Job Descriptions to the LLM for analysis...`);
    
    const existingToolsStr = Array.from(NICHE_TOOLS).join(', ');
    
    const prompt = `
You are an expert technical recruiter and software architect.
I am providing you with ${descriptions.length} raw job descriptions.

Your task is to identify and extract ALL specific technical tools, software platforms, SaaS products, and technical frameworks mentioned across these job descriptions.

CRITICAL INSTRUCTIONS:
1. IGNORING KNOWN TOOLS: Do NOT output any tools present in this known list: ${existingToolsStr}
2. BE SPECIFIC: Extract specific nouns like 'Docker', 'Snowflake', 'Figma', 'Datadog', 'Stripe'.
3. NO GENERIC TERMS: Do not extract generic concepts like 'agile', 'scrum', 'backend', 'api', 'scalable', 'b2b', 'crm'.
4. NO HUMAN SKILLS: Do not extract 'leadership', 'communication', 'troubleshooting'.
5. LOWERCASE ONLY: Return all string findings in exactly all-lowercase.

Return a strict JSON array of strings ONLY. No markdown, no explanations.
Example output: ["playwright", "kafka", "redis", "vercel"]

--- JOB DESCRIPTIONS ---
${descriptions.join('\\n\\n---\\n\\n')}
`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://midasmatch.com',
            'X-Title': 'Midas-Script',
        },
        body: JSON.stringify({
            model: FLASH_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 1500,
            response_format: { type: 'json_object' } // Help coerce JSON if supported, otherwise rely on prompt stringency
        }),
    });

    if (!res.ok) {
        throw new Error(`API Error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    let content = data.choices[0].message.content.trim();
    content = content.replace(/^\`\`\`(?:json)?\s*\n?/i, '').replace(/\n?\s*\`\`\`\s*$/i, '');
    
    try {
        const parsed = JSON.parse(content);
        // Sometimes the model might wrap the array in an object like { "tools": [...] }
        if (Array.isArray(parsed)) return parsed;
        if (parsed.tools && Array.isArray(parsed.tools)) return parsed.tools;
        // Fallback
        return Object.values(parsed).find(v => Array.isArray(v)) || [];
    } catch (e) {
        console.error("Failed to parse JSON from LLM response:");
        console.log(content);
        return [];
    }
}

async function main() {
    console.log("=== Phase 2: NICHE_TOOLS Extraction Script ===");
    
    const file = await getLatestLogFile();
    if (!file) {
        console.error("No .jsonl log files found in logs/matches/. Run 'node scripts/pull-match-logs.mjs' first to grab production data.");
        process.exit(1);
    }
    
    console.log(`Selected log file: ${file}`);
    const descriptions = await extractDescriptions(file, BATCH_SIZE);
    
    if (descriptions.length === 0) {
        console.log("No valid job descriptions found in the log file.");
        process.exit(0);
    }
    
    try {
        const discovered = await runLLMExtraction(descriptions);
        
        if (!discovered || discovered.length === 0) {
            console.log("\\n✨ No new tools discovered. The dictionary is fully up to date!");
            process.exit(0);
        }
        
        // Filter against Set just to be absolutely sure LLM listened
        const strictlyNew = discovered.filter(t => typeof t === 'string' && !NICHE_TOOLS.has(t.toLowerCase()));
        
        console.log("\\n=======================================================");
        console.log("             🚀 NEW TOOLS DISCOVERED");
        console.log("=======================================================");
        if (strictlyNew.length > 0) {
            console.log("Copy and evaluate these for lib/panda-matcher.js:\\n");
            strictlyNew.forEach(t => console.log(`  '${t.toLowerCase()}',`));
        } else {
            console.log("LLM returned tools, but they were already in the dictionary.");
        }
        console.log("=======================================================\\n");

    } catch (err) {
        console.error("Extraction failed:", err);
    }
}

main();
