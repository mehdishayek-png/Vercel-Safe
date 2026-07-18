const COUNTRY_ALIASES = {
    in: 'IN', india: 'IN',
    us: 'US', usa: 'US', 'united states': 'US', 'united states of america': 'US',
    gb: 'GB', uk: 'GB', 'united kingdom': 'GB', england: 'GB', scotland: 'GB', wales: 'GB',
    ca: 'CA', canada: 'CA',
    au: 'AU', australia: 'AU',
    de: 'DE', germany: 'DE',
    fr: 'FR', france: 'FR',
    nl: 'NL', netherlands: 'NL',
    sg: 'SG', singapore: 'SG',
    ae: 'AE', uae: 'AE', 'united arab emirates': 'AE',
    ie: 'IE', ireland: 'IE',
    nz: 'NZ', 'new zealand': 'NZ',
    za: 'ZA', 'south africa': 'ZA',
    br: 'BR', brazil: 'BR',
    pl: 'PL', poland: 'PL',
    it: 'IT', italy: 'IT',
    es: 'ES', spain: 'ES',
    se: 'SE', sweden: 'SE',
    ch: 'CH', switzerland: 'CH',
    jp: 'JP', japan: 'JP',
};

const COUNTRY_META = {
    IN: { name: 'India', region: 'india', adzuna: 'in' },
    US: { name: 'United States', region: 'us', adzuna: 'us' },
    GB: { name: 'United Kingdom', region: 'uk', adzuna: 'gb' },
    CA: { name: 'Canada', region: 'us', adzuna: 'ca' },
    AU: { name: 'Australia', region: 'us_eu', adzuna: 'au' },
    DE: { name: 'Germany', region: 'eu', adzuna: 'de' },
    FR: { name: 'France', region: 'eu', adzuna: 'fr' },
    NL: { name: 'Netherlands', region: 'eu', adzuna: 'nl' },
    SG: { name: 'Singapore', region: 'us_eu', adzuna: 'sg' },
    AE: { name: 'United Arab Emirates', region: 'us_eu', adzuna: null },
    IE: { name: 'Ireland', region: 'eu', adzuna: null },
    NZ: { name: 'New Zealand', region: 'us_eu', adzuna: 'nz' },
    ZA: { name: 'South Africa', region: 'us_eu', adzuna: 'za' },
    BR: { name: 'Brazil', region: 'us_eu', adzuna: 'br' },
    PL: { name: 'Poland', region: 'eu', adzuna: 'pl' },
    IT: { name: 'Italy', region: 'eu', adzuna: 'it' },
    ES: { name: 'Spain', region: 'eu', adzuna: null },
    SE: { name: 'Sweden', region: 'eu', adzuna: null },
    CH: { name: 'Switzerland', region: 'eu', adzuna: null },
    JP: { name: 'Japan', region: 'us_eu', adzuna: null },
};

const CITY_COUNTRIES = {
    // India
    bengaluru: 'IN', bangalore: 'IN', mumbai: 'IN', delhi: 'IN', 'new delhi': 'IN',
    hyderabad: 'IN', chennai: 'IN', kolkata: 'IN', pune: 'IN', ahmedabad: 'IN',
    noida: 'IN', gurugram: 'IN', gurgaon: 'IN', kochi: 'IN', jaipur: 'IN', lucknow: 'IN',
    chandigarh: 'IN', coimbatore: 'IN', indore: 'IN', bhubaneswar: 'IN',
    // United States
    'new york': 'US', nyc: 'US', 'san francisco': 'US', seattle: 'US', boston: 'US',
    austin: 'US', 'los angeles': 'US', chicago: 'US', denver: 'US', atlanta: 'US',
    dallas: 'US', houston: 'US', miami: 'US', portland: 'US', philadelphia: 'US',
    // UK, Canada, Australia, Europe and Asia
    london: 'GB', manchester: 'GB', edinburgh: 'GB', birmingham: 'GB', bristol: 'GB',
    toronto: 'CA', vancouver: 'CA', montreal: 'CA', ottawa: 'CA',
    sydney: 'AU', melbourne: 'AU', brisbane: 'AU', perth: 'AU',
    berlin: 'DE', munich: 'DE', frankfurt: 'DE', hamburg: 'DE',
    paris: 'FR', lyon: 'FR', amsterdam: 'NL', rotterdam: 'NL', dublin: 'IE',
    singapore: 'SG', dubai: 'AE', 'abu dhabi': 'AE', tokyo: 'JP',
};

const US_STATE_CODES = new Set([
    'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in',
    'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv',
    'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn',
    'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy', 'dc',
]);

const INDIA_STATES = new Set([
    'andhra pradesh', 'assam', 'bihar', 'chhattisgarh', 'delhi', 'goa', 'gujarat', 'haryana',
    'himachal pradesh', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh', 'maharashtra',
    'odisha', 'punjab', 'rajasthan', 'tamil nadu', 'telangana', 'uttar pradesh',
    'uttarakhand', 'west bengal',
]);

function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function countryCodeFor(value) {
    const normalized = clean(value).toLowerCase().replace(/\.$/, '');
    return COUNTRY_ALIASES[normalized] || null;
}

function inferCountry(parts, city) {
    const cityCode = CITY_COUNTRIES[city.toLowerCase()];
    if (cityCode) return { code: cityCode, source: 'city' };

    // Resolve unambiguous country names before short codes. Two-letter values
    // such as CA and IN are also US state codes and must not win prematurely.
    for (const part of [...parts].reverse()) {
        const normalized = part.toLowerCase().replace(/\.$/, '');
        if (normalized.length > 2 || ['uk', 'usa', 'uae'].includes(normalized)) {
            const direct = countryCodeFor(part);
            if (direct) return { code: direct, source: 'country' };
        }
    }

    const state = (parts[1] || '').toLowerCase().replace(/\./g, '');
    if (US_STATE_CODES.has(state)) return { code: 'US', source: 'state' };
    if (INDIA_STATES.has(state)) return { code: 'IN', source: 'state' };

    if (parts.length === 1) {
        const direct = countryCodeFor(parts[0]);
        if (direct) return { code: direct, source: 'country' };
    }
    return { code: null, source: 'unresolved' };
}

/**
 * Convert the single location field used by the search UI into source-ready
 * city/country metadata. Unknown values stay unknown instead of silently
 * defaulting to a different country.
 */
export function resolveSearchLocation({ location, country, city, state, remoteOnly = false } = {}) {
    const raw = clean(location || [city, state, country].filter(Boolean).join(', '));
    const isRemote = remoteOnly || /\b(remote|anywhere|global)\b/i.test(raw);
    const parts = raw.split(',').map(clean).filter(Boolean);
    const resolvedCity = clean(city || (isRemote ? '' : parts[0]));

    const explicitCode = countryCodeFor(country);
    const inferred = explicitCode
        ? { code: explicitCode, source: 'explicit' }
        : inferCountry(parts, resolvedCity);
    const meta = inferred.code ? COUNTRY_META[inferred.code] : null;

    return {
        raw,
        queryLocation: isRemote ? null : raw || null,
        actorLocation: isRemote ? 'Remote' : raw,
        city: resolvedCity,
        state: clean(state || parts[1]),
        countryCode: inferred.code ? inferred.code.toLowerCase() : '',
        countryName: meta?.name || '',
        adzunaCountry: meta?.adzuna || '',
        region: meta?.region || '',
        isRemote,
        resolutionSource: inferred.source,
    };
}

export { countryCodeFor };
