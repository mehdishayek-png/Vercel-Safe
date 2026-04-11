#!/usr/bin/env node
/**
 * Pull match-debug logs from the production /api/debug/match-logs ring buffer
 * and append them to logs/matches/YYYY-MM-DD.jsonl on local disk.
 *
 * Usage:
 *   node scripts/pull-match-logs.mjs                       # default: midasmatch.com, drain
 *   node scripts/pull-match-logs.mjs --base=http://localhost:3000
 *   node scripts/pull-match-logs.mjs --no-drain            # peek without clearing
 *
 * Env:
 *   MATCH_LOGS_TOKEN — must match the value set in Vercel for /api/debug/match-logs
 */

import { mkdir, appendFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const args = process.argv.slice(2);
const base = args.find(a => a.startsWith('--base='))?.split('=')[1] || 'https://midasmatch.com';
const drain = !args.includes('--no-drain');
const token = process.env.MATCH_LOGS_TOKEN || '';

const url = `${base}/api/debug/match-logs${drain ? '?drain=1' : ''}`;
console.log(`Pulling match logs from ${url}`);

let res;
try {
    res = await fetch(url, {
        headers: token ? { 'x-debug-token': token } : {},
    });
} catch (err) {
    console.error('Fetch failed:', err.message);
    process.exit(1);
}

if (!res.ok) {
    console.error(`HTTP ${res.status}: ${await res.text()}`);
    process.exit(1);
}

const { count, entries } = await res.json();
console.log(`Got ${count} entries.`);

if (count === 0) process.exit(0);

// Group by UTC date so each day's entries land in the correct file
const byDay = new Map();
for (const entry of entries) {
    const day = (entry.ts || new Date().toISOString()).slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(entry);
}

const dir = resolve(process.cwd(), 'logs', 'matches');
await mkdir(dir, { recursive: true });

for (const [day, list] of byDay) {
    const file = join(dir, `${day}.jsonl`);
    const body = list.map(e => JSON.stringify(e)).join('\n') + '\n';
    await appendFile(file, body, 'utf8');
    console.log(`  +${list.length} → ${file}`);
}

console.log('Done.');
