import { describe, expect, it } from 'vitest';
import { getActiveSources } from '../lib/sources/registry.js';

function names(country) {
    return getActiveSources({ userCountry: country }).map((source) => source.name);
}

describe('regional source routing', () => {
    it('uses Naukri, not Dice, for India', () => {
        expect(names('in')).toContain('Naukri (Apify)');
        expect(names('in')).not.toContain('Dice (Apify)');
    });

    it('uses Dice, not Naukri, for the United States', () => {
        expect(names('us')).toContain('Dice (Apify)');
        expect(names('us')).not.toContain('Naukri (Apify)');
    });

    it('does not activate regional actors when the country is unresolved', () => {
        expect(names('')).not.toContain('Dice (Apify)');
        expect(names('')).not.toContain('Naukri (Apify)');
        expect(names('')).not.toContain('Weekday');
    });
});
