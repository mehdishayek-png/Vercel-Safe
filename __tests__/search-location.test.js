import { describe, expect, it } from 'vitest';
import { resolveSearchLocation } from '../lib/search-location.js';

describe('search location resolution', () => {
    it('infers India from a city-only location', () => {
        expect(resolveSearchLocation({ location: 'Bengaluru' })).toMatchObject({
            city: 'Bengaluru',
            countryCode: 'in',
            adzunaCountry: 'in',
            region: 'india',
            resolutionSource: 'city',
        });
    });

    it('infers the United States from a state abbreviation', () => {
        expect(resolveSearchLocation({ location: 'Austin, TX' })).toMatchObject({
            city: 'Austin',
            countryCode: 'us',
            adzunaCountry: 'us',
            resolutionSource: 'city',
        });
    });

    it('does not confuse US state codes with country codes', () => {
        expect(resolveSearchLocation({ location: 'San Francisco, CA' })).toMatchObject({
            countryCode: 'us',
            resolutionSource: 'city',
        });
        expect(resolveSearchLocation({ location: 'Indianapolis, IN' })).toMatchObject({
            countryCode: 'us',
            resolutionSource: 'state',
        });
    });

    it('does not silently default an unknown location to the US or India', () => {
        expect(resolveSearchLocation({ location: 'Exampleville' })).toMatchObject({
            city: 'Exampleville',
            countryCode: '',
            adzunaCountry: '',
            resolutionSource: 'unresolved',
        });
    });

    it('preserves an explicit country for remote searches', () => {
        expect(resolveSearchLocation({ location: 'Remote', country: 'India', remoteOnly: true })).toMatchObject({
            actorLocation: 'Remote',
            countryCode: 'in',
            isRemote: true,
        });
    });
});
