// lib/ats-companies.js — Company → ATS board mapping for direct career page queries
// Each entry maps a lowercase company name to its board slug on that ATS platform.
//
// Greenhouse: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
// Lever:      https://api.lever.co/v0/postings/{slug}
// Ashby:      https://api.ashbyhq.com/posting-api/job-board/{slug}

// ─── Greenhouse companies ────────────────────────────────────────────────────
export const GREENHOUSE_COMPANIES = {
  // Developer tools & infrastructure
  'stripe': 'stripe',
  'cloudflare': 'cloudflare',
  'datadog': 'datadog',
  'mongodb': 'mongodb',
  'gitlab': 'gitlab',
  'hashicorp': 'hashicorp',
  'elastic': 'elastic',
  'confluent': 'confluent',
  'cockroach labs': 'cockroachlabs',
  'planetscale': 'planetscale',
  'supabase': 'supabase',
  'vercel': 'vercel',
  'netlify': 'netlify',
  'digitalocean': 'digitalocean',
  'render': 'render',
  'fly.io': 'flyio',
  'retool': 'retool',
  'postman': 'postman',
  'snyk': 'snyk',
  'launchdarkly': 'launchdarkly',
  'dbt labs': 'dbtlabs',
  'fivetran': 'fivetran',
  'census': 'census',
  'monte carlo': 'montecarlodata',
  'amplitude': 'amplitude',

  // Productivity & design
  'notion': 'notion',
  'figma': 'figma',
  'canva': 'canva',
  'grammarly': 'grammarly',
  'zapier': 'zapier',
  'calendly': 'calendly',
  'loom': 'loom',
  'miro': 'miro',
  'webflow': 'webflow',
  'airtable': 'airtable',
  'coda': 'coda',
  'clickup': 'clickup',
  'asana': 'asana',
  'monday.com': 'mondaycom',

  // Consumer & marketplace
  'airbnb': 'airbnb',
  'doordash': 'doordash',
  'instacart': 'instacart',
  'pinterest': 'pinterest',
  'lyft': 'lyft',
  'snap inc': 'snap',
  'snap': 'snap',
  'discord': 'discord',
  'twitch': 'twitch',
  'peloton': 'peloton',
  'sweetgreen': 'sweetgreen',
  'faire': 'faire',
  'noom': 'noom',
  'compass': 'compass',

  // Fintech
  'stripe': 'stripe',
  'coinbase': 'coinbase',
  'plaid': 'plaid',
  'brex': 'brex',
  'affirm': 'affirm',
  'toast': 'toast',
  'bill.com': 'billcom',
  'melio': 'melio',
  'mercury': 'mercury',
  'nova credit': 'novacredit',

  // SaaS & B2B
  'hubspot': 'hubspot',
  'gusto': 'gusto',
  'vanta': 'vanta',
  'ro': 'ro',
  'oscar health': 'oscarhealth',

  // Security
  'crowdstrike': 'crowdstrike',
  'sentinelone': 'sentinelone',
  'zscaler': 'zscaler',
  'palo alto networks': 'paloaltonetworks',
  'lacework': 'lacework',
  'wiz': 'wiz',
  'orca security': 'orcasecurity',

  // E-commerce & DTC
  'warby parker': 'warbyparker',
  'allbirds': 'allbirds',
  'glossier': 'glossier',
  'away': 'away',
  'bombas': 'bombas',
  'casper': 'casper',
  'rent the runway': 'renttherunway',
  'stitch fix': 'stitchfix',
  'poshmark': 'poshmark',
  'chewy': 'chewy',
  'wayfair': 'wayfair',
  'etsy': 'etsy',

  // Enterprise & cloud
  'twilio': 'twilio',
  'okta': 'okta',
  'snowflake': 'snowflake',
  'palantir': 'palantir',
  'databricks': 'databricks',
  'splunk': 'splunk',
  'new relic': 'newrelic',
  'dynatrace': 'dynatrace',
  'pagerduty': 'pagerduty',
  'fastly': 'fastly',

  // Healthcare & biotech
  'tempus': 'tempus',
  'flatiron health': 'flatironhealth',
  'color health': 'color',
  'devoted health': 'devotedhealth',
  'cityblock health': 'cityblockhealth',
  'hims & hers': 'himsandhers',
  'cerebral': 'cerebral',
  'thirty madison': 'thirtymadison',

  // Media & entertainment
  'spotify': 'spotify',
  'the new york times': 'thenewyorktimes',
  'vox media': 'voxmedia',
  'buzzfeed': 'buzzfeed',
  'vice media': 'vicemedia',
  'conde nast': 'condenast',

  // Transportation & logistics
  'flexport': 'flexport',
  'convoy': 'convoy',
  'samsara': 'samsara',
  'project44': 'project44',
  'shippo': 'shippo',

  // Real estate & proptech
  'opendoor': 'opendoor',
  'offerpad': 'offerpad',
  'roofstock': 'roofstock',
  'loft': 'loft',

  // Education
  'duolingo': 'duolingo',
  'coursera': 'coursera',
  'khan academy': 'khanacademy',
  'masterclass': 'masterclass',
  'quizlet': 'quizlet',
  'chegg': 'chegg',
  'brilliant': 'brilliant',
  'codecademy': 'codecademy',

  // Recruiting & HR tech
  'deel': 'deel',
  'rippling': 'rippling',
  'remote': 'remote',
  'lattice': 'lattice',
  'gem': 'gem',

  // AI / ML
  'scale ai': 'scaleai',
  'weights & biases': 'wandb',
  'labelbox': 'labelbox',
  'snorkel ai': 'snorkelai',
  'tecton': 'tecton',

  // Gaming
  'roblox': 'roblox',
  'riot games': 'riotgames',
  'epic games': 'epicgames',
  'niantic': 'niantic',
  'unity': 'unity',

  // Crypto & web3
  'opensea': 'opensea',
  'alchemy': 'alchemy',
  'chainalysis': 'chainalysis',
  'fireblocks': 'fireblocks',
  'consensys': 'consensys',
  'circle': 'circle',

  // Food & delivery
  'gopuff': 'gopuff',
  'wolt': 'wolt',
  'getir': 'getir',

  // Insurance
  'lemonade': 'lemonade',
  'hippo': 'hippo',
  'root insurance': 'rootinsurance',
  'next insurance': 'nextinsurance',

  // Travel
  'tripadvisor': 'tripadvisor',
  'kayak': 'kayak',
  'hopper': 'hopper',

  // Analytics & data
  'mixpanel': 'mixpanel',
  'heap': 'heap',
  'segment': 'segment',
  'looker': 'looker',
  'mode': 'mode',
  'sigma computing': 'sigmacomputing',
  'domo': 'domo',

  // Communication
  'twilio': 'twilio',
  'sendgrid': 'sendgrid',
  'messagebird': 'messagebird',
  'vonage': 'vonage',

  // Additional well-known companies
  'square': 'square',
  'block': 'block',
  'shopify': 'shopify',
  'squarespace': 'squarespace',
  'wix': 'wix',
  'zendesk': 'zendesk',
  'freshworks': 'freshworks',
  'intercom': 'intercom',
  'drift': 'drift',
  'gong': 'gong',
  'outreach': 'outreach',
  'salesloft': 'salesloft',
  'docusign': 'docusign',
  'box': 'box',
  'dropbox': 'dropbox',
  'relativity': 'relativity',
  'procore': 'procore',
  'samsara': 'samsara',
  'cloudinary': 'cloudinary',
  'contentful': 'contentful',
  'algolia': 'algolia',
  'auth0': 'auth0',
  'mapbox': 'mapbox',
  'cockroach labs': 'cockroachlabs',
  'couchbase': 'couchbase',
  'timescale': 'timescale',
  'materialize': 'materialize',
  'starburst': 'starburst',
  'immerok': 'immerok',
  'temporal': 'temporal',
  'prefect': 'prefect',
  'dagster': 'dagster',
  'airbyte': 'airbyte',
  'hightouch': 'hightouch',
  'rudderstack': 'rudderstack',
  'mux': 'mux',
  'imgix': 'imgix',
  'veriff': 'veriff',
  'sardine': 'sardine',
  'alloy': 'alloy',
  'lithic': 'lithic',
  'marqeta': 'marqeta',
  'column': 'column',
  'modern treasury': 'moderntreasury',
  'increase': 'increase',
  'ramp': 'ramp',
};

// ─── Lever companies ─────────────────────────────────────────────────────────
export const LEVER_COMPANIES = {
  // Big tech / consumer
  'netflix': 'netflix',
  'reddit': 'reddit',
  'github': 'github',
  'spotify': 'spotify',

  // Fintech
  'robinhood': 'robinhood',
  'chime': 'chime',
  'marqeta': 'marqeta',
  'ramp': 'ramp',
  'square': 'square',

  // HR & people
  'gusto': 'gusto',
  'justworks': 'justworks',
  'lattice': 'lattice',
  'culture amp': 'cultureamp',
  '15five': '15five',
  'lever': 'lever',
  'greenhouse': 'greenhouse',
  'bamboohr': 'bamboohr',
  'personio': 'personio',
  'hibob': 'hibob',

  // Remote-first / HR platforms
  'deel': 'deel',
  'rippling': 'rippling',
  'remote': 'remote',
  'oyster': 'oyster',
  'papaya global': 'papayaglobal',

  // Developer tools
  'postman': 'postman',
  'sourcegraph': 'sourcegraph',
  'gitpod': 'gitpod',
  'circleci': 'circleci',
  'buildkite': 'buildkite',
  'sentry': 'sentry',
  'launchdarkly': 'launchdarkly',

  // Cloud & infra
  'digitalocean': 'digitalocean',
  'vultr': 'vultr',
  'linode': 'linode',
  'upbound': 'upbound',

  // AI / data
  'weights & biases': 'wandb',
  'labelbox': 'labelbox',
  'hugging face': 'huggingface',

  // Cybersecurity
  'snyk': 'snyk',
  'detectify': 'detectify',
  'bugcrowd': 'bugcrowd',
  'hackerone': 'hackerone',
  'huntress': 'huntress',

  // E-commerce / marketplace
  'etsy': 'etsy',
  'poshmark': 'poshmark',
  'mercari': 'mercari',
  'depop': 'depop',
  'faire': 'faire',
  'goat': 'goat',
  'stockx': 'stockx',

  // Healthcare
  'zocdoc': 'zocdoc',
  'alma': 'alma',
  'headway': 'headway',
  'spring health': 'springhealth',
  'talkiatry': 'talkiatry',

  // Edtech
  'instructure': 'instructure',
  'pluralsight': 'pluralsight',
  'udemy': 'udemy',
  'brainly': 'brainly',

  // Marketing & CX
  'braze': 'braze',
  'iterable': 'iterable',
  'customer.io': 'customerio',
  'klaviyo': 'klaviyo',
  'attentive': 'attentive',

  // Finance & banking
  'sofi': 'sofi',
  'betterment': 'betterment',
  'wealthfront': 'wealthfront',
  'acorns': 'acorns',
  'current': 'current',
  'varo': 'varo',
  'dave': 'dave',

  // Media
  'substack': 'substack',
  'medium': 'medium',
  'the athletic': 'theathletic',
  'axios': 'axios',

  // Logistics & supply chain
  'flexport': 'flexport',
  'shipbob': 'shipbob',
  'deliverr': 'deliverr',

  // Travel
  'tripadvisor': 'tripadvisor',
  'hopper': 'hopper',
  'flyr': 'flyr',
  'kiwi.com': 'kiwi',

  // Legal tech
  'ironclad': 'ironclad',
  'clio': 'clio',
  'everlaw': 'everlaw',
  'notarize': 'notarize',

  // Construction & real estate
  'procore': 'procore',
  'built technologies': 'builttechnologies',
  'lessen': 'lessen',
  'bowery valuation': 'boweryvaluation',

  // Climate & energy
  'arcadia': 'arcadia',
  'palmetto': 'palmetto',
  'span': 'span',
  'lunar energy': 'lunarenergy',
};

// ─── Ashby companies ─────────────────────────────────────────────────────────
export const ASHBY_COMPANIES = {
  // AI / LLM
  'openai': 'openai',
  'anthropic': 'anthropic',
  'cohere': 'cohere',
  'mistral': 'mistralai',
  'perplexity': 'perplexity',
  'hugging face': 'huggingface',
  'anyscale': 'anyscale',
  'together ai': 'togetherai',
  'adept': 'adept',
  'character.ai': 'characterai',
  'stability ai': 'stabilityai',
  'inflection ai': 'inflection',
  'jasper': 'jasper',
  'writer': 'writer',
  'runway': 'runway',
  'midjourney': 'midjourney',
  'replicate': 'replicate',
  'modal': 'modal',
  'deepgram': 'deepgram',
  'assemblyai': 'assemblyai',
  'eleven labs': 'elevenlabs',

  // Dev tools
  'vercel': 'vercel',
  'linear': 'linear',
  'ramp': 'ramp',
  'cursor': 'cursor',
  'replit': 'replit',
  'railway': 'railway',
  'resend': 'resend',
  'neon': 'neon',
  'turso': 'turso',
  'convex': 'convex',
  'val town': 'valtown',

  // Fintech
  'mercury': 'mercury',
  'brex': 'brex',
  'ramp': 'ramp',
  'column': 'column',
  'lithic': 'lithic',

  // Security
  'wiz': 'wiz',
  'semgrep': 'semgrep',
  'chainguard': 'chainguard',
  'material security': 'materialsecurity',

  // Data
  'motherduck': 'motherduck',
  'clickhouse': 'clickhouse',
  'readyset': 'readyset',

  // Collaboration
  'notion': 'notion',
  'liveblocks': 'liveblocks',
  'pitch': 'pitch',

  // Healthcare / bio
  'color health': 'color',
  'tempus': 'tempus',
};


// ─── Helper: find which ATS a company uses ───────────────────────────────────

/**
 * Look up a company's ATS platform and board slug.
 *
 * @param {string} companyName — the company name to search for
 * @returns {{ ats: 'greenhouse'|'lever'|'ashby', slug: string } | null}
 */
export function findCompanyATS(companyName) {
  const normalized = companyName.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

  // Exact match first
  if (GREENHOUSE_COMPANIES[normalized]) return { ats: 'greenhouse', slug: GREENHOUSE_COMPANIES[normalized] };
  if (LEVER_COMPANIES[normalized])      return { ats: 'lever',      slug: LEVER_COMPANIES[normalized] };
  if (ASHBY_COMPANIES[normalized])      return { ats: 'ashby',      slug: ASHBY_COMPANIES[normalized] };

  // Partial / fuzzy: strip non-alphanum entirely and check each map
  const stripped = normalized.replace(/\s+/g, '');

  for (const [key, slug] of Object.entries(GREENHOUSE_COMPANIES)) {
    const keyStripped = key.replace(/[^a-z0-9]/g, '');
    if (stripped === keyStripped || stripped.includes(keyStripped) || keyStripped.includes(stripped)) {
      return { ats: 'greenhouse', slug };
    }
  }
  for (const [key, slug] of Object.entries(LEVER_COMPANIES)) {
    const keyStripped = key.replace(/[^a-z0-9]/g, '');
    if (stripped === keyStripped || stripped.includes(keyStripped) || keyStripped.includes(stripped)) {
      return { ats: 'lever', slug };
    }
  }
  for (const [key, slug] of Object.entries(ASHBY_COMPANIES)) {
    const keyStripped = key.replace(/[^a-z0-9]/g, '');
    if (stripped === keyStripped || stripped.includes(keyStripped) || keyStripped.includes(stripped)) {
      return { ats: 'ashby', slug };
    }
  }

  return null;
}
