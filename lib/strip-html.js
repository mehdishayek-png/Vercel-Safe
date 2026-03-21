/**
 * Shared HTML stripping utility — single source of truth.
 * Handles entity decoding, tag removal, and embedded JSON cleanup.
 */
export function stripHtml(html) {
    if (!html) return '';

    let text = html
        // Decode HTML entities (first pass)
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        // Convert <br> to newlines before stripping
        .replace(/<br\s*\/?>/gi, '\n')
        // Strip all remaining HTML tags
        .replace(/<[^>]*>/g, ' ')
        // Second decode pass for double-encoded entities
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        // Collapse multiple spaces
        .replace(/[ \t]+/g, ' ');

    return text.trim();
}

/**
 * Extended version for UI display — also strips embedded JSON config objects
 * that sometimes appear in job descriptions from ATS systems.
 */
export function stripHtmlForDisplay(html) {
    if (!html) return '';

    let text = stripHtml(html);

    // Strip embedded JSON objects/arrays (e.g. theme config data from ATS)
    text = text.replace(/\{[\s\S]*?"[a-zA-Z_-]+"[\s\S]*?:[\s\S]*?\}/g, (match) => {
        if (match.includes('"') && match.includes(':')) {
            try { JSON.parse(match); return ''; } catch { /* not valid JSON */ }
            if (/^\s*\{.*"[a-zA-Z_-]+":\s*["{[\d]/.test(match)) return '';
        }
        return match;
    });

    return text.trim();
}
