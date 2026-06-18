/**
 * Integration test for the pgvector embedding cache + semantic re-rank.
 * Run: DATABASE_URL=... OPENAI_API_KEY=... node test/embedding-rerank.mjs
 */
import { getJobEmbeddings, getRoleEmbedding, jobKey } from '../lib/job-embeddings.js';
import { cosineSimilarity } from '../lib/embeddings.js';
import { query } from '../lib/db.js';

const profile = {
    headline: 'Senior Customer Success Manager',
    skills: ['SaaS onboarding', 'churn reduction', 'Gainsight', 'QBRs', 'account expansion'],
    whatIDo: 'I own enterprise SaaS accounts post-sale, drive adoption and renewals, and reduce churn.',
    industry: 'B2B SaaS',
};

const jobs = [
    { title: 'Customer Success Manager', company: 'Acme SaaS', apply_url: 'http://x/1',
      description: 'Own a book of enterprise accounts, drive product adoption, run QBRs, reduce churn and grow renewals.' },
    { title: 'Senior Backend Engineer', company: 'DataCorp', apply_url: 'http://x/2',
      description: 'Build distributed systems in Go and Rust, design APIs, optimize Postgres, own service reliability.' },
    { title: 'Account Manager, Enterprise', company: 'CloudCo', apply_url: 'http://x/3',
      description: 'Manage strategic customer relationships, upsell, handle renewals and expansion for SaaS platform.' },
];

let failures = 0;
const check = (name, cond) => { console.log(`${cond ? '✅' : '❌'} ${name}`); if (!cond) failures++; };

console.log('\n─── Run 1 (cold cache) ───');
const t1 = Date.now();
const roleEmb = await getRoleEmbedding(profile, 'test_user_emb');
const embMap = await getJobEmbeddings(jobs);
console.log(`  took ${Date.now() - t1}ms`);

check('role embedding returned (1536-dim)', Array.isArray(roleEmb) && roleEmb.length === 1536);
check('all 3 job embeddings returned', embMap.size === 3);

const sims = jobs.map((j) => ({ title: j.title, sim: cosineSimilarity(roleEmb, embMap.get(jobKey(j))) }));
sims.forEach((s) => console.log(`  sim(${s.title}) = ${s.sim?.toFixed(3)}`));

const csm = sims[0].sim, eng = sims[1].sim, am = sims[2].sim;
check('CSM job more similar than Backend Engineer', csm > eng);
check('Account Manager more similar than Backend Engineer', am > eng);
check('relevant roles clear the 0.25 floor', csm > 0.25 && am > 0.25);

console.log('\n─── Run 2 (warm cache — should hit pgvector, no API) ───');
const t2 = Date.now();
const embMap2 = await getJobEmbeddings(jobs);
const dt2 = Date.now() - t2;
console.log(`  took ${dt2}ms`);
check('warm run returns all 3', embMap2.size === 3);
check('warm run is fast (<800ms, cache hit not API)', dt2 < 800);

const rows = await query('SELECT count(*)::int AS n FROM job_embeddings');
console.log(`\n  job_embeddings rows in DB: ${rows[0]?.n}`);
check('embeddings persisted to pgvector', (rows[0]?.n ?? 0) >= 3);

// cleanup test rows
await query("DELETE FROM job_embeddings WHERE job_company IN ('Acme SaaS','DataCorp','CloudCo')");
await query("DELETE FROM profiles WHERE user_id = 'test_user_emb'");
await query("DELETE FROM users WHERE id = 'test_user_emb'");

console.log(`\n═══ RESULTS: ${failures === 0 ? 'ALL PASS' : failures + ' FAILED'} ═══`);
process.exit(failures === 0 ? 0 : 1);
