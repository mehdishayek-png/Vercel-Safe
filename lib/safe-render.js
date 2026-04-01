/**
 * Safely convert any value to a renderable string.
 * LLM responses are unpredictable — fields can be strings, objects, arrays, or null.
 * React error #31 crashes the page if an object is rendered as a child.
 * This is the ONLY way AI data should reach JSX.
 */
export function safe(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(safe).join(', ');
    if (typeof value === 'object') {
        // Common LLM response shapes — extract the most likely text field
        return value.text || value.concern || value.message || value.description
            || value.label || value.name || value.value || value.content
            || JSON.stringify(value);
    }
    return String(value);
}

/**
 * Safely handle an array of items that might be strings or objects.
 * Returns an array of {text, ...rest} objects safe for rendering.
 */
export function safeArray(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
        if (typeof item === 'string') return { text: item };
        if (typeof item === 'object' && item !== null) {
            return { ...item, text: safe(item) };
        }
        return { text: String(item) };
    });
}
