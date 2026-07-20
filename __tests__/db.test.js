import { describe, expect, it } from 'vitest';
import { isRetryableDbWakeError } from '../lib/db.js';

describe('database wake retry classification', () => {
    it.each(['57P03', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'])(
        'retries transient connection error %s',
        (code) => {
            expect(isRetryableDbWakeError({ code, message: 'connection failed' })).toBe(true);
        },
    );

    it('retries an explicit database startup response', () => {
        expect(isRetryableDbWakeError({ message: 'the database system is starting up' })).toBe(true);
    });

    it.each(['23505', '23503', '42601'])('does not retry query error %s', (code) => {
        expect(isRetryableDbWakeError({ code, message: 'query rejected' })).toBe(false);
    });

    it('does not retry an uncertain mid-query disconnect', () => {
        expect(isRetryableDbWakeError({ message: 'Connection terminated unexpectedly' })).toBe(false);
    });
});
