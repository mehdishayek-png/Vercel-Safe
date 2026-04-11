import { describe, it, expect, beforeEach } from 'vitest';
import { withCircuitBreaker, getCircuitState, resetCircuit } from '../lib/circuit-breaker.js';

beforeEach(() => {
    resetCircuit('test');
});

describe('circuit-breaker', () => {
    it('stays closed on success', async () => {
        const result = await withCircuitBreaker('test', () => Promise.resolve([1, 2, 3]));
        expect(result).toEqual([1, 2, 3]);
        expect(getCircuitState('test').state).toBe('closed');
        expect(getCircuitState('test').failures).toBe(0);
    });

    it('opens after 3 failures (default threshold)', async () => {
        const fail = () => Promise.reject(new Error('fail'));

        for (let i = 0; i < 3; i++) {
            try { await withCircuitBreaker('test', fail); } catch {}
        }

        expect(getCircuitState('test').state).toBe('open');
        expect(getCircuitState('test').failures).toBe(3);
    });

    it('returns [] during cooldown when open', async () => {
        const fail = () => Promise.reject(new Error('fail'));
        for (let i = 0; i < 3; i++) {
            try { await withCircuitBreaker('test', fail); } catch {}
        }

        // Circuit is open — should fast-fail with []
        const result = await withCircuitBreaker('test', () => Promise.resolve(['should not run']));
        expect(result).toEqual([]);
    });

    it('half-opens after cooldown expires', async () => {
        const fail = () => Promise.reject(new Error('fail'));
        // Use 100ms cooldown so test doesn't have to wait
        for (let i = 0; i < 3; i++) {
            try { await withCircuitBreaker('test', fail, { cooldownMs: 100 }); } catch {}
        }
        expect(getCircuitState('test').state).toBe('open');

        // Wait for cooldown to expire
        await new Promise(r => setTimeout(r, 150));

        // Should allow a probe call (half-open) and recover
        const result = await withCircuitBreaker('test', () => Promise.resolve(['recovered']), { cooldownMs: 100 });
        expect(result).toEqual(['recovered']);
        expect(getCircuitState('test').state).toBe('closed');
    });

    it('resets circuit state', async () => {
        const fail = () => Promise.reject(new Error('fail'));
        for (let i = 0; i < 3; i++) {
            try { await withCircuitBreaker('test', fail); } catch {}
        }
        expect(getCircuitState('test').state).toBe('open');

        resetCircuit('test');
        expect(getCircuitState('test').state).toBe('closed');
        expect(getCircuitState('test').failures).toBe(0);
    });
});
