import { describe, expect, it } from 'vitest';
import {
    buildCandidateObservation,
    explainScoreDecision,
    telemetryJobKey,
} from '../lib/search-telemetry.js';

describe('search telemetry decisions', () => {
    it('creates stable job keys from matching identity fields', () => {
        const first = telemetryJobKey({ title: 'Deal Advisory Consultant', company: 'PwC', location: 'Bengaluru' });
        const second = telemetryJobKey({ title: ' deal advisory consultant ', company: 'PWC', location: 'Bengaluru' });
        expect(first).toBe(second);
        expect(first).toHaveLength(64);
    });

    it('records the multiplier responsible for a discard', () => {
        expect(explainScoreDecision({
            score: 18,
            multipliers: { roleFamily: '0.20', domain: '1.00', location: '1.00' },
        }, 25)).toEqual({ decision: 'discarded', killer: 'role=0.20' });
    });

    it('keeps a compact observation without storing a full description', () => {
        const observation = buildCandidateObservation({
            runId: 'run-1',
            sourceName: 'Google Jobs',
            job: {
                title: 'M&A Consultant', company: 'Example', location: 'Mumbai',
                summary: 'A'.repeat(6000), apply_url: 'https://example.com/jobs/1',
            },
            pandaScore: { score: 42, multipliers: { roleFamily: '1.15' }, matches: [{ skill: 'M&A', value: 12 }] },
            displayThreshold: 20,
        });

        expect(observation.decision).toBe('displayed');
        expect(observation.description_chars).toBe(6000);
        expect(observation).not.toHaveProperty('summary');
        expect(observation.boosts).toEqual([{ skill: 'M&A', value: 12 }]);
    });
});
