// Circuit breaker for external API sources.
// Tracks failures per source in memory. Opens circuit after threshold,
// rejects calls during cooldown, then half-opens to probe recovery.

const circuits = new Map();

const DEFAULTS = {
    failureThreshold: 3,   // failures before opening
    cooldownMs: 60_000,    // 1 minute cooldown before half-open probe
};

function getCircuit(name) {
    if (!circuits.has(name)) {
        circuits.set(name, { state: 'closed', failures: 0, lastFailure: 0 });
    }
    return circuits.get(name);
}

/**
 * Wrap an async function with circuit breaker protection.
 * @param {string} name - Source identifier (e.g., 'LinkedIn', 'JSearch')
 * @param {Function} fn - Async function to call
 * @param {Object} opts - Override failureThreshold, cooldownMs
 * @returns {Promise<any>} - Result of fn, or [] if circuit is open
 */
export async function withCircuitBreaker(name, fn, opts = {}) {
    const { failureThreshold, cooldownMs } = { ...DEFAULTS, ...opts };
    const circuit = getCircuit(name);

    if (circuit.state === 'open') {
        const elapsed = Date.now() - circuit.lastFailure;
        if (elapsed < cooldownMs) {
            // Still in cooldown — fast-fail
            return [];
        }
        // Cooldown expired — half-open, allow one probe
        circuit.state = 'half-open';
    }

    try {
        const result = await fn();
        // Success — reset circuit
        circuit.state = 'closed';
        circuit.failures = 0;
        return result;
    } catch (err) {
        circuit.failures++;
        circuit.lastFailure = Date.now();

        if (circuit.failures >= failureThreshold || circuit.state === 'half-open') {
            circuit.state = 'open';
            console.warn(`[CIRCUIT] ${name} opened after ${circuit.failures} failures: ${err.message}`);
        }

        throw err;
    }
}

/**
 * Check circuit state for a source (useful for health dashboards).
 */
export function getCircuitState(name) {
    const circuit = getCircuit(name);
    return { name, ...circuit };
}

/**
 * Get all circuit states.
 */
export function getAllCircuitStates() {
    const states = {};
    for (const [name, circuit] of circuits) {
        states[name] = { ...circuit };
    }
    return states;
}

/**
 * Reset a specific circuit (e.g., via admin endpoint).
 */
export function resetCircuit(name) {
    circuits.delete(name);
}
