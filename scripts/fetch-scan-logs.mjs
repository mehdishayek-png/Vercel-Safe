#!/usr/bin/env node
/**
 * Fetch and parse the most recent scan from Vercel logs.
 * Groups logs by scan session and shows source breakdown, errors, and discards.
 *
 * Usage:
 *   node scripts/fetch-scan-logs.mjs [--since 30m] [--user user_id]
 */

import { execSync } from 'child_process';

const args = process.argv.slice(2);
const sinceArg = args.find(a => a.startsWith('--since='))?.split('=')[1] || '30m';
const userArg = args.find(a => a.startsWith('--user='))?.split('=')[1] || null;

console.log(`Fetching Vercel logs from last ${sinceArg}...\n`);

// Pull logs as JSON Lines
let raw;
try {
    raw = execSync(`vercel logs --json --since ${sinceArg} --limit 500`, {
        cwd: 'C:\\Users\\D\\Vercel-Safe',
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
    });
} catch (err) {
    console.error('Failed to fetch logs:', err.message);
    process.exit(1);
}

// Parse JSON Lines
const lines = raw.split('\n').filter(l => l.trim().startsWith('{'));
const logs = lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
}).filter(Boolean);

console.log(`Parsed ${logs.length} log entries.\n`);

// Find scan_diagnostic events (preferred — has full breakdown)
// Fall back to scan_started if no diagnostic available yet (older deploys)
const scanDiagnostics = logs.filter(l => {
    try {
        const m = typeof l.message === 'string' ? JSON.parse(l.message) : null;
        return m?.event === 'scan_diagnostic' && (!userArg || m.userId === userArg);
    } catch { return false; }
}).sort((a, b) => b.timestamp - a.timestamp);

if (scanDiagnostics.length > 0) {
    const latest = scanDiagnostics[0];
    const d = JSON.parse(latest.message);
    const t = new Date(latest.timestamp);

    console.log('═══ MOST RECENT SCAN (DIAGNOSTIC) ═══');
    console.log(`Time:     ${t.toISOString()}`);
    console.log(`User:     ${d.userId}`);
    console.log(`Headline: ${d.headline}`);
    console.log(`Duration: ${(d.durationMs / 1000).toFixed(1)}s`);
    console.log(`Queries:  ${(d.queries || []).join(', ')}`);
    console.log('');

    console.log('═══ TOTALS ═══');
    console.log(`  Raw fetched:   ${d.totals.fetched}`);
    console.log(`  Unique (deduped): ${d.totalUnique}`);
    console.log(`  Displayed (>=30): ${d.totals.displayed}`);
    console.log(`  Discarded (1-29): ${d.totals.discarded}`);
    console.log(`  Zero score:    ${d.totals.zero}`);
    console.log(`  Hit rate:      ${d.totals.fetched > 0 ? Math.round(d.totals.displayed / d.totals.fetched * 100) : 0}%`);
    console.log('');

    console.log('═══ SOURCE BREAKDOWN ═══');
    const sorted = Object.entries(d.sources).sort((a, b) => b[1].fetched - a[1].fetched);
    for (const [name, s] of sorted) {
        const hit = s.fetched > 0 ? Math.round(s.displayed / s.fetched * 100) : 0;
        const bar = '█'.repeat(Math.min(40, Math.ceil(s.fetched / 10)));
        console.log(`  ${name.padEnd(28)} ${String(s.fetched).padStart(4)} fetched  ${String(s.displayed).padStart(3)} ✓  ${String(s.discarded).padStart(3)} ✗  ${String(s.zero).padStart(3)} 0  ${String(hit).padStart(3)}% ${bar}`);
    }
    console.log('');

    if (d.topDisplayed?.length > 0) {
        console.log('═══ TOP DISPLAYED ═══');
        for (const j of d.topDisplayed) console.log(`  [${j.s}] ${j.t} @ ${j.c} (${j.src})`);
        console.log('');
    }

    if (d.topDiscarded?.length > 0) {
        console.log('═══ ALMOST-GOOD KILLED (15-29) ═══');
        for (const j of d.topDiscarded) console.log(`  [${j.s}] ${j.t} @ ${j.c} (${j.src}) → ${j.killer}`);
        console.log('');
    }

    if (Object.keys(d.killers || {}).length > 0) {
        console.log('═══ KILLER MULTIPLIERS ═══');
        const killerSorted = Object.entries(d.killers).sort((a, b) => b[1] - a[1]);
        for (const [k, n] of killerSorted) console.log(`  ${n}x  ${k}`);
        console.log('');
    }

    process.exit(0);
}

// Fallback: scan_started events
const scanStarts = logs.filter(l => {
    try {
        const m = typeof l.message === 'string' ? JSON.parse(l.message) : null;
        return m?.event === 'scan_started' && (!userArg || m.userId === userArg);
    } catch { return false; }
}).sort((a, b) => b.timestamp - a.timestamp);

console.log('(No scan_diagnostic events found — likely an older deploy. Showing basic info from scan_started.)\n');

if (scanStarts.length === 0) {
    console.log('No scan sessions found in this window.');
    process.exit(0);
}

console.log(`Found ${scanStarts.length} scan sessions.\n`);

// Take the most recent scan
const latestScan = scanStarts[0];
const scanMeta = JSON.parse(latestScan.message);
const scanTime = new Date(latestScan.timestamp);

console.log('═══ MOST RECENT SCAN ═══');
console.log(`Time:     ${scanTime.toISOString()}`);
console.log(`User:     ${scanMeta.userId}`);
console.log(`Headline: ${scanMeta.headline}`);
console.log(`Skills:   ${(scanMeta.skills || []).join(', ')}`);
console.log(`Location: ${scanMeta.location}`);
console.log(`Midas:    ${scanMeta.midasSearch}`);
console.log('');

// Find logs in the 120-second window after the scan started
const scanEnd = latestScan.timestamp + 120000;
const scanLogs = logs
    .filter(l => l.timestamp >= latestScan.timestamp && l.timestamp <= scanEnd)
    .sort((a, b) => a.timestamp - b.timestamp);

// DEBUG: show all unique [tag] prefixes in the window
const tagCounts = {};
for (const log of scanLogs) {
    const msg = typeof log.message === 'string' ? log.message : '';
    const tagMatch = msg.match(/^\[([A-Z_]+)\]/);
    if (tagMatch) tagCounts[tagMatch[1]] = (tagCounts[tagMatch[1]] || 0) + 1;
}
if (Object.keys(tagCounts).length > 0) {
    console.log('═══ LOG TAGS IN WINDOW ═══');
    for (const [tag, count] of Object.entries(tagCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`  [${tag}] ${count}x`);
    }
    console.log('');
}

console.log(`${scanLogs.length} log entries in scan window.\n`);

// Categorize
const sourceLines = [];
const errorLines = [];
const querPlannerLines = [];
const otherLines = [];
const sourceCounts = {};
let scanComplete = null;

for (const log of scanLogs) {
    const msg = typeof log.message === 'string' ? log.message : JSON.stringify(log.message);
    if (!msg) continue;

    // Parse [SOURCE] Name: N jobs (Tms)
    const sourceMatch = msg.match(/\[SOURCE\]\s+([^:]+):\s+(\d+)\s+jobs?\s+\((\d+)ms\)/);
    if (sourceMatch) {
        sourceCounts[sourceMatch[1].trim()] = { jobs: parseInt(sourceMatch[2]), ms: parseInt(sourceMatch[3]) };
    }

    // Parse SCAN_COMPLETE
    if (msg.includes('[SCAN_COMPLETE]')) {
        scanComplete = msg;
    }

    if (msg.includes('[QUERY_PLANNER]')) querPlannerLines.push(msg);
    else if (msg.includes('[SOURCE]') || msg.match(/\[\w+\]\s+(?:Done|Total|Fetching|"\w)/)) sourceLines.push(msg);
    else if (msg.includes('SKIPPED') || msg.includes('failed') || msg.includes('HTTP ') || msg.includes('Error') || log.level === 'error') errorLines.push(msg);
    else if (msg.includes('SCAN_COMPLETE') || msg.includes('[GEO_FILTER]')) otherLines.push(msg);
}

// Show source counts table
if (Object.keys(sourceCounts).length > 0) {
    console.log('═══ SOURCE BREAKDOWN ═══');
    const sorted = Object.entries(sourceCounts).sort((a, b) => b[1].jobs - a[1].jobs);
    let totalJobs = 0;
    for (const [name, { jobs, ms }] of sorted) {
        totalJobs += jobs;
        const bar = '█'.repeat(Math.min(40, Math.ceil(jobs / 10)));
        console.log(`  ${name.padEnd(28)} ${String(jobs).padStart(5)} jobs  ${String(ms).padStart(6)}ms  ${bar}`);
    }
    console.log(`  ${''.padEnd(28)} ${'─────'.padStart(5)}`);
    console.log(`  ${'TOTAL'.padEnd(28)} ${String(totalJobs).padStart(5)} jobs`);
    console.log('');
}

if (scanComplete) {
    console.log('═══ FINAL ═══');
    console.log(`  ${scanComplete.slice(0, 400)}`);
    console.log('');
}

if (querPlannerLines.length > 0) {
    console.log('═══ QUERY PLANNING ═══');
    for (const line of querPlannerLines.slice(0, 3)) console.log(`  ${line.replace(/\\n/g, '\n  ').slice(0, 500)}`);
    console.log('');
}

if (otherLines.length > 0) {
    console.log('═══ ORCHESTRATOR ═══');
    for (const line of otherLines) console.log(`  ${line.slice(0, 300)}`);
    console.log('');
}

if (sourceLines.length > 0) {
    console.log('═══ SOURCE FETCHES ═══');
    for (const line of sourceLines.slice(0, 60)) console.log(`  ${line.slice(0, 200)}`);
    console.log('');
}

if (errorLines.length > 0) {
    console.log(`═══ ERRORS / SKIPS (${errorLines.length}) ═══`);
    // Group by error pattern
    const grouped = {};
    for (const line of errorLines) {
        const sig = line.replace(/"[^"]*"/g, '"X"').slice(0, 100);
        grouped[sig] = (grouped[sig] || 0) + 1;
    }
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    for (const [sig, count] of sorted.slice(0, 20)) {
        console.log(`  [${count}x] ${sig}`);
    }
    console.log('');
}

console.log('═══ DONE ═══');
