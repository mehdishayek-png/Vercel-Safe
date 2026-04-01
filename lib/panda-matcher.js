/**
 * PROJECT PANDA: Next-Generation Job Matching Engine
 * Inspired by Dota 2 balancing: Dynamic weighting, logarithmic decay, and exponential hard-counters.
 * This is an isolated experimental module.
 */

import { computeSemanticMatch } from './embeddings.js';

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
    engineering: ['engineer', 'developer', 'programmer', 'architect', 'sde', 'swe', 'devops', 'sre', 'qa ', 'qe ', 'test engineer', 'software', 'fullstack', 'full stack', 'frontend', 'backend', 'iam engineer', 'technical support', 'it support'],
    cx_support: ['customer experience', 'customer success', 'customer support', 'cx ', 'csm', 'technical account manager', 'tam ', 'support specialist', 'customer care', 'client success', 'customer operations', 'product operations', 'product support'],
    sales: ['sales', 'account executive', 'business development', 'bdr', 'sdr', 'sales engineer', 'revenue', 'lead generation', 'inside sales', 'outside sales'],
    data: ['data scientist', 'data analyst', 'data engineer', 'machine learning', 'ml engineer', 'ai engineer', 'analytics'],
    design: ['designer', 'ux ', 'ui ', 'product designer', 'graphic designer', 'visual designer', 'game designer', 'system designer', 'level designer', 'narrative designer'],
    gaming: ['game ', 'gaming', 'game designer', 'system designer', 'level designer', 'f2p', 'live ops', 'liveops', 'game economy', 'game ui', 'monetization designer', 'gameplay'],
    product: ['product manager', 'product owner', 'program manager', 'scrum master'],
    marketing: ['marketing', 'growth', 'seo', 'content', 'brand'],
    operations: ['operations manager', 'ops manager', 'supply chain', 'logistics', 'procurement'],
    it_infra: ['incident manager', 'incident management', 'itil', 'service level', 'change manager', 'problem manager', 'it infrastructure', 'network engineer', 'system administrator', 'sysadmin', 'infrastructure'],
    process: ['lean', 'six sigma', 'process excellence', 'process improvement', 'quality manager', 'quality assurance manager', 'continuous improvement'],
    finance: ['accountant', 'finance', 'auditor', 'controller', 'bookkeeper'],
    recruiting: ['recruiting', 'recruiter', 'talent acquisition', 'hiring', 'staffing'],
    hr: ['human resources', 'hr ', 'people operations', 'employee relations', 'compensation'],
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

    // --- Veterinary & Animal Care ---
    veterinary_animal: [
        'veterinarian', 'veterinary', 'animal care', 'pet care', 'dog grooming', 'kennel',
        'animal shelter', 'animal welfare', 'livestock', 'equine', 'avian', 'wildlife rescue',
        'pet shop', 'animal hospital', 'veterinary nurse', 'veterinary technician', 'zoology',
        'animal husbandry', 'dairy farm', 'poultry farm', 'aquarium', 'marine life',
    ],
};

/**
 * Detects which domain clusters a text (skills list or JD) belongs to.
 * Returns a Set of matching cluster names.
 * minHits: how many keywords must match to count as a cluster hit (default 2 to avoid noise).
 */
function detectDomainClusters(text, minHits = 2) {
    const t = (text || '').toLowerCase();
    const matched = new Set();
    for (const [cluster, keywords] of Object.entries(DOMAIN_CLUSTERS)) {
        let hits = 0;
        for (const kw of keywords) {
            if (t.includes(kw)) {
                hits++;
                if (hits >= minHits) {
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

    // Fallback: if either side hits zero clusters, we can't confirm a mismatch
    if (userClusters.size === 0 || jobClusters.size === 0) {
        return { multiplier: 1.0, reason: 'undetected', userClusters: [...userClusters], jobClusters: [...jobClusters] };
    }

    // Check overlap
    const overlap = [...userClusters].filter(c => jobClusters.has(c));

    if (overlap.length > 0) {
        // Shared domain — slight buff for deep overlap (3+ shared clusters)
        const buff = overlap.length >= 3 ? 1.15 : overlap.length >= 2 ? 1.1 : 1.05;
        return { multiplier: buff, reason: 'match', overlap, userClusters: [...userClusters], jobClusters: [...jobClusters] };
    }

    // Both sides detected, zero overlap = confirmed domain mismatch
    return { multiplier: 0.3, reason: 'mismatch', userClusters: [...userClusters], jobClusters: [...jobClusters] };
}

/**
 * Detects which role family a title belongs to. Returns null if unclassifiable.
 */
function detectRoleFamily(titleText) {
    const t = (titleText || '').toLowerCase();
    for (const [family, keywords] of Object.entries(ROLE_FAMILIES)) {
        if (keywords.some(kw => t.includes(kw))) return family;
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
 */
function hasNegativeKeywords(text) {
    const lower = text.toLowerCase();
    return NEGATIVE_KEYWORDS.some(kw => lower.includes(kw));
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

    const targetTitle = normalize(profile.headline);
    const candidateYears = profile.experience_years || 0;

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

    // Sort skills by length so longer (more specific) terms are processed first
    skills.sort((a, b) => b.length - a.length);

    for (const skill of skills) {
        if (combined.includes(skill.normalized)) {
            matchedCount++;

            // Panda Formula: Base value derived from complexity (length + caps)
            // Cap string length to prevent long generic phrases ("technical troubleshooting") from hoarding points.
            let baseValue = (Math.min(skill.length, 12) * 1.5) + (skill.caps * 2) + 5;

            // TECH BUFF: Short, spaceless acronyms (sso, saml, okta, aws, sql) get a bonus
            // But ultra-short (≤2 chars) or cross-domain ambiguous terms get no buff —
            // "AI", "QA", "CX" match in too many unrelated contexts
            const AMBIGUOUS_ACRONYMS = new Set([
                // 2-letter: match everywhere, zero signal
                'ai', 'qa', 'cx', 'pm', 'hr', 'bi', 'ui', 'ux', 'ml', 'it', 'db', 'os', 'ad', 'pr',
                'se', 'ba', 'sa', 'ra', 'da', 'la', 'am', 'sm', 'em', 'dm', 'rm', 'gm', 'vp',
                // 3-letter: common across 3+ industries
                'api', 'crm', 'erp', 'etl', 'rpa', 'iot', 'b2b', 'b2c', 'roi', 'kpi', 'sla',
                'pmo', 'bpo', 'ops', 'seo', 'sem', 'ppc', 'cpc', 'cpm', 'ctr', 'cro',
                'esg', 'kyc', 'aml', 'nda', 'msa', 'rfp', 'rfq', 'poc', 'mvp', 'sdl',
                'l&d', 'dei', 'hse', 'ehs', 'qms', 'gmp', 'sop', 'cad', 'bim', 'mep',
                'emr', 'ehr', 'rca', 'otc', 'p2p', 'wms', 'tms', 'scm', 'mrp',
            ]);
            if (skill.length <= 5 && !skill.raw.includes(' ') && skill.length > 2 && !AMBIGUOUS_ACRONYMS.has(skill.normalized)) {
                baseValue += 15;
            }

            // TRUE DIMINISHING RETURNS (Logarithmic Decay)
            // Every subsequent skill match adds less value to prevent "Keyword Stuffing" spam.
            const multiplier = 1 / Math.log2(matchedCount + 1);
            const value = baseValue * multiplier;

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
    const jobExpectedYears = isInternJob ? 1 : isSeniorJob ? 10 : isManagerJob ? 8 : 3;
    const yearGap = candidateYears - jobExpectedYears; // positive = overqualified, negative = reaching up

    if (Math.abs(yearGap) <= 2) {
        // Sweet spot: close match, boost scales with closeness
        seniorityMultiplier = 1.25 - (Math.abs(yearGap) * 0.06); // 1.25 (exact) → 1.13 (2yr off)
    } else if (yearGap < -2) {
        // Reaching UP: mild penalty that scales (ambition is okay, not crushed)
        seniorityMultiplier = Math.max(0.05, 1.0 - (Math.abs(yearGap) - 2) * 0.15);
        // 3yr gap → 0.85, 5yr gap → 0.55, 7yr gap → 0.25
    } else {
        // Reaching DOWN (overqualified): harsh, scales with gap
        seniorityMultiplier = Math.max(0.01, 1.0 - (yearGap - 2) * 0.25);
        // 3yr over → 0.75, 4yr over → 0.50, 5yr over → 0.25, 6yr+ → 0.01
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
            if (daysOld <= 2) recencyMultiplier = 1.15;
            else recencyMultiplier = Math.max(0.25, 1.15 * Math.exp(-0.04 * (daysOld - 2)));
        }
    }

    // 4. PRESTIGE SYNERGY (Multiplicative Buff)
    let prestigeMultiplier = 1.0;
    if (PRESTIGIOUS_COMPANIES.some(pc => company.includes(pc))) {
        // Prestige scales with seniority (Google values a Senior more than an Intern in a match)
        prestigeMultiplier = 1.1 + (candidateYears * 0.02);
    }

    // 5. LANGUAGE QUALITY PENALTY
    let languageMultiplier = 1.0;
    if (NON_LATIN_REGEX.test(combined)) {
        languageMultiplier = 0.2; // Severe penalty for scraping noise
    }

    // 6. LOCATION BOUNDING BOX (HARD ENFORCEMENT)
    // Wrong geography = near-instant kill. Users HATE seeing out-of-region results.
    let locationMultiplier = 1.0;
    const userCity = normalize(preferences.city);
    const userState = normalize(preferences.state);
    const userCountry = normalize(preferences.country);
    const userLocation = normalize(preferences.location || '');
    // Only check title + location for remote — NOT full description (false positives from "remote teams" etc.)
    const titleAndLocation = `${title} ${location}`;
    const isRemote = titleAndLocation.includes('remote') || titleAndLocation.includes('wfh') || titleAndLocation.includes('work from home');
    const isAnywhere = location.includes('anywhere') || location.includes('worldwide') || location.includes('global');

    // Known country aliases for explicit foreign-country detection
    const COUNTRY_SIGNALS = {
        'india': ['india', 'bengaluru', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'pune', 'chennai', 'gurgaon', 'noida', 'kolkata', 'kochi', 'ahmedabad', 'lucknow', 'jaipur'],
        'united states': ['united states', 'usa', 'u.s.', 'new york', 'san francisco', 'seattle', 'chicago', 'austin', 'boston', 'los angeles', 'denver'],
        'united kingdom': ['united kingdom', 'uk', 'london', 'manchester', 'birmingham', 'edinburgh'],
        'canada': ['canada', 'toronto', 'vancouver', 'montreal', 'ottawa'],
        'germany': ['germany', 'berlin', 'munich', 'frankfurt', 'hamburg', 'deutschland'],
        'australia': ['australia', 'sydney', 'melbourne', 'brisbane'],
        'singapore': ['singapore'],
        'uae': ['uae', 'dubai', 'abu dhabi', 'united arab emirates'],
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
        locationMultiplier = 1.5;  // Exact city — solid buff (reduced from 3.0)
    } else if (jobCountryMatch && userCountryKey && jobCountryMatch !== userCountryKey) {
        // EXPLICIT WRONG COUNTRY — near-instant kill
        locationMultiplier = 0.01;
    } else if (explicitlyWrongCity) {
        locationMultiplier = 0.02; // Near-kill for explicitly wrong city
    } else if (vagueCountryMatch) {
        locationMultiplier = 0.01; // Hard kill — same country but user specified city, job is vague/different area
    } else if (userState && combined.includes(userState)) {
        locationMultiplier = 1.3;  // Same state — solid buff
    } else if (userState && !isRemote && jobCountryMatch === userCountryKey) {
        // Same country, user wants specific state, but job is in a different area
        locationMultiplier = 0.01;
    } else if (isRemote && !isAnywhere && jobCountryMatch === userCountryKey) {
        locationMultiplier = 1.1;  // Remote within same country — slight buff
    } else if (jobCountryMatch === userCountryKey) {
        locationMultiplier = 0.01;  // Hard kill — same country but wrong city/state
    } else if (isAnywhere) {
        // Truly global/anywhere jobs — moderate penalty
        locationMultiplier = 0.60;
    } else if (isRemote) {
        // Remote but no country match — likely wrong country
        locationMultiplier = 0.05;
    } else {
        // Unknown/undetectable location — harsh penalty, assume wrong
        locationMultiplier = 0.05;
    }

    // 7. ROLE DEPTH MULTIPLIER (The "Unconventional CX" Shield)
    // If the candidate has advanced platform/integration skills, basic L1 support jobs get crushed.
    let depthMultiplier = 1.0;
    const candidateSkillsLower = (profile.skills || []).map(s => (s || '').toLowerCase());
    const candidateDepthCount = candidateSkillsLower.filter(s => DEPTH_INDICATORS.some(d => s.includes(d))).length;
    const hasDepth = candidateDepthCount >= 2; // Candidate has strategic/technical depth

    if (hasDepth) {
        const isShallowJob = SHALLOW_JOB_INDICATORS.some(si => combined.includes(si));
        // Also detect generic "customer service" roles that don't mention any platform/integration terms
        const jobHasDepth = DEPTH_INDICATORS.some(d => combined.includes(d));

        if (isShallowJob) {
            depthMultiplier = 0.6; // Moderate penalty — basic support role doesn't leverage this candidate's depth
        } else if (jobHasDepth) {
            depthMultiplier = 1.15; // Gentle buff — job aligns with candidate's platform/integration skills
        } else {
            depthMultiplier = 0.95; // Negligible — no depth signals either way
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
            roleFamilyMultiplier = 1.1; // Same family — slight buff
        } else {
            // In explore mode, soften the penalty to allow adjacent roles through
            roleFamilyMultiplier = isExploreMode ? 0.75 : 0.4;
        }
    } else if (candidateFamily && !jobFamily) {
        // Candidate has a known career track but the job is unclassifiable.
        roleFamilyMultiplier = isExploreMode ? 0.85 : 0.65;
    }

    // 8b. TITLE KEYWORD OVERLAP CHECK
    // If the candidate's headline and job title share zero meaningful words,
    // apply an additional penalty. This catches cases where generic keyword
    // matches inflate scores for completely unrelated roles.
    const TITLE_STOP_WORDS = new Set(['the', 'a', 'an', 'in', 'at', 'for', 'of', 'and', 'or', 'to', 'with', '-', '&', '|', 'i', 'ii', 'iii', 'sr', 'jr']);
    const candidateTitleWords = (targetTitle || '').toLowerCase().split(/[\s\-\/&,]+/).filter(w => w.length > 2 && !TITLE_STOP_WORDS.has(w));
    const jobTitleWords = title.split(/[\s\-\/&,]+/).filter(w => w.length > 2 && !TITLE_STOP_WORDS.has(w));
    const titleOverlap = candidateTitleWords.filter(w => jobTitleWords.some(jw => jw.includes(w) || w.includes(jw)));

    if (candidateTitleWords.length > 0 && jobTitleWords.length > 0 && titleOverlap.length === 0) {
        // Zero title word overlap — in explore mode, be gentler
        const overlapCap = isExploreMode ? 0.75 : 0.55;
        roleFamilyMultiplier = Math.min(roleFamilyMultiplier, overlapCap);
    }

    // 9. NEGATIVE KEYWORD KILL (Scam / Irrelevant / Unreachable Role Filter)
    let negativeMultiplier = 1.0;
    if (hasNegativeKeywords(`${title} ${summary}`)) {
        negativeMultiplier = 0.01;
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
            coherenceMultiplier = 0.4; // Heavy penalty — title is misleading
        }
    }

    // 10. DOMAIN CLUSTER CHECK (Industry-agnostic mismatch detection)
    // Uses skill/keyword clusters to detect if user and job are in completely different domains.
    // Works for any industry without hardcoding — construction, retail, healthcare, etc.
    const domainResult = computeDomainMultiplier(profile.skills, targetTitle, title, summary);
    let domainMultiplier = domainResult.multiplier;

    // In explore mode, soften domain mismatch (user wants to see adjacent industries)
    if (isExploreMode && domainResult.reason === 'mismatch') {
        domainMultiplier = 0.6; // Softer than the default 0.3
    }

    // 11. SEMANTIC EMBEDDING SIMILARITY
    // DISABLED in live scan — was making 90+ individual OpenAI API calls per scan.
    // Embeddings will be used in the daily cron/alert pipeline instead,
    // where latency and per-call cost don't matter.
    let semanticMultiplier = 1.0;
    let embeddingSimilarity = null;

    // MINIMUM BASE SCORE for title-matching jobs
    // When keywordScore=0 (niche skills like "F2P", "Live Ops" don't appear verbatim in JDs),
    // the entire score collapses to 0. If the job title overlaps with the candidate's headline,
    // give a minimum floor so the LLM phase can still evaluate the match.
    if (keywordScore === 0 && titleOverlap.length > 0) {
        keywordScore = 15; // ~25% base score — enough to pass threshold for LLM evaluation
    }

    // FINAL SCORE CONSOLIDATION
    // Base Keyword Score is normalized against a "Standard Good Match" of 60 points
    // (Lowered from 80: real-world JDs typically match 3-5 skills, ~40-55 raw)
    let finalScore = (keywordScore / 60) * 100;

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

    if (negativeMultiplier <= 0.01) {
        finalScore = Math.min(finalScore, 5);
    }
    // Domain mismatch hard cap — confirmed wrong industry should never score well
    if (domainResult.reason === 'mismatch') {
        finalScore = Math.min(finalScore, isExploreMode ? 40 : 25);
    }
    if (!isExploreMode) {
        if (roleFamilyMultiplier <= 0.4) {
            finalScore = Math.min(finalScore, 50); // Cross-family mismatch hard cap
        } else if (roleFamilyMultiplier <= 0.65) {
            finalScore = Math.min(finalScore, 60); // Unclassified or zero-overlap title cap
        }
    } else {
        // Explore mode: softer caps to let adjacent roles through
        if (roleFamilyMultiplier <= 0.75) {
            finalScore = Math.min(finalScore, 75);
        }
    }
    if (seniorityMultiplier <= 0.1) {
        finalScore = Math.min(finalScore, 30);
    }

    return {
        score: Math.round(Math.min(finalScore, 100)),
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
