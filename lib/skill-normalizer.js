// =============================================================================
// MIDAS SKILL NORMALIZER
// =============================================================================
// Converts verbose, multi-word professional skills into short, atomic search
// keywords that produce better job API results.
//
// Pipeline:
//   Resume Parser → skills[] → normalizeSkillsForSearch() → search_keywords[]
//   search_keywords[] → buildQueries() → SerpAPI/JSearch
//
// Design:
//   1. Static abbreviation lookup (200+ mappings, zero latency, zero cost)
//   2. Atomizer: splits multi-word skills into searchable components
//   3. Deduplication + priority ordering (short terms first)
// =============================================================================

// ---------------------------------------------------------------------------
// ABBREVIATION LOOKUP — Industry-standard short forms
// Map: lowercase long form → short search keyword
// ---------------------------------------------------------------------------

const ABBREVIATIONS = {
    // --- Customer Experience / Success ---
    'customer experience': 'CX',
    'customer success': 'CS',
    'customer support': 'support',
    'customer service': 'support',
    'customer onboarding': 'onboarding',
    'customer operations': 'CX ops',
    'customer engagement': 'engagement',
    'customer retention': 'retention',
    'client success': 'CS',
    'client experience': 'CX',
    'client management': 'account management',
    'client onboarding': 'onboarding',
    'user experience': 'UX',
    'user interface': 'UI',
    'user research': 'UX research',

    // --- Business / Domain ---
    'business to business': 'b2b',
    'business-to-business': 'b2b',
    'business to consumer': 'b2c',
    'business-to-consumer': 'b2c',
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
    'multi factor authentication': 'MFA',
    'two-factor authentication': '2FA',
    'role-based access control': 'RBAC',
    'security information and event management': 'SIEM',
    'data loss prevention': 'DLP',
    'penetration testing': 'pentest',
    'vulnerability assessment': 'vulnerability',
    'identity troubleshooting': 'identity',
    'authentication & access resolution': 'SSO',
    'authentication and access resolution': 'SSO',
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
    'product lifecycle management': 'PLM',
    'software development lifecycle': 'SDLC',
    'software development life cycle': 'SDLC',
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
    'supply chain management': 'supply chain',
    'supply chain': 'supply chain',
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
    'financial planning and analysis': 'FP&A',
    'financial planning': 'FP&A',
    'accounts payable': 'AP',
    'accounts receivable': 'AR',
    'general ledger': 'GL',
    'financial reporting': 'finance',

    // --- SaaS-specific ---
    'platform administration': 'platform admin',
    'platform management': 'platform',
    'cx tool ownership': 'CX tools',
    'enterprise software': 'enterprise',
    'enterprise customer management': 'enterprise CS',
    'saas support operations': 'SaaS ops',
    'saas operations': 'SaaS ops',
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
    'ai document automation': 'AI automation',
    'streaming media qa': 'QA',
    'streaming media': 'streaming',
    'streaming media quality assurance': 'QA',
    'video encoding': 'video',
    'video transcoding': 'video',

    // --- Tools (common verbose → short) ---
    'google analytics': 'GA',
    'google ads': 'Google Ads',
    'facebook ads': 'Meta Ads',
    'microsoft teams': 'Teams',
    'microsoft office': 'Office',
    'visual studio code': 'VS Code',
    'amazon s3': 'S3',
    'amazon ec2': 'EC2',
    'amazon dynamodb': 'DynamoDB',
    'slack connect': 'Slack',
};

// ---------------------------------------------------------------------------
// TOOL KEYWORDS — Already short, these should be kept as-is
// (Used by the atomizer to avoid splitting known tools)
// ---------------------------------------------------------------------------

const KNOWN_SHORT_TERMS = new Set([
    // Identity / Auth
    'okta', 'auth0', 'onelogin', 'ping', 'saml', 'sso', 'scim', 'oauth', 'ldap', 'mfa', 'iam',
    // CX / Support tools
    'zendesk', 'freshdesk', 'intercom', 'hubspot', 'salesforce', 'gainsight', 'totango',
    'freshworks', 'servicenow', 'jira', 'confluence', 'asana', 'monday', 'notion',
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
    // Misc
    'fintech', 'healthtech', 'edtech', 'proptech', 'insurtech', 'martech', 'adtech',
    'blockchain', 'crypto', 'defi', 'web3', 'nft', 'metaverse',
    'automation', 'onboarding', 'retention', 'churn', 'upsell', 'renewal',
    'integration', 'migration', 'deployment', 'monitoring', 'troubleshooting',
]);

// ---------------------------------------------------------------------------
// Stopwords — never emit these as standalone search keywords
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
    'and', 'or', 'the', 'for', 'with', 'from', 'into', 'through', 'using',
    'based', 'driven', 'focused', 'oriented', 'level', 'management', 'process',
    'tools', 'systems', 'platform', 'service', 'services', 'solution', 'solutions',
]);

// ---------------------------------------------------------------------------
// Core: Normalize a single skill into search keywords
// Returns an array of 1+ short keywords for this skill
// ---------------------------------------------------------------------------

function normalizeSkill(skill) {
    if (!skill || typeof skill !== 'string') return [];

    const lower = skill.toLowerCase().trim();
    if (!lower) return [];

    // 1. If it's already a known short tool/term, keep it
    if (KNOWN_SHORT_TERMS.has(lower)) return [skill.trim()];

    // 2. Check the abbreviation lookup
    if (ABBREVIATIONS[lower]) return [ABBREVIATIONS[lower]];

    // 3. If it's short enough already (≤ 2 words, ≤ 15 chars), keep it
    const words = lower.split(/\s+/);
    if (words.length <= 2 && lower.length <= 15) return [skill.trim()];

    // 4. Atomize: split multi-word skill into meaningful sub-parts
    const result = [];

    // Check if any subphrase matches abbreviations
    for (let len = words.length; len >= 2; len--) {
        for (let i = 0; i <= words.length - len; i++) {
            const phrase = words.slice(i, i + len).join(' ');
            if (ABBREVIATIONS[phrase]) {
                result.push(ABBREVIATIONS[phrase]);
            }
        }
    }

    // Extract individual words that are known terms
    for (const word of words) {
        if (KNOWN_SHORT_TERMS.has(word)) {
            result.push(word);
        }
    }

    // If we found matches, deduplicate and return
    if (result.length > 0) {
        return [...new Set(result)];
    }

    // 5. Fallback: keep the most meaningful word (longest non-stopword)
    const meaningful = words
        .filter(w => !STOPWORDS.has(w) && w.length > 2)
        .sort((a, b) => b.length - a.length);

    return meaningful.length > 0 ? [meaningful[0]] : [skill.trim()];
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
