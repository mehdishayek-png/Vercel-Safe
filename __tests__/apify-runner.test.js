import { describe, expect, it, vi } from 'vitest';
import { normalizeActorLocation, runActorWithinBudget } from '../lib/sources/apify-runner.js';

describe('Apify source budget', () => {
    it('normalizes verbose locations for actor inputs', () => {
        expect(normalizeActorLocation(' Bengaluru,  Karnataka, India ')).toBe('Bengaluru, Karnataka, India');
        expect(normalizeActorLocation('Bengaluru, Karnataka, India', { cityOnly: true })).toBe('Bengaluru');
        expect(normalizeActorLocation('Remote - India')).toBe('Remote');
    });

    it('aborts overdue runs but returns their partial dataset', async () => {
        const abort = vi.fn().mockResolvedValue({ status: 'ABORTED' });
        const listItems = vi.fn().mockResolvedValue({ items: [{ title: 'Useful partial result' }] });
        const client = {
            actor: vi.fn(() => ({
                call: vi.fn().mockResolvedValue({ id: 'run-1', status: 'RUNNING', defaultDatasetId: 'data-1' }),
            })),
            run: vi.fn(() => ({ abort })),
            dataset: vi.fn(() => ({ listItems })),
        };

        const result = await runActorWithinBudget(client, 'actor/id', { query: 'strategy' }, { maxItems: 10 });

        expect(abort).toHaveBeenCalledOnce();
        expect(result.partial).toBe(true);
        expect(result.status).toBe('ABORTED_BY_SEARCH_BUDGET');
        expect(result.items).toHaveLength(1);
        expect(listItems).toHaveBeenCalledWith({ limit: 10 });
    });
});
