/**
 * PROJECT PANDA: Next-Generation Job Matching Engine
 * Inspired by Dota 2 balancing: Dynamic weighting, logarithmic decay, and exponential hard-counters.
 * This is an isolated experimental module.
 */

import { computeSemanticMatch, cosineSimilarity } from './embeddings.js';
import { SCORING_CONFIG } from './scoring-config.js';

// Word-boundary regex that works for skills starting/ending with non-alphanumeric chars
// (e.g. C++, C#, .NET). Standard \b fails because it requires an alphanumeric boundary.
function buildSkillBoundaryRegex(raw, escaped) {
    const leftBound = /^[a-zA-Z0-9_]/.test(raw) ? '\\b' : '(?<![a-zA-Z0-9_])';
    const rightBound = /[a-zA-Z0-9_]$/.test(raw) ? '\\b' : '(?![a-zA-Z0-9_])';
    return new RegExp(`${leftBound}${escaped}${rightBound}`);
}

// NEGATIVE KEYWORDS — auto-disqualify scam, irrelevant, or unreachable roles
const NEGATIVE_KEYWORDS = [
    // Too senior / C-suite (unreachable for most candidates)
    'ceo', 'cto', 'coo', 'cfo', 'founder', 'co-founder', 'vp of', 'vice president',
    // Unrelated domains
    'medical doctor', 'physician', 'surgeon', 'nurse practitioner',
    'truck driver', 'delivery driver',
    'hair stylist', 'barber',
    // Sketchy / low-quality
    'crypto', 'nft', 'web3', 'blockchain engineer',
    'make money fast', 'work from home easy',
    'mlm', 'multi-level',
];

const PRESTIGIOUS_COMPANIES = [
    'google', 'apple', 'meta', 'amazon', 'netflix', 'microsoft', 'salesforce', 'adobe', 'intel', 'ibm', 'oracle', 'cisco', 'nvidia', 'tesla',
    'tcs', 'tata consultancy', 'infosys', 'wipro', 'hcl', 'tech mahindra', 'accenture', 'deloitte', 'pwc', 'ey', 'kpmg', 'capgemini', 'cognizant',
    'swiggy', 'zomato', 'flipkart', 'paytm', 'meesho', 'cred', 'razorpay', 'groww', 'zerodha', 'phonepe', 'stripe', 'uber', 'airbnb', 'spotify'
];

const NON_LATIN_REGEX = /[\u0600-\u06FF\u0400-\u04FF]/;
const SENIOR_REGEX = /\b(senior|lead|principal|vp|director|head|architect)\b/;
const MANAGER_REGEX = /\b(manager|supervisor)\b/;
const INTERN_REGEX = /\b(intern|internship|fresher|trainee|junior|entry)\b/;

// CITY ALIASES — canonical ↔ common/historical name pairs
const CITY_ALIASES = {
    'bengaluru': ['bangalore', 'bengaluru'],
    'bangalore': ['bangalore', 'bengaluru'],
    'mumbai': ['mumbai', 'bombay'],
    'bombay': ['mumbai', 'bombay'],
    'kolkata': ['kolkata', 'calcutta'],
    'calcutta': ['kolkata', 'calcutta'],
    'chennai': ['chennai', 'madras'],
    'madras': ['chennai', 'madras'],
    'gurgaon': ['gurgaon', 'gurugram'],
    'gurugram': ['gurgaon', 'gurugram'],
    'kochi': ['kochi', 'cochin'],
    'cochin': ['kochi', 'cochin'],
};

function cityMatchesInText(cityName, text) {
    if (!cityName) return false;
    const key = cityName.toLowerCase().trim();
    const aliases = CITY_ALIASES[key] || [key];
    return aliases.some(alias => text.includes(alias));
}

// ROLE DEPTH: Skills that indicate a strategic/technical role (not basic L1 support)
const DEPTH_INDICATORS = [
    'sso', 'saml', 'okta', 'workato', 'api', 'integration', 'implementation',
    'platform', 'enterprise', 'b2b', 'saas', 'automation', 'workflow',
    'onboarding', 'adoption', 'churn', 'retention', 'health score',
    'nps', 'csat', 'renewal', 'expansion', 'upsell', 'cross-sell',
    'zendesk', 'salesforce', 'hubspot', 'intercom', 'gainsight', 'totango',
    'jira', 'confluence', 'zapier', 'segment', 'mixpanel', 'amplitude',
    'aws', 'gcp', 'azure', 'terraform', 'docker', 'kubernetes',
    'sql', 'python', 'data pipeline', 'webhook', 'oauth', 'scim',
    'technical troubleshooting', 'solutions architect', 'pre-sales',
];

// NICHE TOOLS — specific platform/tool names that are highly job-defining.
// When matched, they get a significant bonus because they precisely identify role fit.
// Organized by career track / domain. ~300 entries across 25+ designations.
const NICHE_TOOLS = new Set([

    // ── Customer Success / CX ────────────────────────────────────
    'gainsight', 'totango', 'churnzero', 'planhat', 'vitally', 'custify',
    'clientsuccess', 'catalyst', 'strikedeck',
    'csat', 'nps', 'ces', 'customer effort score',
    'crm', 'customer relationship management',
    'zendesk', 'freshdesk', 'freshservice', 'helpscout', 'kayako',
    'zoho desk', 'happyfox', 'front app',

    // ── Sales & Revenue ──────────────────────────────────────────
    'salesforce', 'hubspot', 'pipedrive', 'zoho crm', 'close.com',
    'outreach', 'salesloft', 'gong', 'chorus', 'clari', 'aviso',
    'zoominfo', 'apollo', 'lusha', 'clearbit', 'seamless.ai',
    'cpq', 'salesforce cpq', 'dealhub', 'pandadoc', 'docusign',
    'highspot', 'seismic', 'showpad', 'mindtickle',

    // ── Marketing & Growth ───────────────────────────────────────
    'marketo', 'pardot', 'mailchimp', 'klaviyo', 'braze', 'iterable',
    'customer.io', 'activecampaign', 'convertkit', 'drip',
    'semrush', 'ahrefs', 'moz', 'screaming frog', 'surfer seo',
    'google ads', 'facebook ads', 'meta ads', 'tiktok ads',
    'hootsuite', 'sprout social', 'buffer', 'later', 'brandwatch',
    'unbounce', 'instapage', 'optimizely', 'vwo',
    'google analytics', 'hotjar', 'crazy egg', 'fullstory',
    'canva', 'adobe creative suite',

    // ── Product Management ───────────────────────────────────────
    'jira', 'confluence', 'asana', 'linear', 'notion', 'monday.com',
    'productboard', 'aha!', 'coda', 'shortcut', 'clickup',
    'pendo', 'appcues', 'userguiding', 'walkme', 'whatfix',
    'launchdarkly', 'split.io', 'statsig', 'flagsmith',

    // ── Design & UX ──────────────────────────────────────────────
    'figma', 'sketch', 'webflow', 'framer', 'adobe xd', 'invision',
    'zeplin', 'abstract', 'principle', 'protopie', 'axure',
    'miro', 'figjam', 'whimsical', 'balsamiq', 'lucidchart',
    'storybook', 'chromatic',
    'maze', 'usertesting', 'lookback', 'dovetail', 'optimal workshop',

    // ── Software Engineering ─────────────────────────────────────
    'react', 'angular', 'vue', 'svelte', 'next.js', 'nuxt',
    'node.js', 'express', 'fastify', 'nest.js',
    'django', 'flask', 'fastapi', 'spring boot', 'laravel', 'rails',
    'webpack', 'vite', 'esbuild', 'rollup', 'turbopack',
    'graphql', 'apollo', 'prisma', 'drizzle',
    'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra',
    'dynamodb', 'cockroachdb', 'supabase', 'firebase',
    'github', 'gitlab', 'bitbucket',

    // ── DevOps / SRE / Cloud ─────────────────────────────────────
    'terraform', 'pulumi', 'ansible', 'chef', 'puppet', 'crossplane',
    'kubernetes', 'docker', 'helm', 'istio', 'envoy', 'linkerd',
    'argocd', 'fluxcd', 'spinnaker', 'jenkins', 'circleci', 'github actions',
    'datadog', 'splunk', 'new relic', 'grafana', 'prometheus', 'dynatrace',
    'pagerduty', 'opsgenie', 'victorops',
    'aws', 'azure', 'gcp', 'google cloud',
    'cloudformation', 'cdk', 'bicep',
    'vault', 'consul', 'nomad',

    // ── Cybersecurity ────────────────────────────────────────────
    'crowdstrike', 'palo alto', 'fortinet', 'zscaler', 'checkpoint',
    'qualys', 'tenable', 'rapid7', 'nessus', 'burp suite',
    'splunk siem', 'sentinel', 'qradar', 'sumo logic', 'elastic siem',
    'okta', 'auth0', 'onelogin', 'cyberark', 'sailpoint',
    'snyk', 'sonarqube', 'veracode', 'checkmarx', 'aqua security',
    'wiz', 'orca security', 'lacework', 'prisma cloud',

    // ── Data Engineering & Analytics ─────────────────────────────
    'snowflake', 'databricks', 'dbt', 'fivetran', 'airbyte',
    'apache spark', 'apache kafka', 'apache flink', 'apache airflow',
    'redshift', 'bigquery', 'synapse',
    'tableau', 'looker', 'power bi', 'metabase', 'superset',
    'segment', 'mixpanel', 'amplitude', 'heap', 'posthog',
    'monte carlo', 'great expectations', 'atlan', 'alation',
    'stitch', 'talend', 'informatica', 'matillion',

    // ── AI / ML ──────────────────────────────────────────────────
    'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'hugging face',
    'openai', 'langchain', 'llamaindex', 'claude', 'cohere', 'anthropic',
    'mlflow', 'wandb', 'weights and biases', 'neptune', 'sagemaker',
    'vertex ai', 'azure ml', 'bedrock',
    'pinecone', 'weaviate', 'chromadb', 'qdrant', 'milvus',
    'chatbot', 'rasa', 'dialogflow', 'lex',

    // ── AI-Horizontal (tools used across ALL roles) ──────────────
    // The "AI for every job" wave — these identify candidates who actively
    // use AI tooling regardless of their core domain.
    'copilot', 'github copilot', 'cursor', 'tabnine', 'codeium',       // AI coding
    'jasper', 'copy.ai', 'writer.com', 'grammarly', 'wordtune',         // AI writing
    'midjourney', 'dall-e', 'stable diffusion', 'runway', 'pika',        // AI image/video
    'synthesia', 'heygen', 'descript', 'elevenlabs', 'murf',             // AI audio/video
    'otter.ai', 'fireflies', 'fathom', 'read.ai', 'grain',              // AI meeting notes
    'notion ai', 'glean', 'perplexity', 'you.com',                      // AI knowledge/search
    'zapier ai', 'bardeen', 'relay',                                     // AI-powered automation
    'beautiful.ai', 'gamma', 'tome',                                     // AI presentations
    'clay', 'lavender', 'regie.ai',                                      // AI sales/outreach

    // ── RPA / Process Automation ─────────────────────────────────
    // The backbone of operations/process automation roles.
    'uipath', 'automation anywhere', 'blue prism', 'power automate',
    'robocorp', 'electroneek', 'nintex', 'appian',
    'celonis', 'processgold', 'minit',                                   // Process mining
    'servicenow', 'bmc remedy', 'bmc helix',                             // ITSM/workflow
    'pega', 'outsystems', 'mendix', 'retool',                            // Low-code/no-code
    'airtable', 'smartsheet', 'basecamp',                                // Work management

    // ── QA / Testing ─────────────────────────────────────────────
    'selenium', 'cypress', 'playwright', 'appium', 'detox',
    'jest', 'mocha', 'pytest', 'junit', 'testng',
    'testrail', 'xray', 'zephyr', 'qase', 'allure',
    'browserstack', 'sauce labs', 'lambdatest',
    'postman', 'insomnia', 'k6', 'gatling', 'jmeter', 'locust',

    // ── Integration / iPaaS ──────────────────────────────────────
    'workato', 'zapier', 'mulesoft', 'boomi', 'tray.io', 'n8n', 'make.com',
    'celigo', 'snaplogic', 'jitterbit',

    // ── HR / People Ops / Recruiting ─────────────────────────────
    'greenhouse', 'lever', 'ashby', 'icims', 'jobvite', 'smartrecruiters',
    'workday', 'bamboohr', 'gusto', 'rippling', 'personio', 'hibob',
    'adp', 'successfactors', 'oracle hcm', 'ceridian', 'paylocity',
    'lattice', 'culture amp', '15five', 'betterworks', 'leapsome',
    'linkedin recruiter', 'gem', 'hireez', 'phenom',

    // ── Finance / Accounting ─────────────────────────────────────
    'quickbooks', 'xero', 'netsuite', 'sage', 'tally',
    'sap fico', 'oracle financials', 'workday financials',
    'bill.com', 'tipalti', 'coupa', 'concur',
    'blackline', 'floqast', 'zuora', 'chargebee', 'recurly',
    'bloomberg terminal', 'refinitiv', 'factset', 'capital iq',
    'anaplan', 'adaptive planning', 'vena', 'pigment',

    // ── Legal / Compliance ───────────────────────────────────────
    'westlaw', 'lexisnexis', 'practical law', 'fastcase',
    'clio', 'litify', 'smokeball', 'mycase',
    'ironclad', 'agiloft', 'icertis', 'contractpodai', 'juro',
    'relativity', 'logikcull', 'exterro',
    'onetrust', 'trustarc', 'bigid', 'securiti',
    'diligent', 'navex', 'convercent',

    // ── Supply Chain / Logistics ─────────────────────────────────
    'sap mm', 'sap ewm', 'oracle scm', 'blue yonder', 'manhattan associates',
    'kinaxis', 'o9 solutions', 'coupa', 'ariba', 'ivalua',
    'project44', 'fourkites', 'flexport', 'shipbob',
    'descartes', 'oracle transportation', 'sap tm',

    // ── Construction / Architecture / Real Estate ────────────────
    'revit', 'autocad', 'sketchup', 'navisworks', 'civil 3d',
    'procore', 'bluebeam', 'plangrid', 'buildertrend', 'coconstruct',
    'primavera', 'ms project', 'asta powerproject',
    'etabs', 'staad pro', 'tekla', 'robot structural',
    'yardi', 'appfolio', 'buildium', 'realpage', 'costar',
    'argus', 'dealpath', 'reonomy',

    // ── Manufacturing / Industrial ───────────────────────────────
    'solidworks', 'catia', 'siemens nx', 'ptc creo', 'inventor',
    'mastercam', 'fusion 360', 'onshape',
    'sap pp', 'sap qm', 'oracle manufacturing',
    'arena plm', 'teamcenter', 'windchill', 'enovia',
    'kepware', 'ignition', 'wonderware', 'aveva',

    // ── Healthcare / Pharma ──────────────────────────────────────
    'epic', 'cerner', 'meditech', 'athenahealth', 'allscripts',
    'veeva', 'iqvia', 'medidata', 'oracle health sciences',
    'philips hsdp', 'ge healthcare', 'siemens healthineers',
    'redcap', 'openspecimen', 'labvantage',

    // ── Education / EdTech ───────────────────────────────────────
    'canvas', 'moodle', 'blackboard', 'google classroom', 'd2l brightspace',
    'schoology', 'edmodo', 'seesaw', 'classdojo',
    'coursera', 'udemy', 'skillshare', 'teachable', 'thinkific',
    'articulate', 'captivate', 'camtasia', 'storyline',

    // ── Retail / E-commerce ──────────────────────────────────────
    'shopify', 'magento', 'woocommerce', 'bigcommerce', 'commercetools',
    'vtex', 'salesforce commerce cloud', 'sap commerce',
    'akeneo', 'salsify', 'syndigo', 'bazaarvoice',
    'returnly', 'narvar', 'aftership', 'loop returns',

    // ── Payments / FinTech ───────────────────────────────────────
    'stripe', 'razorpay', 'adyen', 'braintree', 'square',
    'plaid', 'marqeta', 'lithic', 'galileo',
    'checkout.com', 'mollie', 'paypal', 'wise',

    // ── Comms / Messaging ────────────────────────────────────────
    'twilio', 'sendgrid', 'vonage', 'bandwidth',
    'slack', 'microsoft teams', 'zoom', 'ringcentral',
    'intercom', 'drift', 'qualified', 'crisp',

    // ── Hosting / CDN / Edge ─────────────────────────────────────
    'vercel', 'netlify', 'cloudflare', 'fastly', 'akamai',
    'fly.io', 'render', 'railway', 'digitalocean',

    // ── Game Development ─────────────────────────────────────────
    'unity', 'unreal', 'godot', 'cocos2d', 'defold',
    'photon', 'playfab', 'gamesparks', 'nakama',
    'steamworks', 'epic online services',

    // ── Content / Media Production ───────────────────────────────
    'premiere pro', 'final cut', 'davinci resolve', 'after effects',
    'avid', 'pro tools', 'logic pro', 'ableton',
    'wordpress', 'contentful', 'strapi', 'sanity', 'ghost',
    'brightcove', 'vimeo ott', 'jwplayer', 'mux',

    // ── DevRel / Community ───────────────────────────────────────
    'orbit', 'common room', 'discourse', 'circle', 'bevy',
    'readme', 'gitbook', 'docusaurus', 'mintlify',
]);

// Job indicators that signal a basic/shallow support role
const SHALLOW_JOB_INDICATORS = [
    'call center', 'phone support', 'answering calls', 'responding to emails',
    'help desk', 'helpdesk', 'l1 support', 'tier 1', 'tier-1', 't1 support',
    'customer service representative', 'customer care executive',
    'inbound calls', 'outbound calls', 'telecaller', 'bpo',
    'chat support', 'email support', 'ticket resolution',
    'data entry', 'back office', 'voice process', 'non-voice process',
];

// ROLE FAMILY MAP: Groups of job titles that belong to the same career track.
// Skills and title must COMPLEMENT each other — sharing "okta" doesn't make
// a Staff Engineer a match for a Customer Experience Specialist.
const ROLE_FAMILIES = {
    engineering: ['software engineer', 'software developer', 'programmer', 'sde', 'swe', 'devops', 'sre', 'qa engineer', 'qe ', 'test engineer', 'fullstack', 'full stack', 'frontend engineer', 'backend engineer', 'iam engineer', 'technical support', 'it support', 'web developer', 'mobile developer', 'ios developer', 'android developer'],
    civil_engineering: ['civil engineer', 'structural engineer', 'site engineer', 'project engineer', 'geotechnical', 'construction engineer', 'architectural designer', 'site supervisor', 'quantity surveyor', 'design engineer', 'building engineer'],
    cx_support: ['customer experience', 'customer success', 'customer support', 'cx ', 'csm', 'support specialist', 'customer care', 'client success', 'customer operations', 'product support'],
    sales: ['sales', 'account executive', 'business development', 'bdr', 'sdr', 'sales engineer', 'revenue', 'lead generation', 'inside sales', 'outside sales'],
    data: ['data scientist', 'data analyst', 'data engineer', 'machine learning', 'ml engineer', 'ai engineer', 'analytics'],
    // gaming before design: 'game ' must fire before bare 'designer' for "Game Designer" titles
    gaming: ['game ', 'gaming', 'game designer', 'system designer', 'level designer', 'narrative designer', 'f2p', 'live ops', 'liveops', 'game economy', 'game ui', 'monetization designer', 'gameplay'],
    design: ['designer', 'ux ', 'ui ', 'product designer', 'graphic designer', 'visual designer'],
    product: ['product manager', 'product owner', 'program manager', 'scrum master'],
    // content/media defined before marketing so specific 'content producer'/'production manager'
    // terms here take precedence over the bare 'content' marketing keyword (iteration order matters).
    // content: ['content strategist', ...] moved up — see below
    marketing: ['marketing', 'growth', 'seo', 'brand'],
    // operations: pure business/supply-chain ops. 'workflow automation' and 'automation lead' removed —
    // they classify tech/cx automation roles into this family, causing false crossFamily penalties.
    operations: ['operations manager', 'ops manager', 'operations lead', 'operations specialist', 'operations analyst', 'supply chain', 'logistics', 'procurement', 'project coordinator', 'program coordinator', 'delivery coordinator', 'localization coordinator', 'post-production coordinator'],
    it_infra: ['incident manager', 'incident management', 'itil', 'service level', 'change manager', 'problem manager', 'it infrastructure', 'network engineer', 'system administrator', 'sysadmin', 'infrastructure'],
    process: ['lean', 'six sigma', 'process excellence', 'process improvement', 'quality manager', 'quality assurance manager', 'continuous improvement'],
    finance: ['accountant', 'finance', 'auditor', 'controller', 'bookkeeper'],
    recruiting: ['recruiting', 'recruiter', 'talent acquisition', 'hiring', 'staffing'],
    hr: ['human resources', 'hr ', 'people operations', 'employee relations', 'compensation'],
    // New families — previously unclassifiable, causing 0.65x penalty on good matches
    devrel: ['developer relations', 'devrel', 'developer advocate', 'developer evangelist', 'community manager', 'technical evangelist', 'community engineer'],
    // content/media: covers all content production, video production, and media operations roles.
    // 'production manager' and 'content producer' are standard titles in this space.
    content: ['content strategist', 'content creator', 'copywriter', 'content manager', 'technical writer', 'documentation engineer', 'content lead', 'content specialist', 'content writer', 'production manager', 'content producer', 'video producer', 'media producer', 'post-production', 'film producer', 'showrunner', 'assistant director', 'cinematographer', 'media operations'],
    solutions_architecture: ['solutions architect', 'solution engineer', 'presales', 'pre-sales', 'sales engineer', 'implementation engineer', 'solutions engineer', 'professional services', 'implementation consultant', 'technical account manager', 'tam '],
    product_marketing: ['product marketing', 'pmm ', 'go-to-market', 'gtm manager', 'product marketer', 'demand generation', 'field marketing'],
    legal_compliance: ['legal counsel', 'general counsel', 'paralegal', 'compliance officer', 'data protection', 'privacy officer', 'contract manager', 'legal ops'],
};

// ============================================
// DOMAIN SKILL CLUSTERS
// Instead of hardcoding role families for every industry, we detect domain
// from skills + JD keywords. Covers 100+ job roles across ~30 industries.
// A user and job that share ZERO clusters are in completely different worlds.
// ============================================
const DOMAIN_CLUSTERS = {
    // --- Tech & Engineering ---
    software_dev: [
        'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'golang', 'rust', 'php', 'swift', 'kotlin',
        'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring boot', 'laravel', '.net',
        'git', 'github', 'gitlab', 'ci/cd', 'jenkins', 'rest api', 'graphql', 'microservices', 'agile', 'scrum',
        'full stack', 'fullstack', 'frontend', 'backend', 'web development', 'mobile development', 'app development',
        'software engineer', 'software developer', 'programmer', 'coding', 'debugging', 'code review',
    ],
    devops_cloud: [
        'aws', 'azure', 'gcp', 'google cloud', 'terraform', 'ansible', 'puppet', 'chef', 'docker', 'kubernetes',
        'k8s', 'helm', 'istio', 'jenkins', 'circleci', 'github actions', 'cloudformation', 'serverless', 'lambda',
        'ec2', 's3', 'rds', 'ecs', 'eks', 'fargate', 'cloud infrastructure', 'infrastructure as code', 'iac',
        'linux', 'unix', 'bash', 'shell scripting', 'nginx', 'apache', 'monitoring', 'prometheus', 'grafana',
        'datadog', 'new relic', 'splunk', 'elk stack', 'logging', 'observability', 'sre', 'site reliability',
        'platform engineering', 'gitops', 'finops', 'chaos engineering', 'pulumi', 'crossplane', 'argocd', 'backstage', 'oci', 'digitalocean',
    ],
    cybersecurity: [
        'penetration testing', 'pentest', 'vulnerability', 'siem', 'firewall', 'ids', 'ips', 'soc',
        'incident response', 'threat intelligence', 'malware', 'forensics', 'encryption', 'cryptography',
        'owasp', 'nist', 'iso 27001', 'compliance', 'risk assessment', 'security audit', 'zero trust',
        'endpoint protection', 'network security', 'application security', 'devsecops', 'ciso', 'infosec',
    ],
    data_analytics: [
        'sql', 'python', 'r language', 'tableau', 'power bi', 'looker', 'data visualization', 'etl',
        'data warehouse', 'snowflake', 'redshift', 'bigquery', 'apache spark', 'hadoop', 'airflow',
        'data pipeline', 'data modeling', 'dbt', 'analytics', 'business intelligence', 'statistics',
        'a/b testing', 'hypothesis testing', 'regression', 'data mining', 'data analyst', 'data engineer',
    ],
    ml_ai: [
        'machine learning', 'deep learning', 'neural network', 'tensorflow', 'pytorch', 'keras', 'scikit-learn',
        'nlp', 'natural language processing', 'computer vision', 'reinforcement learning', 'llm', 'large language model',
        'transformers', 'bert', 'gpt', 'model training', 'model deployment', 'mlops', 'feature engineering',
        'recommendation system', 'classification', 'clustering', 'generative ai', 'ai engineer', 'ml engineer',
    ],
    qa_testing: [
        'selenium', 'cypress', 'playwright', 'jest', 'mocha', 'junit', 'testng', 'pytest', 'test automation',
        'manual testing', 'regression testing', 'integration testing', 'unit testing', 'load testing', 'jmeter',
        'postman', 'api testing', 'bug tracking', 'test plan', 'test case', 'quality assurance', 'qa engineer',
        'defect management', 'test strategy', 'performance testing', 'smoke testing', 'uipath',
    ],

    // --- Design & Creative ---
    ux_ui_design: [
        'figma', 'sketch', 'adobe xd', 'invision', 'zeplin', 'wireframe', 'prototype', 'user research',
        'usability testing', 'information architecture', 'interaction design', 'visual design', 'design system',
        'user interface', 'user experience', 'ux design', 'ui design', 'product design', 'responsive design',
        'accessibility', 'wcag', 'design thinking', 'persona', 'journey map', 'heuristic evaluation',
    ],
    graphic_creative: [
        'photoshop', 'illustrator', 'indesign', 'after effects', 'premiere pro', 'lightroom', 'canva',
        'coreldraw', 'blender', 'cinema 4d', 'motion graphics', 'video editing', 'animation', 'typography',
        'brand identity', 'logo design', 'print design', 'packaging design', 'art direction', 'storyboard',
        'color theory', 'layout design', 'creative direction', 'visual storytelling', 'illustration',
        'vfx', 'compositing', 'nuke', 'houdini', 'color grading', 'davinci resolve', 'signage', '3d modeling',
    ],

    // --- Construction, Architecture & Engineering ---
    construction_architecture: [
        'revit', 'autocad', 'sketchup', 'bim', 'building information modeling', 'civil 3d', 'navisworks',
        'primavera', 'ms project', 'procore', 'bluebeam', 'structural analysis', 'etabs', 'staad pro',
        'site planning', 'construction management', 'building code', 'blueprint', 'floor plan', 'elevation',
        'rebar', 'concrete', 'steel structure', 'formwork', 'scaffolding', 'excavation', 'foundation',
        'hvac', 'plumbing', 'electrical layout', 'mep', 'quantity surveying', 'bill of quantities', 'boq',
        'construction supervisor', 'site engineer', 'project engineer', 'general contractor', 'subcontractor',
        'workplace design', 'interior design', 'space planning', 'tenant improvement', 'fit-out', 'retrofit',
        'leed', 'green building', 'sustainability', 'facade', 'cladding', 'waterproofing', 'landscaping',
        'civil engineering', 'geotechnical', 'surveying', 'topography', 'grading', 'drainage',
        'rcc', 'bar bending', 'is codes', 'rics', 'cscs', 'cdm', 'chartered surveyor', 'osha', 'leed ap', 'aia', 'epc', 'estimating', 'cost engineering', 'topographic survey', 'pwc construction',
    ],

    // --- Manufacturing & Industrial ---
    manufacturing: [
        'lean manufacturing', 'six sigma', 'kaizen', 'kanban', '5s', 'tpm', 'oee',
        'cnc', 'cad/cam', 'plc', 'scada', 'automation', 'robotics', 'assembly line',
        'quality control', 'quality assurance', 'iso 9001', 'spc', 'fmea', 'root cause analysis',
        'production planning', 'capacity planning', 'work order', 'bom', 'bill of materials',
        'tooling', 'machining', 'welding', 'fabrication', 'casting', 'forging', 'injection molding',
        'supply chain', 'materials management', 'inventory control', 'mrp', 'erp', 'sap',
        'plant manager', 'production manager', 'process engineer', 'industrial engineer', 'manufacturing engineer',
        'injection molding', 'die casting', 'stamping', 'extrusion', 'cnc programming', 'factory inspector', 'gmp manufacturing', 'ppap', 'apqp', 'msme',
    ],

    // --- Healthcare & Medical ---
    healthcare: [
        'emr', 'ehr', 'hipaa', 'hl7', 'fhir', 'icd-10', 'epic', 'cerner', 'meditech',
        'patient care', 'clinical', 'diagnosis', 'treatment plan', 'nursing', 'pharmacy', 'radiology',
        'surgical', 'anesthesia', 'icu', 'emergency medicine', 'outpatient', 'inpatient', 'triage',
        'medical records', 'healthcare administration', 'hospital management', 'telemedicine',
        'physical therapy', 'occupational therapy', 'speech therapy', 'rehabilitation',
        'public health', 'epidemiology', 'biostatistics', 'health informatics',
        'registered nurse', 'nurse practitioner', 'physician assistant', 'medical assistant',
        'ayush', 'paramedic', 'emt', 'respiratory therapist', 'dental hygienist', 'optometrist', 'audiologist', 'radiographer', 'dha license', 'haad', 'prometric', 'asha worker', 'midwife', 'doula',
    ],
    pharma_biotech: [
        'gmp', 'gcp', 'glp', 'fda', 'ema', 'clinical trials', 'clinical research', 'drug development',
        'pharmacovigilance', 'regulatory affairs', 'cro', 'phase i', 'phase ii', 'phase iii',
        'bioequivalence', 'pharmacokinetics', 'toxicology', 'formulation', 'drug delivery',
        'biologics', 'biosimilar', 'gene therapy', 'cell therapy', 'immunology', 'oncology',
        'laboratory', 'hplc', 'mass spectrometry', 'chromatography', 'assay', 'biomarker',
        'quality control', 'batch record', 'validation', 'capa', 'deviation', 'sop',
    ],

    // --- Finance & Accounting ---
    finance_accounting: [
        'gaap', 'ifrs', 'financial modeling', 'dcf', 'valuation', 'excel', 'financial analysis',
        'balance sheet', 'income statement', 'cash flow', 'budgeting', 'forecasting', 'variance analysis',
        'accounts payable', 'accounts receivable', 'general ledger', 'journal entries', 'reconciliation',
        'tax preparation', 'tax planning', 'audit', 'internal audit', 'external audit', 'sox compliance',
        'quickbooks', 'xero', 'sage', 'netsuite', 'sap fico', 'tally', 'erp', 'invoicing',
        'cpa', 'cfa', 'acca', 'chartered accountant', 'bookkeeping', 'payroll', 'cost accounting',
        'treasury', 'risk management', 'portfolio management', 'investment banking', 'equity research',
        'ca', 'icai', 'cs', 'icsi', 'gst', 'tds', 'tally', 'acca', 'cima', 'aat', 'series 7', 'fp&a', 'forensic accounting', 'vat', 'zakat',
    ],
    banking_insurance: [
        'kyc', 'aml', 'anti money laundering', 'know your customer', 'loan processing', 'credit analysis',
        'underwriting', 'claims processing', 'actuarial', 'reinsurance', 'policy administration',
        'mortgage', 'retail banking', 'commercial banking', 'trade finance', 'forex', 'swift',
        'core banking', 'finacle', 'flexcube', 'temenos', 'payment processing', 'card services',
        'wealth management', 'private banking', 'asset management', 'mutual fund', 'derivatives',
        'basel', 'regulatory compliance', 'stress testing', 'liquidity', 'capital adequacy',
    ],

    // --- Sales & Business Development ---
    sales_bd: [
        'salesforce', 'hubspot', 'pipedrive', 'zoho crm', 'crm', 'pipeline management',
        'lead generation', 'cold calling', 'cold emailing', 'prospecting', 'outbound', 'inbound sales',
        'quota', 'territory', 'account executive', 'account management', 'client acquisition',
        'negotiation', 'closing', 'upselling', 'cross-selling', 'contract negotiation',
        'sales engineer', 'pre-sales', 'solution selling', 'consultative selling', 'meddic',
        'revenue', 'arr', 'mrr', 'deal desk', 'sales operations', 'sales enablement', 'commission',
    ],

    // --- Marketing & Growth ---
    marketing: [
        'seo', 'sem', 'google ads', 'facebook ads', 'meta ads', 'ppc', 'cpc', 'cpm', 'roas',
        'google analytics', 'ga4', 'gtm', 'tag manager', 'marketing automation', 'mailchimp',
        'hubspot', 'marketo', 'pardot', 'content marketing', 'copywriting', 'blog', 'social media',
        'brand strategy', 'brand management', 'public relations', 'pr', 'media buying', 'programmatic',
        'influencer marketing', 'affiliate marketing', 'email marketing', 'drip campaign', 'newsletter',
        'conversion rate optimization', 'cro', 'landing page', 'funnel', 'growth hacking', 'viral',
        'market research', 'competitive analysis', 'positioning', 'messaging', 'go-to-market', 'gtm strategy',
        'influencer marketing', 'product led growth', 'plg', 'whatsapp marketing', 'programmatic advertising', 'dsp', 'dmp', 'retail media', 'vernacular content',
    ],

    // --- Customer Support & Success ---
    cx_support: [
        'zendesk', 'freshdesk', 'intercom', 'helpscout', 'freshservice', 'ticketing system',
        'sla', 'csat', 'nps', 'first response time', 'resolution time', 'customer satisfaction',
        'escalation', 'troubleshooting', 'knowledge base', 'faq', 'self-service', 'chatbot',
        'onboarding', 'customer onboarding', 'adoption', 'churn', 'retention', 'health score',
        'customer success', 'customer experience', 'voice of customer', 'customer journey',
        'call center', 'contact center', 'ivr', 'omnichannel', 'live chat', 'phone support',
    ],

    // --- Salesforce / CRM Implementation ---
    // Distinct from sales_bd (which covers CRM as a sales tool).
    // This cluster covers Salesforce as a platform: admins, architects, developers.
    salesforce_crm: [
        'salesforce', 'sales cloud', 'service cloud', 'marketing cloud', 'experience cloud',
        'flow builder', 'process builder', 'soql', 'apex', 'lightning web component', 'lwc',
        'visualforce', 'salesforce dx', 'sfdx', 'salesforce inspector', 'data loader',
        'data import wizard', 'salesforce administrator', 'salesforce developer', 'salesforce architect',
        'permission sets', 'profiles', 'sharing settings', 'validation rules', 'approval processes',
        'web-to-case', 'email-to-case', 'web-to-lead', 'connected apps', 'change sets',
        'salesforce cpq', 'pardot', 'account engagement', 'salesforce integration',
        'salesforce solution', 'salesforce implementation', 'salesforce configuration',
    ],

    // --- Product Management ---
    product_management: [
        'product roadmap', 'user stories', 'sprint planning', 'backlog', 'prioritization',
        'product discovery', 'product strategy', 'okr', 'kpi', 'north star metric',
        'jira', 'confluence', 'asana', 'trello', 'linear', 'notion', 'productboard',
        'a/b testing', 'feature flag', 'mvp', 'product market fit', 'user feedback',
        'stakeholder management', 'product analytics', 'mixpanel', 'amplitude', 'segment',
        'product owner', 'product manager', 'product lead', 'product ops', 'scrum', 'safe',
    ],

    // --- HR & People Operations ---
    hr_people: [
        'recruiting', 'talent acquisition', 'sourcing', 'ats', 'greenhouse', 'lever', 'workday',
        'onboarding', 'offboarding', 'performance review', 'performance management', 'okr',
        'compensation', 'benefits', 'payroll', 'hris', 'bamboohr', 'adp', 'successfactors',
        'employee engagement', 'employee relations', 'diversity', 'dei', 'inclusion',
        'organizational development', 'change management', 'training', 'learning & development', 'l&d',
        'labor law', 'employment law', 'grievance', 'disciplinary', 'workforce planning', 'headcount',
    ],

    // --- Legal & Compliance ---
    legal: [
        'contract drafting', 'contract review', 'contract negotiation', 'legal research', 'litigation',
        'corporate law', 'intellectual property', 'trademark', 'patent', 'copyright',
        'regulatory compliance', 'gdpr', 'ccpa', 'data privacy', 'data protection',
        'mergers and acquisitions', 'm&a', 'due diligence', 'corporate governance',
        'paralegal', 'legal counsel', 'general counsel', 'arbitration', 'mediation', 'dispute resolution',
        'nda', 'sla', 'msa', 'terms of service', 'privacy policy', 'legal ops', 'clm',
    ],

    // --- Logistics & Supply Chain ---
    logistics_supply_chain: [
        'warehouse management', 'wms', 'tms', 'freight', 'shipping', 'customs', 'import', 'export',
        'last mile', 'fleet management', 'route optimization', 'dispatch', '3pl', 'fulfillment',
        'procurement', 'vendor management', 'purchase order', 'rfp', 'rfq', 'sourcing',
        'demand planning', 'demand forecasting', 'inventory management', 'safety stock', 'reorder point',
        'sap mm', 'sap wm', 'oracle scm', 'blue yonder', 'manhattan associates',
        'cold chain', 'perishable', 'hazmat', 'dangerous goods', 'incoterms', 'bill of lading',
    ],

    // --- Retail & E-commerce ---
    retail_ecommerce: [
        'pos', 'point of sale', 'inventory', 'merchandising', 'visual merchandising', 'planogram',
        'store operations', 'store manager', 'retail', 'shrinkage', 'loss prevention', 'footfall',
        'shopify', 'magento', 'woocommerce', 'bigcommerce', 'amazon seller', 'fba',
        'e-commerce', 'ecommerce', 'marketplace', 'product listing', 'catalog management',
        'order management', 'returns', 'refund', 'customer service', 'omnichannel retail',
        'category management', 'private label', 'buyer', 'wholesale', 'distribution',
        'd2c', 'direct to consumer', 'dropshipping', 'marketplace management', 'flipkart seller', 'amazon fba',
    ],

    // --- Education & Training ---
    education: [
        'curriculum', 'pedagogy', 'lesson plan', 'classroom', 'teaching', 'instructor', 'professor',
        'lms', 'moodle', 'canvas', 'blackboard', 'instructional design', 'e-learning', 'edtech',
        'assessment', 'grading', 'student engagement', 'academic', 'faculty', 'dean',
        'tutoring', 'mentoring', 'coaching', 'workshop facilitation', 'training delivery',
        'course development', 'learning objectives', 'bloom taxonomy', 'andragogy', 'microlearning',
        'special education', 'counseling', 'student affairs', 'admissions', 'enrollment',
        'cbse', 'icse', 'net exam', 'tet', 'b.ed', 'pgce', 'qts', 'ofsted', 'gcse', 'a levels', 'scorm', 'edtech',
    ],

    // --- Real Estate & Property ---
    real_estate: [
        'property management', 'leasing', 'tenant', 'landlord', 'rent', 'vacancy',
        'real estate', 'commercial real estate', 'residential', 'industrial property',
        'appraisal', 'valuation', 'mls', 'listing', 'brokerage', 'agent',
        'property inspection', 'maintenance', 'facilities management', 'capex', 'opex',
        'zoning', 'land use', 'building permit', 'title search', 'escrow', 'closing',
        'reit', 'real estate investment', 'asset management', 'portfolio management',
    ],

    // --- Hospitality & Food Service ---
    hospitality: [
        'hotel management', 'front desk', 'concierge', 'housekeeping', 'reservation',
        'revenue management', 'occupancy rate', 'adr', 'revpar', 'opera pms', 'property management system',
        'food and beverage', 'f&b', 'restaurant', 'catering', 'banquet', 'bar', 'sommelier',
        'guest experience', 'guest satisfaction', 'trip advisor', 'hospitality', 'tourism',
        'event management', 'event planning', 'conference', 'wedding planning', 'venue',
        'chef', 'kitchen', 'menu planning', 'food safety', 'haccp', 'health inspection',
    ],

    // --- Telecommunications ---
    telecom: [
        '5g', '4g', 'lte', 'rf engineering', 'radio frequency', 'antenna', 'base station',
        'fiber optic', 'ftth', 'pon', 'dwdm', 'mpls', 'sd-wan', 'voip', 'sip', 'pbx',
        'network planning', 'network optimization', 'drive test', 'oss', 'bss', 'nms',
        'telecom', 'telecommunications', 'mobile network', 'spectrum', 'tower', 'cell site',
        'ericsson', 'nokia', 'huawei', 'zte', 'qualcomm', 'cisco networking', 'juniper',
    ],

    // --- Energy & Utilities ---
    energy: [
        'solar', 'wind', 'renewable energy', 'photovoltaic', 'inverter', 'battery storage',
        'power grid', 'transmission', 'distribution', 'substation', 'transformer', 'switchgear',
        'scada', 'ems', 'dms', 'smart grid', 'smart meter', 'ami', 'demand response',
        'oil and gas', 'upstream', 'downstream', 'refinery', 'drilling', 'pipeline',
        'energy audit', 'energy efficiency', 'carbon footprint', 'emissions', 'esg',
        'power plant', 'turbine', 'generator', 'boiler', 'steam', 'thermal', 'hydro',
        'nuclear', 'lng', 'midstream', 'ev charging', 'battery storage', 'smart meter',
    ],

    // --- Agriculture ---
    agriculture: [
        'agronomy', 'crop', 'irrigation', 'fertilizer', 'pesticide', 'soil', 'harvest',
        'livestock', 'dairy', 'poultry', 'aquaculture', 'fishery', 'horticulture',
        'farm management', 'precision agriculture', 'drone', 'satellite imagery', 'gis',
        'seed', 'germination', 'yield', 'organic farming', 'sustainable agriculture',
        'agritech', 'agri-tech', 'food processing', 'cold storage', 'grain', 'commodity',
    ],

    // --- Government & Public Sector ---
    government: [
        'public policy', 'public administration', 'government', 'municipal', 'federal', 'state government',
        'grant writing', 'grant management', 'rfp response', 'public procurement', 'tender',
        'civil service', 'bureaucracy', 'legislation', 'regulatory', 'policy analysis',
        'urban planning', 'city planning', 'zoning', 'public works', 'transportation planning',
        'defense', 'military', 'intelligence', 'security clearance', 'classified',
    ],

    // --- Nonprofit & Social ---
    nonprofit: [
        'fundraising', 'grant management', 'donor relations', 'philanthropy', 'endowment',
        'community outreach', 'community development', 'social work', 'case management',
        'ngo', 'nonprofit', 'non-profit', 'charity', 'foundation', 'social enterprise',
        'program management', 'impact assessment', 'monitoring and evaluation', 'm&e',
        'volunteer management', 'advocacy', 'campaigning', 'grassroots', 'stakeholder engagement',
    ],

    // --- Automotive ---
    automotive: [
        'vehicle', 'automobile', 'automotive', 'car', 'truck', 'ev', 'electric vehicle',
        'engine', 'transmission', 'chassis', 'suspension', 'braking system', 'powertrain',
        'adas', 'autonomous driving', 'lidar', 'radar', 'sensor fusion', 'can bus', 'obd',
        'vehicle diagnostics', 'ecu', 'calibration', 'emission', 'homologation', 'crash test',
        'dealership', 'aftermarket', 'service center', 'body shop', 'paint', 'detailing',
    ],

    // --- Media & Entertainment ---
    media_entertainment: [
        'content creation', 'content strategy', 'editorial', 'journalism', 'reporting', 'newsroom',
        'video production', 'film', 'documentary', 'broadcast', 'streaming', 'ott',
        'podcast', 'audio engineering', 'sound design', 'music production', 'mixing', 'mastering',
        'publishing', 'editor', 'proofreading', 'copyediting', 'manuscript', 'book',
        'gaming', 'game design', 'game development', 'unity', 'unreal engine', 'esports',
        'social media management', 'community management', 'content moderation', 'creator economy',
        'podcasting', 'ott', 'content moderation', 'casting', 'talent management', 'scriptwriting', 'storyboarding', 'esports', 'voice acting', 'audiobook',
    ],

    // --- Consulting & Professional Services ---
    consulting: [
        'management consulting', 'strategy consulting', 'business consulting', 'advisory',
        'mckinsey', 'bain', 'bcg', 'deloitte consulting', 'accenture strategy', 'big four',
        'client engagement', 'stakeholder management', 'business case', 'roi analysis',
        'process improvement', 'business transformation', 'digital transformation', 'change management',
        'project management', 'pmp', 'prince2', 'pmo', 'program management', 'waterfall',
        'presentation', 'powerpoint', 'executive summary', 'deliverable', 'workstream',
    ],

    // --- Skilled Trades & Blue Collar ---
    skilled_trades: [
        'electrician', 'plumber', 'hvac', 'welding', 'welder', 'carpentry', 'carpenter', 'masonry', 'mason',
        'pipefitting', 'pipefitter', 'sheet metal', 'boilermaker', 'millwright', 'locksmith', 'glazier',
        'roofing', 'scaffolding', 'fire protection', 'elevator technician', 'refrigeration', 'iti',
        'journeyman', 'apprentice', 'trade certificate', 'nvq', 'city and guilds', 'wiring', 'conduit',
        'soldering', 'brazing', 'tig welding', 'mig welding', 'arc welding', 'hand tools', 'power tools',
    ],

    // --- Aviation & Maritime ---
    aviation_maritime: [
        'pilot', 'aviation', 'aircraft', 'flight engineer', 'air traffic control', 'aeronautical',
        'cabin crew', 'flight attendant', 'ground handling', 'airport operations', 'dgca', 'iata', 'icao',
        'maritime', 'merchant navy', 'marine engineer', 'ship captain', 'port operations', 'vessel',
        'seafarer', 'deck officer', 'navigation', 'admiralty', 'coast guard', '航空', 'shipping line',
        'cargo operations', 'aircraft maintenance', 'avionics', 'flight dispatch', 'airline operations',
    ],

    // --- Food & Beverage / Culinary ---
    food_beverage: [
        'chef', 'culinary', 'pastry', 'sous chef', 'executive chef', 'line cook', 'commis',
        'food technology', 'food safety', 'haccp', 'fssai', 'food processing', 'bakery', 'brewery',
        'sommelier', 'barista', 'catering', 'menu development', 'menu planning', 'recipe development',
        'kitchen management', 'food science', 'food quality', 'confectionery', 'butchery',
        'restaurant management', 'food handler', 'nutrition', 'dietitian', 'food service',
    ],

    // --- Fashion & Textiles ---
    fashion_textiles: [
        'fashion design', 'textile', 'garment', 'apparel', 'pattern making', 'draping', 'fashion buying',
        'knitwear', 'embroidery', 'dyeing', 'weaving', 'fashion illustration', 'couture', 'tailoring',
        'fabric sourcing', 'fashion retail', 'fashion merchandising', 'sewing', 'stitching',
        'fashion technology', 'clothing', 'fashion stylist', 'costume design', 'leather', 'footwear design',
        'clo3d', 'marvelous designer', 'fashion cad', 'textile engineering', 'loom', 'spinning',
    ],

    // --- Sports, Fitness & Wellness ---
    sports_fitness_wellness: [
        'fitness trainer', 'personal training', 'sports coaching', 'athletic director', 'strength and conditioning',
        'yoga instructor', 'yoga', 'pilates', 'sports management', 'kinesiology', 'wellness',
        'sports analytics', 'recreation', 'group fitness', 'sports medicine', 'exercise science',
        'referee', 'umpire', 'sports nutrition', 'physical education', 'gym', 'crossfit',
        'martial arts', 'swimming coach', 'cricket coach', 'football coach', 'tennis coach',
    ],

    // --- Environmental & Sustainability ---
    environmental_sustainability: [
        'environmental science', 'sustainability', 'waste management', 'recycling', 'ehs',
        'environmental compliance', 'carbon footprint', 'esg', 'climate', 'pollution control',
        'remediation', 'environmental impact', 'water treatment', 'sanitation', 'conservation',
        'ecology', 'biodiversity', 'wildlife', 'forestry', 'park ranger', 'marine biology',
        'environmental audit', 'iso 14001', 'emission', 'carbon credit', 'net zero',
    ],

    // --- Linguistics & Translation ---
    linguistics_translation: [
        'translation', 'interpreter', 'localization', 'transcription', 'subtitling', 'cat tools',
        'sdl trados', 'memsource', 'multilingual', 'language services', 'terminology',
        'proofreading', 'copyediting', 'linguistic qa', 'dubbing', 'technical writing',
        'documentation', 'content writing', 'l10n', 'i18n', 'globalization',
        'bilingual', 'simultaneous interpretation', 'consecutive interpretation', 'sign language',
    ],

    // --- Transport & Delivery / Gig Economy ---
    transport_delivery: [
        'truck driver', 'cdl', 'delivery rider', 'courier', 'ride hailing', 'last mile delivery',
        'fleet driver', 'driving instructor', 'forklift operator', 'chauffeur', 'dispatch',
        'hgv', 'lgv', 'commercial driving', 'taxi', 'bus driver', 'ambulance driver',
        'delivery executive', 'logistics rider', 'warehouse picker', 'packer', 'loading',
        'goods transport', 'moving company', 'relocation', 'bike messenger',
    ],

    // --- Social Services & Community ---
    social_services: [
        'social worker', 'counselor', 'case management', 'community development', 'child welfare',
        'family services', 'rehabilitation', 'substance abuse', 'crisis intervention', 'chaplain',
        'pastoral care', 'youth worker', 'outreach', 'shelter', 'probation officer',
        'refugee services', 'domestic violence', 'mental health counselor', 'grief counseling',
        'adoption', 'foster care', 'disability services', 'elder care', 'home care',
    ],

    // --- Physical Security & Investigation ---
    physical_security: [
        'security guard', 'loss prevention', 'cctv', 'surveillance', 'access control',
        'executive protection', 'private investigation', 'crowd management', 'fire safety',
        'security clearance', 'patrol', 'alarm systems', 'armed security', 'bouncer',
        'bodyguard', 'security officer', 'watchman', 'security supervisor', 'risk assessment',
        'event security', 'campus security', 'maritime security', 'asset protection',
    ],

    // --- Library, Museum & Heritage ---
    library_museum_heritage: [
        'librarian', 'archivist', 'curator', 'museum', 'cataloging', 'digital preservation',
        'collections management', 'exhibition', 'conservation', 'heritage', 'rare books',
        'taxonomy', 'metadata', 'gallery', 'cultural heritage', 'restoration',
        'archaeology', 'paleontology', 'anthropology', 'historical research', 'artifact',
    ],

    // --- Infrastructure as Code (separate from devops_cloud to avoid false overlaps) ---
    infrastructure_as_code: [
        'terraform', 'terragrunt', 'terraform cloud', 'pulumi', 'cdk', 'cloudformation',
        'ansible', 'puppet', 'chef', 'saltstack',
        'infrastructure as code', 'iac', 'gitops', 'argocd', 'flux', 'crossplane',
        'declarative infrastructure', 'immutable infrastructure', 'state management',
        'helm', 'kustomize', 'k8s manifests', 'kubernetes manifests',
    ],

    // --- APIs & Integrations ---
    apis_integrations: [
        'rest api', 'restful api', 'graphql', 'grpc', 'webhooks', 'api gateway',
        'api management', 'api design', 'openapi', 'swagger', 'api versioning',
        'integration platform', 'ipaas', 'zapier', 'workato', 'mulesoft', 'boomi',
        'tray.io', 'make.com', 'n8n', 'segment', 'fivetran', 'airbyte', 'stitch',
        'oauth', 'oauth2', 'openid connect', 'saml', 'sso', 'idp', 'identity provider',
        'api security', 'rate limiting', 'api documentation', 'postman', 'insomnia',
        'event driven', 'message queue', 'kafka', 'rabbitmq', 'pub/sub', 'webhook',
        'api integration', 'third party integration', 'platform integration',
    ],

    // --- Developer Experience (DevEx) ---
    developer_experience: [
        'developer experience', 'devex', 'dx', 'developer portal', 'developer platform',
        'sdk', 'developer tools', 'cli', 'developer onboarding', 'developer ecosystem',
        'documentation', 'technical documentation', 'api documentation', 'readme',
        'developer advocacy', 'devrel', 'developer relations', 'open source',
        'developer community', 'hackathon', 'technical writing',
    ],

    // --- Veterinary & Animal Care ---
    veterinary_animal: [
        'veterinarian', 'veterinary', 'animal care', 'pet care', 'dog grooming', 'kennel',
        'animal shelter', 'animal welfare', 'livestock', 'equine', 'avian', 'wildlife rescue',
        'pet shop', 'animal hospital', 'veterinary nurse', 'veterinary technician', 'zoology',
        'animal husbandry', 'dairy farm', 'poultry farm', 'aquarium', 'marine life',
    ],
};

// ── Ubiquity Index ────────────────────────────────────────────────────────────
// Built once at module load from DOMAIN_CLUSTERS.
// Maps each cluster keyword → how many distinct clusters it appears in.
// A keyword in 1 cluster = domain-exclusive (high signal, weight 1.0).
// A keyword in 3 clusters = cross-domain (low signal, weight 0.58).
// This is the IDF principle applied to domain clusters — no hardcoded term lists needed.
const TOKEN_CLUSTER_COUNT = (() => {
    const map = new Map();
    for (const tokens of Object.values(DOMAIN_CLUSTERS)) {
        for (const token of tokens) {
            map.set(token, (map.get(token) || 0) + 1);
        }
    }
    return map;
})();

/**
 * Returns ubiquity weight for a normalized skill string.
 * Looks up the skill token directly; falls back to substring scan if no exact hit.
 * weight = 1 / sqrt(clusterCount) — more clusters = weaker signal.
 * Skills not in any cluster are assumed domain-specific (unknown niche tool) → weight 1.0.
 */
function skillUbiquityFactor(skillNormalized) {
    // Exact lookup first (fast path — most cluster keywords are multi-word phrases)
    if (TOKEN_CLUSTER_COUNT.has(skillNormalized)) {
        return 1 / Math.sqrt(TOKEN_CLUSTER_COUNT.get(skillNormalized));
    }
    // Substring scan — skill may contain or be contained in a cluster keyword
    let maxUbiquity = 0;
    for (const [token, count] of TOKEN_CLUSTER_COUNT) {
        if (skillNormalized.includes(token) || token.includes(skillNormalized)) {
            maxUbiquity = Math.max(maxUbiquity, count);
        }
    }
    // Not in any cluster = unknown niche/role-specific term → treat as exclusive, full weight
    return maxUbiquity === 0 ? 1.0 : 1 / Math.sqrt(maxUbiquity);
}

/**
 * Detects which domain clusters a text (skills list or JD) belongs to.
 * Returns a Set of matching cluster names.
 *
 * Uses ubiquity-weighted hit scoring instead of raw hit counts:
 * each matching keyword contributes 1/ubiquity to the cluster score.
 * Cross-domain terms (sql, python, agile) that appear in many clusters
 * contribute fractional weight, so a cluster only fires if there is
 * genuine domain-specific evidence — not just generic terms that appear everywhere.
 *
 * weightThreshold=2.0 is equivalent to the old minHits=2 for exclusive tokens,
 * but much stricter for cross-domain ones (e.g. sql + python alone won't trigger
 * data_analytics for a job that is primarily a software engineering role).
 */
function detectDomainClusters(text, weightThreshold = 2.0) {
    const t = (text || '').toLowerCase();
    const matched = new Set();
    for (const [cluster, keywords] of Object.entries(DOMAIN_CLUSTERS)) {
        let weightedScore = 0;
        for (const kw of keywords) {
            // Short single-word terms (≤6 chars, no space) use word-boundary matching
            // to prevent 'ev' matching inside 'developer', 'car' inside 'scar', etc.
            const kwMatches = (!kw.includes(' ') && kw.length <= 6)
                ? new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t)
                : t.includes(kw);
            if (kwMatches) {
                const ubiquity = TOKEN_CLUSTER_COUNT.get(kw) || 1;
                weightedScore += 1 / ubiquity;
                if (weightedScore >= weightThreshold) {
                    matched.add(cluster);
                    break;
                }
            }
        }
    }
    return matched;
}

/**
 * Computes domain overlap between user profile and job.
 * Returns a multiplier:
 *   1.0+  = shared domain (slight buff if deep overlap)
 *   0.7   = no cluster detected for one side (uncertain — mild penalty)
 *   0.3   = both sides detected but ZERO overlap (confirmed mismatch — heavy penalty)
 */
function computeDomainMultiplier(profileSkills, profileTitle, jobTitle, jobSummary) {
    // Build text blobs for each side
    const userText = `${profileTitle} ${(profileSkills || []).join(' ')}`;
    const jobText = `${jobTitle} ${jobSummary}`;

    const userClusters = detectDomainClusters(userText, 2);
    const jobClusters = detectDomainClusters(jobText, 2);

    // Fallback: if either side hits zero clusters, we can't confirm a mismatch,
    // but we also can't confirm a match.
    // - userClusters empty: profile has no detectable domain (generic skills like Excel/coordination)
    //   → can't compare domains at all → neutral (1.0). Don't penalize all jobs.
    // - jobClusters empty but userClusters present: job has content but no detectable domain
    //   → mild penalty (0.75) if job has content; neutral (1.0) if title-only (no description).
    if (userClusters.size === 0) {
        return { multiplier: 1.0, reason: 'undetected', userClusters: [], jobClusters: [...jobClusters] };
    }
    if (jobClusters.size === 0) {
        const jobHasContent = jobSummary && jobSummary.trim().length >= 100;
        const multiplier = jobHasContent ? 0.75 : 1.0;
        return { multiplier, reason: 'undetected', userClusters: [...userClusters], jobClusters: [] };
    }

    // Check overlap
    const overlap = [...userClusters].filter(c => jobClusters.has(c));

    if (overlap.length > 0) {
        // Shared domain — slight buff for deep overlap (3+ shared clusters)
        const buff = overlap.length >= 3 ? SCORING_CONFIG.domain.matchBuff3plus : overlap.length >= 2 ? SCORING_CONFIG.domain.matchBuff2 : SCORING_CONFIG.domain.matchBuff1;
        return { multiplier: buff, reason: 'match', overlap, userClusters: [...userClusters], jobClusters: [...jobClusters] };
    }

    // Both sides detected, zero overlap = confirmed domain mismatch
    return { multiplier: SCORING_CONFIG.domain.mismatchPenalty, reason: 'mismatch', userClusters: [...userClusters], jobClusters: [...jobClusters] };
}

// Title abbreviation expansion — RapidFuzz token_set_ratio concept in JS.
// Expands shorthand before role family detection and title overlap scoring
// so "Sr. SWE" and "Senior Software Engineer" resolve to the same tokens.
const TITLE_ABBREVIATIONS = {
    'sr': 'senior', 'jr': 'junior',
    'eng': 'engineer', 'engr': 'engineer',
    'mgr': 'manager', 'dir': 'director',
    'dev': 'developer', 'arch': 'architect',
    'spec': 'specialist', 'coord': 'coordinator',
    'admin': 'administrator', 'ops': 'operations',
    'tech': 'technical', 'assoc': 'associate',
    'exec': 'executive', 'rep': 'representative',
    'swe': 'software engineer', 'sde': 'software development engineer',
    'tpm': 'technical program manager', 'em': 'engineering manager',
    'ic': 'individual contributor',
    'fe': 'frontend', 'be': 'backend', 'fs': 'fullstack',
    'infra': 'infrastructure', 'sec': 'security',
    'sys': 'systems', 'net': 'network',
    'biz': 'business', 'mktg': 'marketing',
    'prod': 'product', 'acct': 'account',
};

function expandAbbreviations(str) {
    return (str || '').toLowerCase()
        .replace(/\./g, '')  // strip periods: Sr. → sr
        .split(/[\s\-\/&,]+/)
        .map(token => TITLE_ABBREVIATIONS[token] || token)
        .join(' ');
}

/**
 * Detects which role family a title belongs to. Returns null if unclassifiable.
 * Short single-word keywords (≤8 chars, no space) use word-boundary matching to
 * prevent substring false positives — e.g. 'sales' matching 'salesforce',
 * 'data' matching 'database', 'hr' matching 'architecture'.
 * Multi-word phrases use plain includes (no boundary issues at phrase level).
 */
function detectRoleFamily(titleText) {
    const t = expandAbbreviations(titleText);
    for (const [family, keywords] of Object.entries(ROLE_FAMILIES)) {
        if (keywords.some(kw => {
            if (!kw.includes(' ') && kw.trim().length <= 8) {
                return new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t);
            }
            return t.includes(kw);
        })) return family;
    }
    return null;
}

/**
 * Normalizes text for matching
 */
function normalize(text) {
    return (text || '').toLowerCase().trim();
}

/**
 * Checks if a job contains negative keywords that should auto-disqualify it.
 * Short keywords (≤4 chars, e.g. "cto", "coo", "nft") use word-boundary matching
 * to prevent substring false positives like "cto" inside "sector" or "rector".
 */
function hasNegativeKeywords(text) {
    const lower = text.toLowerCase();
    return NEGATIVE_KEYWORDS.some(kw => {
        if (kw.length <= 4 && !kw.includes(' ')) {
            return new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower);
        }
        return lower.includes(kw);
    });
}

// Semantic embedding service moved to ./embeddings.js (uses computeSemanticMatch)

/**
 * Calculates a "Panda Score" for a single job match.
 */
export async function calculatePandaScore(job, profile, preferences = {}, apiKeys = {}) {
    const title = normalize(job.title);
    const summary = normalize(job.summary);
    const company = normalize(job.company);
    const location = normalize(job.location);
    const combined = `${title} ${summary} ${company} ${location}`;
    // Skill matching uses only title + first 800 chars of summary (no company name).
    // Excludes company name to prevent false positives where the company name is also
    // a skill (Salesforce, Stripe, Segment, etc.). Truncates description to exclude
    // boilerplate sections that mention skills the job doesn't actually require.
    const skillMatchText = `${title} ${summary.slice(0, 800)}`;
    // Original (non-normalized) text for case-sensitive skill matching.
    // Used for proper nouns — "Unity" (game engine) vs "team unity" (togetherness).
    const rawJobText = `${job.title || ''} ${(job.summary || '').slice(0, 800)}`;

    const targetTitle = normalize(profile.headline);
    const SENIORITY_TO_YEARS = { intern: 0, entry: 1, junior: 2, mid: 4, senior: 8, lead: 8, principal: 10, staff: 10, director: 12, vp: 15, 'c-level': 18 };
    const candidateYears = profile.experience_years || SENIORITY_TO_YEARS[normalize(profile.seniority)] || 0;

    // 1. DYNAMIC KEYWORD WEIGHTING (Information Density)
    let keywordScore = 0;

    // We map the skills to objects to preserve the original caps count BEFORE normalizing
    const skills = (profile.skills || []).map(s => ({
        raw: s,
        normalized: normalize(s),
        length: s.length,
        caps: (s.match(/[A-Z]/g)?.length || 0)
    }));

    let matchedCount = 0;
    const matchDetails = [];

    // Sort: depth-indicator (niche platform/tool) skills first so they consume the
    // high-value decay slots, then fall back to length for everything else.
    skills.sort((a, b) => {
        const aIsDepth = DEPTH_INDICATORS.some(d => a.normalized.includes(d));
        const bIsDepth = DEPTH_INDICATORS.some(d => b.normalized.includes(d));
        if (aIsDepth !== bIsDepth) return aIsDepth ? -1 : 1;
        return b.length - a.length;
    });

    // Skill synonym map — expands abbreviations to match job descriptions
    const SKILL_SYNONYMS = {
        // CX / CS
        'cx': ['customer experience', 'client experience'],
        'customer experience': ['cx'],
        'cs': ['customer success', 'client success'],
        'customer success': ['cs'],
        // Business
        'b2b': ['business to business', 'enterprise sales'],
        'b2c': ['business to consumer', 'consumer'],
        'saas': ['software as a service', 'cloud platform'],
        'crm': ['customer relationship management', 'salesforce', 'hubspot'],
        'pm': ['project management', 'product management'],
        // Design
        'ux': ['user experience'],
        'ui': ['user interface'],
        'uiux': ['user interface', 'user experience', 'ui/ux'],
        // AI/ML
        'ml': ['machine learning'],
        'ai': ['artificial intelligence'],
        'llm': ['large language model', 'generative ai'],
        'nlp': ['natural language processing'],
        // HR/Ops
        'hr': ['human resources', 'people operations'],
        'bi': ['business intelligence'],
        'erp': ['enterprise resource planning'],
        'etl': ['extract transform load', 'data pipeline'],
        'rpa': ['robotic process automation'],
        // Marketing
        'seo': ['search engine optimization'],
        'sem': ['search engine marketing', 'google ads', 'paid search'],
        'cro': ['conversion rate optimization'],
        'gtm': ['go to market', 'go-to-market'],
        // QA/Testing
        'qa': ['quality assurance', 'test automation', 'qe', 'quality engineering'],
        'quality assurance': ['qa', 'qe'],
        'test automation': ['qa', 'test engineer', 'sdet'],
        'sdet': ['test automation', 'qa automation', 'software development engineer in test'],
        // Roles
        'tam': ['technical account manager', 'account management'],
        'technical account manager': ['tam'],
        'bdr': ['business development', 'business development representative'],
        'sdr': ['sales development', 'sales development representative'],
        'devrel': ['developer relations', 'developer advocate'],
        'developer relations': ['devrel'],
        // Cloud
        'aws': ['amazon web services', 'amazon cloud'],
        'gcp': ['google cloud', 'google cloud platform'],
        'azure': ['microsoft azure', 'azure cloud'],
        // Dev
        'react': ['reactjs', 'react.js'],
        'vue': ['vuejs', 'vue.js'],
        'angular': ['angularjs', 'angular.js'],
        'node': ['node.js', 'nodejs'],
        'node.js': ['nodejs', 'node'],
        // DBs
        'postgres': ['postgresql'],
        'postgresql': ['postgres'],
        'mongo': ['mongodb'],
        'k8s': ['kubernetes', 'container orchestration'],
        'kubernetes': ['k8s'],
        // Identity
        'saml': ['sso', 'single sign-on', 'identity provider'],
        'oauth': ['oauth2', 'openid connect', 'authentication'],
        'iam': ['identity and access management', 'identity management'],
        // Data
        'dbt': ['data build tool', 'analytics engineering'],
        'etl': ['data pipeline', 'data integration'],
        // Finance
        'fp&a': ['financial planning', 'financial analysis', 'forecasting'],
        // Project management
        'pmp': ['project management professional', 'project management'],
        'scrum': ['agile', 'sprint planning'],
        // General
        'api': ['rest api', 'restful api', 'api integration', 'api development'],
        'ci/cd': ['continuous integration', 'continuous deployment', 'devops pipeline'],
    };

    for (const skill of skills) {
        // Word-boundary matching for single-word skills to prevent false positives.
        // Multi-word skills ("Spring Boot", "Apache Airflow") use substring — phrase-specific.
        // For proper nouns / acronyms (skill has uppercase letters), match case-sensitively
        // against the original job text: "Unity" matches "Unity game engine" but NOT "team unity".
        // For all-lowercase skills, word-boundary match in normalized (lowercased) text.
        let skillMatched;
        let matchedViaSynonym = false;
        let synonymLength = 0;
        if (!skill.normalized.includes(' ')) {
            const escaped = skill.raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (skill.caps > 0) {
                // Case-sensitive: "Unity" won't match "team unity"; "React" won't match "react to feedback"
                skillMatched = buildSkillBoundaryRegex(skill.raw, escaped).test(rawJobText);
            } else {
                // All-lowercase skills: word-boundary in normalized text
                skillMatched = buildSkillBoundaryRegex(skill.raw, escaped).test(skillMatchText);
            }
        } else {
            skillMatched = skillMatchText.includes(skill.normalized);
        }
        // Also check synonyms if direct match failed
        if (!skillMatched && SKILL_SYNONYMS[skill.normalized]) {
            const matchedSyn = SKILL_SYNONYMS[skill.normalized].find(syn => skillMatchText.includes(syn));
            if (matchedSyn) {
                skillMatched = true;
                matchedViaSynonym = true;
                synonymLength = matchedSyn.length;
            }
        }
        if (skillMatched) {
            matchedCount++;

            // Panda Formula: Base value derived from complexity (length + caps)
            // Cap string length to prevent long generic phrases ("technical troubleshooting") from hoarding points.
            // When matched via synonym, use the longer synonym length so "CX" → "customer experience"
            // scores like a 19-char skill, not a 2-char one.
            const effectiveLength = matchedViaSynonym ? Math.max(skill.length, synonymLength) : skill.length;
            let baseValue = (Math.min(effectiveLength, SCORING_CONFIG.skill.lengthCap) * SCORING_CONFIG.skill.lengthMult) + (skill.caps * SCORING_CONFIG.skill.capsMult) + SCORING_CONFIG.skill.base;

            // TECH BUFF: Short, spaceless acronyms (sso, saml, okta, aws, sql) get a bonus
            // But ultra-short (≤2 chars) or cross-domain ambiguous terms get no buff —
            // "AI", "QA", "CX" match in too many unrelated contexts
            const AMBIGUOUS_ACRONYMS = new Set([
                // 2-letter: match everywhere, zero signal
                'ai', 'qa', 'cx', 'pm', 'hr', 'bi', 'ui', 'ux', 'ml', 'it', 'db', 'os', 'ad', 'pr',
                'se', 'ba', 'sa', 'ra', 'da', 'la', 'am', 'sm', 'em', 'dm', 'rm', 'gm', 'vp',
                // 3-letter: common across 3+ industries
                'api', 'erp', 'etl', 'rpa', 'iot', 'b2b', 'b2c', 'roi', 'kpi', 'sla',
                'pmo', 'bpo', 'ops', 'seo', 'sem', 'ppc', 'cpc', 'cpm', 'ctr', 'cro',
                'esg', 'kyc', 'aml', 'nda', 'msa', 'rfp', 'rfq', 'poc', 'mvp', 'sdl',
                'l&d', 'dei', 'hse', 'ehs', 'qms', 'gmp', 'sop', 'cad', 'bim', 'mep',
                'emr', 'ehr', 'rca', 'otc', 'p2p', 'wms', 'tms', 'scm', 'mrp',
            ]);
            // Domain-identifying acronyms (CX, B2B, SaaS) are not fully ambiguous —
            // they still carry signal within their domain, just not across all domains.
            const DOMAIN_ACRONYMS = new Set(['cx', 'b2b', 'b2c', 'saas', 'seo', 'sem', 'ppc', 'cro', 'etl', 'rpa']);
            if (skill.length <= 5 && !skill.raw.includes(' ') && skill.length > 2 && !AMBIGUOUS_ACRONYMS.has(skill.normalized)) {
                baseValue += SCORING_CONFIG.skill.techAcronymBuff;
            } else if (DOMAIN_ACRONYMS.has(skill.normalized)) {
                baseValue += Math.round(SCORING_CONFIG.skill.techAcronymBuff * 0.75);
            }

            // NICHE TOOL BUFF: specific platforms that precisely define role fit
            if (NICHE_TOOLS.has(skill.normalized)) {
                baseValue += SCORING_CONFIG.skill.nicheToolBuff;
            }

            // TRUE DIMINISHING RETURNS (Logarithmic Decay)
            // Every subsequent skill match adds less value to prevent "Keyword Stuffing" spam.
            const multiplier = 1 / Math.log2(matchedCount + 1);

            // UBIQUITY DISCOUNT — skills that appear across many domain clusters carry
            // less discriminative power. "Python" (software_dev + data_analytics + ml_ai)
            // signals less than "Workato" (only in cx/automation contexts).
            // Derived automatically from TOKEN_CLUSTER_COUNT — no hardcoded term lists.
            const ubiquity = skillUbiquityFactor(skill.normalized);

            const value = baseValue * multiplier * ubiquity;

            keywordScore += value;
            matchDetails.push({ skill: skill.raw, value: Math.round(value) });
        }
    }

    // 2. SENIORITY EXPONENTIAL HARD-COUNTER
    const isSeniorJob = SENIOR_REGEX.test(title);
    const isManagerJob = !isSeniorJob && MANAGER_REGEX.test(title);
    const isInternJob = INTERN_REGEX.test(title);
    const isMidJob = !isSeniorJob && !isManagerJob && !isInternJob;

    let seniorityMultiplier = 1.0;

    // Continuous seniority gradient based on year-gap distance
    // A 5yr candidate and a 3yr candidate now get meaningfully different scores for the same senior role.
    // Manager (~8yr expected) sits between mid and senior in the gradient.
    const jobExpectedYears = isInternJob ? SCORING_CONFIG.seniority.expectedYears.intern : isSeniorJob ? SCORING_CONFIG.seniority.expectedYears.senior : isManagerJob ? SCORING_CONFIG.seniority.expectedYears.manager : SCORING_CONFIG.seniority.expectedYears.mid;
    const yearGap = candidateYears - jobExpectedYears; // positive = overqualified, negative = reaching up

    if (Math.abs(yearGap) <= SCORING_CONFIG.seniority.sweetSpotRange) {
        // Sweet spot: close match, boost scales with closeness
        seniorityMultiplier = SCORING_CONFIG.seniority.sweetSpotBase - (Math.abs(yearGap) * SCORING_CONFIG.seniority.sweetSpotDecayPerYear); // 1.25 (exact) → 1.13 (2yr off)
    } else if (yearGap < -SCORING_CONFIG.seniority.sweetSpotRange) {
        // Reaching UP: mild penalty that scales (ambition is okay, not crushed)
        seniorityMultiplier = Math.max(SCORING_CONFIG.seniority.reachingUpFloor, 1.0 - (Math.abs(yearGap) - SCORING_CONFIG.seniority.sweetSpotRange) * SCORING_CONFIG.seniority.reachingUpDecayRate);
        // 3yr gap → 0.85, 5yr gap → 0.55, 7yr gap → 0.25
    } else {
        // Reaching DOWN (overqualified): harsh, scales with gap
        seniorityMultiplier = Math.max(SCORING_CONFIG.seniority.reachingDownFloor, 1.0 - (yearGap - SCORING_CONFIG.seniority.sweetSpotRange) * SCORING_CONFIG.seniority.reachingDownDecayRate);
        // 3yr over → 0.75, 4yr over → 0.50, 5yr over → 0.25, 6yr+ → 0.01
    }

    // Hard kill for extreme under-qualification — if the gap is beyond the configured threshold,
    // force the multiplier to 0 so the seniority cap fires regardless of prestige/family buffs.
    if (yearGap < -SCORING_CONFIG.seniority.reachingUpHardKillGap) {
        seniorityMultiplier = 0;
    }

    // 3. RECENCY DECAY
    let recencyMultiplier = 1.0;
    if (job.date_posted) {
        const posted = new Date(job.date_posted);
        if (!isNaN(posted)) {
            const daysOld = Math.ceil(Math.abs(new Date() - posted) / (1000 * 60 * 60 * 24));
            // Smooth exponential decay instead of discrete steps
            // Day 0-2: 1.15 (fresh buff), then continuous decay
            // Day 7 → ~0.91, Day 14 → ~0.68, Day 21 → ~0.51, Day 30 → ~0.35
            if (daysOld <= SCORING_CONFIG.recency.freshDays) recencyMultiplier = SCORING_CONFIG.recency.freshBuff;
            else recencyMultiplier = Math.max(SCORING_CONFIG.recency.floor, SCORING_CONFIG.recency.freshBuff * Math.exp(-SCORING_CONFIG.recency.decayRate * (daysOld - SCORING_CONFIG.recency.freshDays)));
        }
    }

    // 4. PRESTIGE SYNERGY (Multiplicative Buff)
    let prestigeMultiplier = 1.0;
    if (PRESTIGIOUS_COMPANIES.some(pc => company.includes(pc))) {
        // Prestige scales with seniority (Google values a Senior more than an Intern in a match)
        prestigeMultiplier = SCORING_CONFIG.prestige.base + (candidateYears * SCORING_CONFIG.prestige.perYearBoost);
    }

    // 5. LANGUAGE QUALITY PENALTY
    let languageMultiplier = 1.0;
    if (NON_LATIN_REGEX.test(combined)) {
        languageMultiplier = SCORING_CONFIG.language.nonLatinPenalty; // Severe penalty for scraping noise
    }

    // 6. LOCATION BOUNDING BOX (HARD ENFORCEMENT)
    // Wrong geography = near-instant kill. Users HATE seeing out-of-region results.
    let locationMultiplier = 1.0;
    const userCity = normalize(preferences.city);
    const userState = normalize(preferences.state);
    const userCountry = normalize(preferences.country);
    const userLocation = normalize(preferences.location || '');
    // Check title + location for remote, plus first 200 chars of summary (catches "Remote OK" in description lead-in)
    // Deliberately NOT checking full description to avoid false positives from "manages remote teams" etc.
    const titleAndLocation = `${title} ${location}`;
    const summaryLeadIn = summary.slice(0, 200);
    const isRemote = titleAndLocation.includes('remote') || titleAndLocation.includes('wfh') || titleAndLocation.includes('work from home')
        || summaryLeadIn.includes('remote') || summaryLeadIn.includes('wfh') || summaryLeadIn.includes('work from home') || summaryLeadIn.includes('hybrid');
    const isAnywhere = location.includes('anywhere') || location.includes('worldwide') || location.includes('global');

    // Known country aliases for explicit foreign-country detection
    const COUNTRY_SIGNALS = {
        'india': ['india', 'bengaluru', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'pune', 'chennai', 'gurgaon', 'noida', 'kolkata', 'kochi', 'ahmedabad', 'lucknow', 'jaipur'],
        'united states': ['united states', 'usa', 'u.s.', 'new york', 'san francisco', 'seattle', 'chicago', 'austin', 'boston', 'los angeles', 'denver', 'atlanta', 'dallas', 'miami'],
        'united kingdom': ['united kingdom', 'uk', 'london', 'manchester', 'birmingham', 'edinburgh', 'bristol', 'leeds', 'glasgow'],
        'canada': ['canada', 'toronto', 'vancouver', 'montreal', 'ottawa', 'calgary', 'edmonton'],
        'germany': ['germany', 'berlin', 'munich', 'frankfurt', 'hamburg', 'cologne', 'stuttgart', 'deutschland'],
        'australia': ['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide'],
        'singapore': ['singapore'],
        'uae': ['uae', 'dubai', 'abu dhabi', 'united arab emirates', 'sharjah'],
        'france': ['france', 'paris', 'lyon', 'marseille', 'toulouse', 'bordeaux'],
        'netherlands': ['netherlands', 'amsterdam', 'rotterdam', 'den haag', 'the hague', 'eindhoven'],
        'ireland': ['ireland', 'dublin', 'cork', 'galway'],
        'brazil': ['brazil', 'são paulo', 'sao paulo', 'rio de janeiro', 'brasilia', 'belo horizonte'],
        'mexico': ['mexico', 'mexico city', 'guadalajara', 'monterrey', 'cdmx'],
        'sweden': ['sweden', 'stockholm', 'gothenburg', 'malmö', 'malmo'],
        'japan': ['japan', 'tokyo', 'osaka', 'kyoto', 'yokohama'],
        'new zealand': ['new zealand', 'auckland', 'wellington', 'christchurch'],
        'switzerland': ['switzerland', 'zurich', 'zürich', 'geneva', 'bern', 'basel'],
        'south africa': ['south africa', 'johannesburg', 'cape town', 'durban', 'pretoria'],
        'israel': ['israel', 'tel aviv', 'jerusalem', 'haifa'],
        'poland': ['poland', 'warsaw', 'krakow', 'wroclaw', 'gdansk', 'poznan'],
        'spain': ['spain', 'madrid', 'barcelona', 'valencia', 'seville'],
        'italy': ['italy', 'milan', 'rome', 'turin', 'florence', 'bologna'],
        'portugal': ['portugal', 'lisbon', 'porto'],
    };

    // Detect which country the JOB is actually in (from its location text)
    let jobCountryMatch = null;
    for (const [country, signals] of Object.entries(COUNTRY_SIGNALS)) {
        if (signals.some(sig => location.includes(sig) || combined.includes(sig))) {
            jobCountryMatch = country;
            break;
        }
    }

    // Detect which country the USER wants
    // Map ISO codes to country names (userCountry is often an ISO code like "IN", "US", "GB")
    const ISO_TO_COUNTRY = {
        'in': 'india', 'us': 'united states', 'gb': 'united kingdom', 'uk': 'united kingdom',
        'ca': 'canada', 'de': 'germany', 'au': 'australia', 'sg': 'singapore',
        'ae': 'uae', 'fr': 'france', 'jp': 'japan', 'nl': 'netherlands',
        'ie': 'ireland', 'nz': 'new zealand', 'se': 'sweden', 'ch': 'switzerland',
        'br': 'brazil', 'mx': 'mexico', 'za': 'south africa', 'il': 'israel',
        'pl': 'poland', 'es': 'spain', 'it': 'italy', 'pt': 'portugal',
    };
    const resolvedUserCountry = ISO_TO_COUNTRY[userCountry] || userCountry;

    let userCountryKey = null;
    for (const [country, signals] of Object.entries(COUNTRY_SIGNALS)) {
        if (signals.some(sig => resolvedUserCountry.includes(sig) || userLocation.includes(sig))) {
            userCountryKey = country;
            break;
        }
    }

    // Determine explicitly wrong city
    let explicitlyWrongCity = false;
    let vagueCountryMatch = false;

    if (userCity && !isRemote) {
        if (!cityMatchesInText(userCity, combined)) {
            // It doesn't have the user's city
            if (location.includes(',')) {
                // Structured but missing city
                explicitlyWrongCity = true;
            } else {
                // Unstructured. Check if it hit another major city
                const majorCities = ['delhi', 'mumbai', 'hyderabad', 'pune', 'chennai', 'noida', 'gurgaon', 'kolkata', 'kochi', 'ahmedabad', 'new york', 'london', 'tumakuru', 'mysuru', 'erode', 'coimbatore', 'chandigarh', 'indore', 'palakkad', 'vadodara', 'bangalore', 'bengaluru'];
                if (majorCities.some(c => location.includes(c) || combined.includes(c))) {
                    explicitlyWrongCity = true;
                } else if (jobCountryMatch === userCountryKey) {
                    vagueCountryMatch = true;
                } else {
                    explicitlyWrongCity = true;
                }
            }
        }
    }

    if (userCity && cityMatchesInText(userCity, combined)) {
        locationMultiplier = SCORING_CONFIG.location.exactCity;  // Exact city — solid buff (reduced from 3.0)
    } else if (jobCountryMatch && userCountryKey && jobCountryMatch !== userCountryKey) {
        // EXPLICIT WRONG COUNTRY — near-instant kill
        locationMultiplier = SCORING_CONFIG.location.wrongCountry;
    } else if (explicitlyWrongCity) {
        locationMultiplier = SCORING_CONFIG.location.wrongCity; // Near-kill for explicitly wrong city
    } else if (vagueCountryMatch) {
        locationMultiplier = SCORING_CONFIG.location.vagueCountryMatch; // Hard kill — same country but user specified city, job is vague/different area
    } else if (userState && combined.includes(userState)) {
        locationMultiplier = SCORING_CONFIG.location.sameState;  // Same state — solid buff
    } else if (userState && !isRemote && jobCountryMatch === userCountryKey) {
        // Same country, user wants specific state, but job is in a different area
        locationMultiplier = SCORING_CONFIG.location.sameCountryWrongState;
    } else if (isRemote && !isAnywhere && jobCountryMatch === userCountryKey) {
        locationMultiplier = SCORING_CONFIG.location.remoteSameCountry;  // Remote within same country — slight buff
    } else if (jobCountryMatch === userCountryKey) {
        locationMultiplier = SCORING_CONFIG.location.sameCountryNoMatch;  // Hard kill — same country but wrong city/state
    } else if (isAnywhere) {
        // Truly global/anywhere jobs — moderate penalty
        locationMultiplier = SCORING_CONFIG.location.anywhere;
    } else if (isRemote && jobCountryMatch === null) {
        // Remote with no country context — neutral-to-favorable.
        // Boost to anywhere (0.60) if user explicitly prefers remote jobs.
        locationMultiplier = preferences?.remoteOnly
            ? SCORING_CONFIG.location.anywhere
            : SCORING_CONFIG.location.remoteNoCountry;
    } else if (isRemote) {
        // Remote but detected country doesn't match user's — likely wrong country
        locationMultiplier = SCORING_CONFIG.location.remoteWrongCountry;
    } else {
        // Unknown/undetectable location — harsh penalty, assume wrong
        locationMultiplier = SCORING_CONFIG.location.unknownLocation;
    }

    // 7. ROLE DEPTH MULTIPLIER (The "Unconventional CX" Shield)
    // If the candidate has advanced platform/integration skills, basic L1 support jobs get crushed.
    let depthMultiplier = 1.0;
    const candidateSkillsLower = (profile.skills || []).map(s => (s || '').toLowerCase());
    const candidateDepthCount = candidateSkillsLower.filter(s => DEPTH_INDICATORS.some(d => s.includes(d))).length;
    const hasDepth = candidateDepthCount >= SCORING_CONFIG.depth.depthThreshold; // Candidate has strategic/technical depth

    if (hasDepth) {
        const isShallowJob = SHALLOW_JOB_INDICATORS.some(si => combined.includes(si));
        // Also detect generic "customer service" roles that don't mention any platform/integration terms
        const jobHasDepth = DEPTH_INDICATORS.some(d => combined.includes(d));

        if (isShallowJob) {
            depthMultiplier = SCORING_CONFIG.depth.shallowPenalty; // Moderate penalty — basic support role doesn't leverage this candidate's depth
        } else if (jobHasDepth) {
            depthMultiplier = SCORING_CONFIG.depth.deepBuff; // Gentle buff — job aligns with candidate's platform/integration skills
        } else {
            depthMultiplier = SCORING_CONFIG.depth.neutral; // Negligible — no depth signals either way
        }
    } else {
        // Shallow candidate — if the job requires technical depth, penalize the mismatch
        const jobHasDepth = DEPTH_INDICATORS.some(d => combined.includes(d));
        if (jobHasDepth) {
            depthMultiplier = SCORING_CONFIG.depth.shallowPenalty; // Candidate lacks the depth signals this role demands
        }
    }

    // 8. ROLE FAMILY MISMATCH (Skills + Title must COMPLEMENT each other)
    // A CX Specialist and a Staff Engineer may share "okta" and "saml" skills,
    // but they are fundamentally different career tracks. Penalize cross-family matches.
    const isExploreMode = preferences?.exploreAdjacent === true;
    let roleFamilyMultiplier = 1.0;
    const candidateFamily = detectRoleFamily(targetTitle);
    const jobFamily = detectRoleFamily(title);

    if (candidateFamily && jobFamily) {
        if (candidateFamily === jobFamily) {
            roleFamilyMultiplier = SCORING_CONFIG.roleFamily.sameFamily; // Same family — slight buff
        } else {
            // In explore mode, soften the penalty to allow adjacent roles through
            roleFamilyMultiplier = isExploreMode ? SCORING_CONFIG.roleFamily.crossFamilyExplore : SCORING_CONFIG.roleFamily.crossFamily;
        }
    } else if (candidateFamily && !jobFamily) {
        // Candidate has a known career track but the job is unclassifiable.
        roleFamilyMultiplier = isExploreMode ? SCORING_CONFIG.roleFamily.unclassifiableExplore : SCORING_CONFIG.roleFamily.unclassifiable;
    }

    // 8b. TITLE KEYWORD OVERLAP CHECK
    // If the candidate's headline and job title share zero meaningful words,
    // apply an additional penalty. This catches cases where generic keyword
    // matches inflate scores for completely unrelated roles.
    const TITLE_STOP_WORDS = new Set(['the', 'a', 'an', 'in', 'at', 'for', 'of', 'and', 'or', 'to', 'with', '-', '&', '|', 'i', 'ii', 'iii', 'sr', 'jr']);
    // 2-char identity acronyms are stripped by the length > 2 filter but are often
    // the KEY differentiator in a title (AI, CX, ML, UX). Allow them through explicitly.
    const IDENTITY_ACRONYMS = new Set(['ai', 'cx', 'ml', 'ux', 'ui', 'bi', 'hr', 'qa', 'pm']);
    // Use original normalized title (not expanded) for overlap — expansion maps seniority
    // markers to generic words like "senior" which creates false overlap between
    // unrelated titles (e.g. "Sr. Recruiter" vs "Senior Software Engineer").
    // expandAbbreviations is intentionally kept only in detectRoleFamily above.
    // Strip periods so "sr." → "sr" and correctly matches the TITLE_STOP_WORDS set.
    const candidateTitleWords = (targetTitle || '').replace(/\./g, '').split(/[\s\-\/&,]+/).filter(w => !TITLE_STOP_WORDS.has(w) && (w.length > 2 || IDENTITY_ACRONYMS.has(w)));
    const jobTitleWords = (title || '').replace(/\./g, '').split(/[\s\-\/&,]+/).filter(w => !TITLE_STOP_WORDS.has(w) && (w.length > 2 || IDENTITY_ACRONYMS.has(w)));
    const titleOverlap = candidateTitleWords.filter(w => jobTitleWords.some(jw => jw.includes(w) || w.includes(jw)));

    // Skip zero-overlap cap when both titles are in the same known family — different title
    // vocabulary within the same career track is expected (e.g. "Project Coordinator" vs
    // "Operations Manager" are both operations; penalizing them is a false positive).
    const sameFamilyDetected = candidateFamily && jobFamily && candidateFamily === jobFamily;
    if (candidateTitleWords.length > 0 && jobTitleWords.length > 0 && titleOverlap.length === 0 && !sameFamilyDetected) {
        // Zero title word overlap — in explore mode, be gentler
        const overlapCap = isExploreMode ? SCORING_CONFIG.roleFamily.zeroOverlapCapExplore : SCORING_CONFIG.roleFamily.zeroOverlapCap;
        roleFamilyMultiplier = Math.min(roleFamilyMultiplier, overlapCap);
    }

    // 9. NEGATIVE KEYWORD KILL (Scam / Irrelevant / Unreachable Role Filter)
    let negativeMultiplier = 1.0;
    if (hasNegativeKeywords(`${title} ${summary}`)) {
        negativeMultiplier = SCORING_CONFIG.negative.killMultiplier;
    }

    // 9b. TITLE-DESCRIPTION COHERENCE CHECK
    // Catches misleading titles where the job description has nothing to do with
    // the candidate's domain. E.g. "Customer Experience Manager" title on a B2B
    // education loan sales role — the title keyword matches but the actual work doesn't.
    let coherenceMultiplier = 1.0;
    if (keywordScore > 0 && summary) {
        // Check if matched keywords appear in the title but NOT in the description body
        const titleOnlyMatches = skills.filter(s => {
            const norm = s.normalized;
            return norm.length > 2 && title.includes(norm) && !summary.includes(norm);
        });
        // If ALL keyword matches came from title only and none from the description,
        // the job description doesn't actually involve the candidate's domain
        const descMatches = skills.filter(s => s.normalized.length > 2 && summary.includes(s.normalized));
        if (titleOnlyMatches.length > 0 && descMatches.length === 0) {
            coherenceMultiplier = SCORING_CONFIG.coherence.misleadingPenalty; // Heavy penalty — title is misleading
        }
    }

    // 10. DOMAIN CLUSTER CHECK (Industry-agnostic mismatch detection)
    // Uses skill/keyword clusters to detect if user and job are in completely different domains.
    // Works for any industry without hardcoding — construction, retail, healthcare, etc.
    const domainResult = computeDomainMultiplier(profile.skills, targetTitle, title, summary);
    let domainMultiplier = domainResult.multiplier;

    // In explore mode, soften domain mismatch (user wants to see adjacent industries)
    if (isExploreMode && domainResult.reason === 'mismatch') {
        domainMultiplier = SCORING_CONFIG.domain.mismatchPenaltyExplore; // Softer than the default 0.3
    }

    // 11. SEMANTIC EMBEDDING SIMILARITY
    // Re-enabled using getBatchEmbeddings passed down from the matcher pipeline.
    let semanticMultiplier = 1.0;
    let embeddingSimilarity = null;

    if (job.__precomputedJobEmb && job.__precomputedRoleEmb) {
        embeddingSimilarity = cosineSimilarity(job.__precomputedJobEmb, job.__precomputedRoleEmb);
        if (embeddingSimilarity < 0.25) {
            semanticMultiplier = 0.5; // Heavy penalty for irrelevant matches
        } else if (embeddingSimilarity > 0.70) {
            semanticMultiplier = 1.3; // Boost for highly relevant semantic matches
        } else if (embeddingSimilarity > 0.60) {
            semanticMultiplier = 1.1; // Minor boost
        }
    }

    // MINIMUM BASE SCORE for title-matching jobs
    if (keywordScore === 0 && titleOverlap.length > 0) {
        keywordScore = SCORING_CONFIG.titleOverlapFloor;
        // Same-family boost: when both candidate and job are in the same role family
        // (e.g. both cx_support), title evidence is stronger — thin ATS descriptions
        // that don't mention specific tools shouldn't be penalized as hard.
        if (sameFamilyDetected) {
            keywordScore += 10; // 15 → 25 for verified same-family title matches
        }
    }

    // FINAL SCORE CONSOLIDATION
    // More skill matches = higher confidence = smaller divisor (easier to score high).
    // Sparse matches (1-2 skills) use a larger divisor to prevent thin evidence inflating scores.
    const effectiveDivisor = matchedCount <= 2 ? SCORING_CONFIG.baseNormDivisor : matchedCount <= 4 ? 42 : 32;
    let finalScore = (keywordScore / effectiveDivisor) * 100;

    // TITLE AFFINITY BONUS — applied post-normalization so it adds score-points, not raw keyword-points.
    // Without this, a job titled "Customer Experience Specialist" gets zero credit for
    // matching the candidate's headline "Customer Experience Specialist".
    // Generic role words ("manager", "specialist", "product") carry little signal —
    // a 3-word generic overlap should score less than a 2-word specific overlap.
    const GENERIC_TITLE_WORDS = new Set(['manager', 'specialist', 'associate', 'coordinator', 'analyst', 'executive', 'officer', 'director', 'head', 'staff', 'senior', 'junior', 'product', 'business', 'operations', 'service', 'services', 'support', 'technical', 'global', 'regional', 'lead', 'principal']);
    // IDENTITY WORDS — domain/specialty-defining words in job titles.
    // When the JOB has identity words the CANDIDATE lacks, the title affinity
    // bonus is discounted because the job targets a different specialization.
    const IDENTITY_WORDS = new Set([
        // Tech/AI
        'ai', 'ml', 'machine', 'learning', 'data', 'cloud', 'security', 'blockchain',
        'devops', 'sre', 'infrastructure', 'platform', 'fullstack', 'frontend', 'backend',
        'mobile', 'ios', 'android', 'embedded', 'firmware', 'robotics', 'software',
        // Domain verticals
        'finance', 'financial', 'healthcare', 'medical', 'legal', 'compliance',
        'marketing', 'growth', 'sales', 'revenue', 'recruiting', 'talent',
        'design', 'creative', 'content', 'brand', 'editorial',
        // Specialty modifiers
        'automation', 'workflow', 'integration', 'api', 'analytics', 'strategy',
        'cx', 'ux', 'ui', 'devrel', 'devsecops',
        // Industry
        'construction', 'manufacturing', 'retail', 'ecommerce', 'logistics',
        'supply', 'procurement', 'real', 'estate', 'gaming', 'pharma',
    ]);
    if (candidateTitleWords.length > 0 && titleOverlap.length > 0) {
        const weightedOverlap = titleOverlap.reduce((sum, w) => sum + (GENERIC_TITLE_WORDS.has(w) ? 0.3 : 1.0), 0);
        const weightedTotal = candidateTitleWords.reduce((sum, w) => sum + (GENERIC_TITLE_WORDS.has(w) ? 0.3 : 1.0), 0);

        // Penalize when job has identity words candidate is missing
        const jobIdentityWords = jobTitleWords.filter(w => IDENTITY_WORDS.has(w));
        const missingIdentity = jobIdentityWords.filter(w => !candidateTitleWords.some(cw => cw.includes(w) || w.includes(cw)));
        const identityPenalty = jobIdentityWords.length > 0
            ? Math.max(0.15, 1 - (missingIdentity.length / jobIdentityWords.length) * 0.75)
            : 1.0;

        const titleRatio = weightedTotal > 0 ? (weightedOverlap / weightedTotal) * identityPenalty : 0;
        finalScore += titleRatio * (SCORING_CONFIG.titleAffinity?.maxBonus || 12);
    }

    // Apply compounding multipliers
    finalScore *= seniorityMultiplier;
    finalScore *= recencyMultiplier;
    finalScore *= prestigeMultiplier;
    finalScore *= languageMultiplier;
    finalScore *= locationMultiplier;
    finalScore *= depthMultiplier;
    finalScore *= roleFamilyMultiplier;
    finalScore *= negativeMultiplier;
    finalScore *= coherenceMultiplier;
    finalScore *= domainMultiplier;
    finalScore *= semanticMultiplier;

    if (negativeMultiplier <= SCORING_CONFIG.negative.killMultiplier) {
        finalScore = Math.min(finalScore, SCORING_CONFIG.caps.negativeCap);
    }
    // Domain mismatch hard cap — confirmed wrong industry should never score well.
    // Exception: when 3+ specific profile skills appear verbatim in the job, the skill
    // evidence outweighs the cluster-level mismatch (domain detection can false-positive
    // on sparse descriptions that share generic terms like "automation" or "SQL").
    if (domainResult.reason === 'mismatch') {
        // Domain override: when the job title explicitly matches the candidate's role family
        // (e.g. both cx_support), suppress the domain mismatch penalty. A "Customer Support
        // Specialist" at NTT DATA shouldn't be penalized because NTT also has engineering clusters.
        const sameFamilyOverride = sameFamilyDetected;
        const domainMismatchCap = sameFamilyOverride
            ? 80  // same-family CX title overrides domain cluster noise
            : matchedCount >= 3
            ? 45  // 3+ skill hits override domain cluster noise
            : isExploreMode ? SCORING_CONFIG.caps.domainMismatchCapExplore : SCORING_CONFIG.caps.domainMismatchCap;
        if (sameFamilyOverride) {
            domainMultiplier = Math.max(domainMultiplier, 0.85); // soften the 0.3x to 0.85x minimum
        }
        finalScore = Math.min(finalScore, domainMismatchCap);
    }
    if (!isExploreMode) {
        // If domain clusters overlap AND skills strongly match, the job is a real candidate
        // even if it's a different title/family. Raise the cap to let it surface.
        const domainOverlaps = domainResult.reason !== 'mismatch';
        const strongSkillMatch = matchedCount >= 4;
        if (roleFamilyMultiplier <= SCORING_CONFIG.roleFamily.crossFamily) {
            const effectiveCap = (domainOverlaps && strongSkillMatch) ? 55 : SCORING_CONFIG.caps.crossFamilyCap;
            finalScore = Math.min(finalScore, effectiveCap);
        } else if (roleFamilyMultiplier <= SCORING_CONFIG.roleFamily.unclassifiable) {
            const effectiveCap = (domainOverlaps && strongSkillMatch) ? 50 : SCORING_CONFIG.caps.unclassifiedCap;
            finalScore = Math.min(finalScore, effectiveCap);
        }
    } else {
        // Explore mode: softer caps to let adjacent roles through
        if (roleFamilyMultiplier <= SCORING_CONFIG.roleFamily.crossFamilyExplore) {
            finalScore = Math.min(finalScore, SCORING_CONFIG.caps.crossFamilyCapExplore);
        }
    }
    // Location hard cap — wrong country/city should NEVER score well regardless of title/skill match
    if (locationMultiplier <= SCORING_CONFIG.caps.locationCapThreshold) {
        finalScore = Math.min(finalScore, SCORING_CONFIG.caps.locationCap);
    }
    if (seniorityMultiplier <= SCORING_CONFIG.caps.seniorityCapThreshold) {
        finalScore = Math.min(finalScore, SCORING_CONFIG.caps.seniorityCap);
    }

    // Minimum relevance gate: jobs with no skill/keyword match beyond baseline (raw ≤ 15)
    // and no skill matches should never cross the display threshold via location+prestige alone.
    // "R&D Leader @ Dexcom" and "S&RC India Leader @ Philips" score 35 only because
    // Bengaluru (1.5x) + prestige (1.15x) + seniority boost lift a raw=15 baseline.
    // Cap them at 28 so they don't surface as false positives.
    if (keywordScore <= 15 && matchDetails.length === 0) {
        finalScore = Math.min(finalScore, 28);
    }

    // SKILL COVERAGE CAP — earned score ceiling scales with how many profile skills were matched.
    // Prevents location × depth × roleFamily compounding from pushing 1-skill matches to 100.
    // A genuine 100 requires 4+ specific skills from the profile matched in the job description.
    // Jobs with thin descriptions (ATS with no text) are fairly capped — we have no evidence for more.
    const skillCoverageCaps = SCORING_CONFIG.skillCoverage.caps;
    const coverageCapEntry = [...skillCoverageCaps].reverse().find(c => matchedCount >= c.minMatches);
    if (coverageCapEntry) {
        finalScore = Math.min(finalScore, coverageCapEntry.cap);
    }

    return {
        score: Math.round(Math.min(finalScore, SCORING_CONFIG.caps.maxScore)),
        raw: Math.round(keywordScore),
        locationMultiplier: parseFloat(locationMultiplier.toFixed(2)),
        multipliers: {
            seniority: seniorityMultiplier.toFixed(2),
            recency: recencyMultiplier.toFixed(2),
            prestige: prestigeMultiplier.toFixed(2),
            location: locationMultiplier.toFixed(2),
            quality: languageMultiplier.toFixed(2),
            depth: depthMultiplier.toFixed(2),
            roleFamily: roleFamilyMultiplier.toFixed(2),
            negative: negativeMultiplier.toFixed(2),
            coherence: coherenceMultiplier.toFixed(2),
            domain: domainMultiplier.toFixed(2),
            domainDetail: domainResult.reason,
            semantic: semanticMultiplier.toFixed(2),
        },
        matches: matchDetails
    };
}
