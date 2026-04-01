/**
 * Safe base64 encoding that handles non-ASCII characters.
 * Standard btoa() throws on non-Latin1 characters.
 */
export function safeBtoa(str) {
    try {
        // First try standard btoa (fastest for ASCII-only strings)
        return btoa(str);
    } catch {
        // Fallback: encode UTF-8 then base64
        try {
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
                String.fromCharCode(parseInt(p1, 16))
            ));
        } catch {
            // Last resort: use the URL as-is with encodeURIComponent
            return encodeURIComponent(str);
        }
    }
}
