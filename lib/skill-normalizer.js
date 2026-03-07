// =============================================================================
// MIDAS SKILL NORMALIZER — v2 (Aggressive Atomization)
// =============================================================================
// Converts verbose, multi-word professional skills into short, atomic search
// keywords that produce better job API results.
//
// Pipeline:
//   Resume Parser → skills[] → normalizeSkillsForSearch() → search_keywords[]
//   search_keywords[] → buildQueries() → SerpAPI/JSearch
//
// Three-tier normalization:
//   1. COMPOUND_BREAKDOWNS: multi-word phrases → multiple atomic terms
//   2. ABBREVIATIONS: long forms → industry-standard short forms
//   3. Atomizer: auto-splits unknowns, strips generic modifiers
// =============================================================================

// ---------------------------------------------------------------------------
// COMPOUND BREAKDOWNS — phrases that split into MULTIPLE atomic terms
// These return arrays, not single strings
// ---------------------------------------------------------------------------

const COMPOUND_BREAKDOWNS = {
    'authentication & access resolution': ['SSO', 'authentication', 'IAM'],
    'authentication and access resolution': ['SSO', 'authentication', 'IAM'],
    'ticket workflow management': ['ticketing', 'workflow'],
    'streaming media qa': ['streaming', 'QA'],
    'streaming media quality assurance': ['streaming', 'QA'],
    'ai document automation': ['AI', 'automation'],
    'cx tool ownership': ['CX'],
    'identity troubleshooting': ['IAM', 'troubleshooting'],
    'b2b saas': ['B2B', 'SaaS'],
    'saas b2b': ['SaaS', 'B2B'],
    'enterprise software': ['enterprise', 'SaaS'],
    'slack connect': ['Slack'],
    'customer onboarding': ['onboarding'],
    'process documentation': ['documentation'],
    'cross-functional collaboration': [],  // SKIP — too generic
    'stakeholder communication': [],       // SKIP
    'stakeholder management': [],          // SKIP
    'cross functional': [],                // SKIP
    'effective communication': [],         // SKIP
    'interpersonal skills': [],            // SKIP
    'team collaboration': [],              // SKIP
    'problem solving': [],                 // SKIP
    'time management': [],                 // SKIP
    'attention to detail': [],             // SKIP
    'critical thinking': [],               // SKIP
    'saas support operations': ['SaaS', 'CX ops'],
    'enterprise customer management': ['enterprise', 'CS'],
    'platform administration': ['platform admin'],
    'cx platform management': ['CX'],
    'zendesk administration': ['Zendesk'],
    'okta administration': ['Okta', 'IAM'],
    'identity management': ['IAM'],
    'access control management': ['IAM', 'RBAC'],
    'api integration management': ['API', 'integration'],
    'workflow automation management': ['automation', 'workflow'],
    'data analysis and reporting': ['data analysis', 'analytics'],
    'customer relationship management software': ['CRM'],
    'information technology service management': ['ITSM'],
    'agile project management': ['Agile', 'project management'],
    'cloud infrastructure management': ['cloud', 'infrastructure'],
    'continuous integration and delivery': ['CI/CD'],
    'continuous integration continuous deployment': ['CI/CD'],
    'machine learning and ai': ['ML', 'AI'],
    'artificial intelligence and machine learning': ['AI', 'ML'],
    'full stack web development': ['fullstack', 'web dev'],
    'human resources management': ['HR'],
    'supply chain management': ['supply chain'],
    'digital marketing strategy': ['digital marketing'],
    'social media management': ['social media'],
    'content management and strategy': ['CMS', 'content'],
    'financial planning and analysis': ['FP&A'],
    'business development and sales': ['BD', 'sales'],
    'user experience design': ['UX', 'design'],
    'user interface design': ['UI', 'design'],
    'product lifecycle management': ['PLM'],
    'software development lifecycle': ['SDLC'],
    'quality assurance and testing': ['QA', 'testing'],
    'security information event management': ['SIEM'],
    'role based access control': ['RBAC'],
    'multi factor authentication': ['MFA'],
};

// ---------------------------------------------------------------------------
// ABBREVIATION LOOKUP — long form → single short keyword
// ---------------------------------------------------------------------------

const ABBREVIATIONS = {
    // --- Customer Experience / Success ---
    'customer experience': 'CX',
    'customer success': 'CS',
    'customer support': 'support',
    'customer service': 'support',
    'customer operations': 'CX ops',
    'customer engagement': 'engagement',
    'customer retention': 'retention',
    'customer advocacy': 'CX advocacy',
    'client success': 'CS',
    'client experience': 'CX',
    'client management': 'account management',
    'client onboarding': 'onboarding',
    'user experience': 'UX',
    'user interface': 'UI',
    'user research': 'UX research',

    // --- Business / Domain ---
    'business to business': 'B2B',
    'business-to-business': 'B2B',
    'business to consumer': 'B2C',
    'business-to-consumer': 'B2C',
    'software as a service': 'SaaS',
    'software-as-a-service': 'SaaS',
    'artificial intelligence': 'AI',
    'machine learning': 'ML',
    'deep learning': 'DL',
    'natural language processing': 'NLP',
    'computer vision': 'CV',
    'large language model': 'LLM',
    'large language models': 'LLM',
    'generative ai': 'GenAI',
    'applied ai': 'AI',
    'robotic process automation': 'RPA',
    'internet of things': 'IoT',
    'augmented reality': 'AR',
    'virtual reality': 'VR',

    // --- Engineering / Dev ---
    'software engineering': 'SWE',
    'software development': 'SWE',
    'full stack development': 'fullstack',
    'full-stack development': 'fullstack',
    'frontend development': 'frontend',
    'backend development': 'backend',
    'mobile development': 'mobile dev',
    'web development': 'web dev',
    'devops engineering': 'DevOps',
    'site reliability engineering': 'SRE',
    'site reliability': 'SRE',
    'quality assurance': 'QA',
    'quality engineering': 'QA',
    'test automation': 'QA automation',
    'continuous integration': 'CI/CD',
    'continuous delivery': 'CI/CD',
    'continuous deployment': 'CI/CD',
    'version control': 'git',
    'source control': 'git',

    // --- Identity / Security ---
    'single sign-on': 'SSO',
    'single sign on': 'SSO',
    'identity and access management': 'IAM',
    'identity access management': 'IAM',
    'multi-factor authentication': 'MFA',
    'two-factor authentication': '2FA',
    'role-based access control': 'RBAC',
    'security information and event management': 'SIEM',
    'data loss prevention': 'DLP',
    'penetration testing': 'pentest',
    'vulnerability assessment': 'vulnerability',
    'access management': 'IAM',

    // --- Data / Analytics ---
    'data analysis': 'data analysis',
    'data analytics': 'analytics',
    'data engineering': 'data engineering',
    'data science': 'data science',
    'data visualization': 'data viz',
    'data warehousing': 'data warehouse',
    'business intelligence': 'BI',
    'business analytics': 'analytics',
    'extract transform load': 'ETL',
    'key performance indicators': 'KPIs',
    'search engine optimization': 'SEO',
    'search engine marketing': 'SEM',
    'pay per click': 'PPC',
    'conversion rate optimization': 'CRO',
    'a/b testing': 'A/B testing',
    'root cause analysis': 'RCA',
    'trend analysis': 'analytics',

    // --- Cloud / Infra ---
    'amazon web services': 'AWS',
    'google cloud platform': 'GCP',
    'microsoft azure': 'Azure',
    'cloud infrastructure': 'cloud',
    'cloud computing': 'cloud',
    'cloud operations': 'cloud ops',
    'infrastructure as code': 'IaC',

    // --- Product / Project ---
    'product management': 'product management',
    'project management': 'project management',
    'program management': 'program management',
    'agile methodology': 'Agile',
    'agile methodologies': 'Agile',
    'scrum methodology': 'Scrum',
    'change management': 'change management',
    'release management': 'release',

    // --- Sales / Revenue ---
    'account management': 'account management',
    'account executive': 'AE',
    'business development': 'BD',
    'business development representative': 'BDR',
    'sales development representative': 'SDR',
    'customer relationship management': 'CRM',
    'annual recurring revenue': 'ARR',
    'monthly recurring revenue': 'MRR',
    'net promoter score': 'NPS',
    'customer satisfaction score': 'CSAT',
    'service level agreement': 'SLA',
    'service level agreements': 'SLA',
    'return on investment': 'ROI',
    'total cost of ownership': 'TCO',

    // --- HR / People ---
    'human resources': 'HR',
    'human resource': 'HR',
    'talent acquisition': 'recruiting',
    'talent management': 'talent',
    'employee experience': 'EX',
    'diversity equity inclusion': 'DEI',
    'diversity and inclusion': 'D&I',
    'learning and development': 'L&D',
    'performance management': 'performance',
    'employee engagement': 'engagement',

    // --- Operations ---
    'enterprise resource planning': 'ERP',
    'customer resource management': 'CRM',
    'process improvement': 'process improvement',
    'process automation': 'automation',
    'workflow automation': 'automation',
    'workflow management': 'workflow',
    'ticket workflow management': 'ticketing',
    'incident management': 'incident management',
    'problem management': 'ITIL',
    'knowledge management': 'knowledge base',
    'knowledge base management': 'knowledge base',
    'service management': 'ITSM',
    'it service management': 'ITSM',

    // --- Marketing / Content ---
    'content marketing': 'content',
    'content management': 'CMS',
    'content management system': 'CMS',
    'social media marketing': 'social media',
    'email marketing': 'email marketing',
    'digital marketing': 'digital marketing',
    'growth marketing': 'growth',
    'demand generation': 'demand gen',
    'lead generation': 'lead gen',
    'marketing automation': 'marketing automation',
    'public relations': 'PR',

    // --- Finance ---
    'accounts payable': 'AP',
    'accounts receivable': 'AR',
    'general ledger': 'GL',
    'financial reporting': 'finance',

    // --- SaaS-specific ---
    'platform management': 'platform',
    'technical troubleshooting': 'troubleshooting',
    'technical support': 'tech support',
    'technical account management': 'TAM',
    'technical account manager': 'TAM',
    'solutions architecture': 'solutions architect',
    'solutions engineering': 'solutions engineer',
    'system monitoring': 'monitoring',
    'system administration': 'sysadmin',
    'system integration': 'integration',
    'api integration': 'API',
    'api management': 'API',
    'integration management': 'integration',
    'document automation': 'automation',
    'video encoding': 'video encoding',
    'video transcoding': 'video',

    // --- Tools (verbose → short) ---
    'google analytics': 'GA',
    'google ads': 'Google Ads',
    'facebook ads': 'Meta Ads',
    'microsoft teams': 'Teams',
    'microsoft office': 'Office',
    'visual studio code': 'VS Code',
    'amazon s3': 'S3',
    'amazon ec2': 'EC2',
    'amazon dynamodb': 'DynamoDB',
};

// ---------------------------------------------------------------------------
// KNOWN SHORT TERMS — Already atomic, keep as-is
// ---------------------------------------------------------------------------

const KNOWN_SHORT_TERMS = new Set([
    // Identity / Auth
    'okta', 'auth0', 'onelogin', 'ping', 'saml', 'sso', 'scim', 'oauth', 'ldap', 'mfa', 'iam',
    // CX / Support tools
    'zendesk', 'freshdesk', 'intercom', 'hubspot', 'salesforce', 'gainsight', 'totango',
    'freshworks', 'servicenow', 'jira', 'confluence', 'asana', 'monday', 'notion', 'linear',
    // Automation / Integration
    'workato', 'zapier', 'tray.io', 'mulesoft', 'celigo', 'boomi', 'informatica',
    // Analytics
    'mixpanel', 'amplitude', 'segment', 'tableau', 'looker', 'metabase', 'grafana',
    'datadog', 'splunk', 'kibana', 'prometheus', 'pagerduty',
    // Cloud
    'aws', 'gcp', 'azure', 'heroku', 'vercel', 'netlify', 'docker', 'kubernetes', 'k8s',
    'terraform', 'ansible', 'jenkins', 'circleci', 'github', 'gitlab', 'bitbucket',
    // Languages / Frameworks
    'python', 'javascript', 'typescript', 'react', 'node', 'nextjs', 'vue', 'angular',
    'java', 'kotlin', 'swift', 'golang', 'rust', 'ruby', 'php', 'sql', 'nosql',
    'postgres', 'mongodb', 'redis', 'mysql', 'elasticsearch',
    // Industry terms (already short)
    'saas', 'ai', 'ml', 'b2b', 'b2c', 'cx', 'cs', 'ux', 'ui', 'hr', 'crm', 'erp',
    'api', 'sdk', 'cli', 'etl', 'rpa', 'nlp', 'llm', 'iot', 'sre', 'sla',
    'nps', 'csat', 'arr', 'mrr', 'kpi', 'roi', 'seo', 'sem', 'ppc',
    'agile', 'scrum', 'kanban', 'lean', 'devops', 'itil', 'itsm',
    // Domain keywords
    'fintech', 'healthtech', 'edtech', 'proptech', 'insurtech', 'martech', 'adtech',
    'blockchain', 'crypto', 'defi', 'web3', 'nft', 'metaverse',
    'automation', 'onboarding', 'retention', 'churn', 'upsell', 'renewal',
    'integration', 'migration', 'deployment', 'monitoring', 'troubleshooting',
    'ticketing', 'workflow', 'streaming', 'analytics', 'documentation',
]);

// ---------------------------------------------------------------------------
// GENERIC MODIFIERS — strip these from long skills to extract the real term
// ---------------------------------------------------------------------------

const GENERIC_MODIFIERS = new Set([
    'management', 'specialist', 'advanced', 'professional', 'comprehensive',
    'strategic', 'effective', 'expert', 'experienced', 'proficient',
    'strong', 'excellent', 'solid', 'proven', 'deep', 'extensive',
    'senior', 'junior', 'lead', 'skills', 'ability', 'knowledge',
]);

// ---------------------------------------------------------------------------
// SOFT SKILLS — always skip these entirely
// ---------------------------------------------------------------------------

const SOFT_SKILLS = new Set([
    'communication', 'leadership', 'teamwork', 'collaboration',
    'problem solving', 'problem-solving', 'critical thinking',
    'time management', 'attention to detail', 'interpersonal skills',
    'adaptability', 'flexibility', 'creativity', 'work ethic',
    'self-motivated', 'self motivated', 'detail oriented', 'detail-oriented',
    'multitasking', 'multi-tasking', 'organizational skills',
    'decision making', 'decision-making', 'conflict resolution',
    'emotional intelligence', 'negotiation skills',
]);

// ---------------------------------------------------------------------------
// Core: Normalize a single skill into search keywords
// Returns an array of 0+ short keywords
// ---------------------------------------------------------------------------

function normalizeSkill(skill) {
    if (!skill || typeof skill !== 'string') return [];

    const lower = skill.toLowerCase().trim();
    if (!lower || lower.length < 2) return [];

    // 0. Skip soft skills entirely
    if (SOFT_SKILLS.has(lower)) return [];

    // 1. Check COMPOUND_BREAKDOWNS first (returns multiple terms)
    if (COMPOUND_BREAKDOWNS[lower] !== undefined) {
        return COMPOUND_BREAKDOWNS[lower]; // may be empty [] for skipped skills
    }

    // 2. If it's already a known short tool/term, keep it
    if (KNOWN_SHORT_TERMS.has(lower)) return [skill.trim()];

    // 3. Check the abbreviation lookup (returns single term)
    if (ABBREVIATIONS[lower]) return [ABBREVIATIONS[lower]];

    // 4. If it's already short (≤ 2 words, ≤ 15 chars), keep it
    const words = lower.split(/[\s&+]+/).filter(w => w.length > 0);
    if (words.length <= 2 && lower.length <= 15) return [skill.trim()];

    // 5. Atomize: check subphrases for compound breakdowns / abbreviations
    const result = [];

    // Check longest subphrases first
    for (let len = Math.min(words.length, 4); len >= 2; len--) {
        for (let i = 0; i <= words.length - len; i++) {
            const phrase = words.slice(i, i + len).join(' ');
            if (COMPOUND_BREAKDOWNS[phrase] !== undefined) {
                result.push(...COMPOUND_BREAKDOWNS[phrase]);
            } else if (ABBREVIATIONS[phrase]) {
                result.push(ABBREVIATIONS[phrase]);
            }
        }
    }

    // Extract individual words that are known terms
    for (const word of words) {
        if (KNOWN_SHORT_TERMS.has(word) && !result.some(r => r.toLowerCase() === word)) {
            result.push(word);
        }
    }

    if (result.length > 0) {
        return [...new Set(result)];
    }

    // 6. Auto-split: strip generic modifiers from long skills
    if (words.length > 3) {
        const meaningful = words.filter(w => !GENERIC_MODIFIERS.has(w) && w.length > 2);
        if (meaningful.length > 0 && meaningful.length <= 3) {
            return [meaningful.join(' ')];
        }
        // Still too long — take the most specific word (longest non-modifier)
        meaningful.sort((a, b) => b.length - a.length);
        return meaningful.length > 0 ? [meaningful[0]] : [];
    }

    // 7. Default: return as-is for 1-3 word terms we don't recognize
    return [skill.trim()];
}

// ---------------------------------------------------------------------------
// Public API: Normalize an array of skills for search query generation
// ---------------------------------------------------------------------------

/**
 * Takes raw skills from the resume parser and produces short, atomic
 * search keywords optimized for SerpAPI/JSearch queries.
 *
 * @param {string[]} skills - Raw skills from resume parser
 * @returns {string[]} Deduplicated, priority-ordered search keywords
 */
export function normalizeSkillsForSearch(skills) {
    if (!Array.isArray(skills) || skills.length === 0) return [];

    const allKeywords = [];
    const seen = new Set();

    for (const skill of skills) {
        const normalized = normalizeSkill(skill);
        for (const keyword of normalized) {
            if (!keyword || keyword.length === 0) continue;
            const key = keyword.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                allKeywords.push(keyword);
            }
        }
    }

    // Priority sort: shorter terms first (they make better search queries)
    allKeywords.sort((a, b) => a.length - b.length);

    return allKeywords;
}

// ---------------------------------------------------------------------------
// Public API: Get the abbreviation for a single skill (for UI display)
// ---------------------------------------------------------------------------

export function abbreviateSkill(skill) {
    if (!skill) return skill;
    const lower = skill.toLowerCase().trim();
    if (COMPOUND_BREAKDOWNS[lower]) {
        const parts = COMPOUND_BREAKDOWNS[lower];
        return parts.length > 0 ? parts[0] : skill;
    }
    return ABBREVIATIONS[lower] || skill;
}

// ---------------------------------------------------------------------------
// Public API: Check if a skill is already atomic (no normalization needed)
// ---------------------------------------------------------------------------

export function isAtomicSkill(skill) {
    if (!skill) return false;
    const lower = skill.toLowerCase().trim();
    return KNOWN_SHORT_TERMS.has(lower) || lower.length <= 5;
}

// ---------------------------------------------------------------------------
// HIGH-VALUE TERMS — terms that produce the best search results
// These get a massive ranking bonus when selecting top-5
// ---------------------------------------------------------------------------

const HIGH_VALUE_TERMS = new Set([
    // Industry/Domain identifiers (these alone surface entire job categories)
    'cx', 'cs', 'saas', 'b2b', 'b2c', 'ai', 'ml', 'ux', 'ui', 'hr',
    'fintech', 'healthtech', 'edtech', 'martech', 'devops', 'sre',
    // Key tools (named platforms that appear in job titles)
    'okta', 'salesforce', 'zendesk', 'hubspot', 'jira', 'workato',
    'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform',
    'python', 'react', 'node', 'java', 'sql', 'tableau',
    // High-signal technicals
    'sso', 'saml', 'api', 'automation', 'integration', 'analytics',
    'onboarding', 'crm', 'erp', 'iam', 'scim', 'oauth',
    'agile', 'scrum', 'ci/cd', 'qa', 'etl', 'rpa',
]);

// ---------------------------------------------------------------------------
// Public API: Rank and select top N skills for search query generation
// ---------------------------------------------------------------------------

/**
 * Scores each search keyword by "search impact" and returns the top N.
 * Scoring factors:
 *   - Shorter terms score higher (they match more job postings)
 *   - Industry abbreviations (HIGH_VALUE_TERMS) get massive bonus
 *   - Named tools in KNOWN_SHORT_TERMS get bonus
 *   - Multi-word terms get penalized (noisy in queries)
 *
 * @param {string[]} keywords - Normalized search keywords
 * @param {number} topN - How many to return (default 5)
 * @returns {string[]} Top N keywords sorted by impact score
 */
export function rankSkillsForSearch(keywords, topN = 5) {
    if (!Array.isArray(keywords) || keywords.length === 0) return [];
    if (keywords.length <= topN) return keywords;

    const scored = keywords.map(kw => {
        const lower = kw.toLowerCase();
        let score = 0;

        // 1. Length bonus: shorter = better for search
        //    1-3 chars: +30, 4-5 chars: +25, 6-8: +15, 9+: +5
        if (kw.length <= 3) score += 30;
        else if (kw.length <= 5) score += 25;
        else if (kw.length <= 8) score += 15;
        else score += 5;

        // 2. High-value term bonus (industry identifiers, key tools)
        if (HIGH_VALUE_TERMS.has(lower)) score += 40;

        // 3. Known tool/platform bonus
        if (KNOWN_SHORT_TERMS.has(lower)) score += 20;

        // 4. Single-word bonus (no spaces = cleaner queries)
        if (!kw.includes(' ')) score += 10;

        // 5. Abbreviation/acronym bonus (all caps or mixed case ≤5 chars)
        if (kw.length <= 5 && kw === kw.toUpperCase()) score += 15;

        // 6. Penalty for generic terms that appear in too many jobs
        const GENERIC_PENALTY = ['jobs', 'work', 'role', 'position', 'team', 'company'];
        if (GENERIC_PENALTY.includes(lower)) score -= 50;

        return { keyword: kw, score };
    });

    // Sort by score descending, then by length ascending for tiebreakers
    scored.sort((a, b) => b.score - a.score || a.keyword.length - b.keyword.length);

    return scored.slice(0, topN).map(s => s.keyword);
}
