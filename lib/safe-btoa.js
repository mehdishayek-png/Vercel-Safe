/**
 * Safe base64 encoding that handles non-ASCII characters.
 * Standard btoa() throws on non-Latin1 characters.
 */
export function safeBtoa(str) {
    try {
        return btoa(str);
    } catch (e) {
        try {
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(_, p1) {
                return String.fromCharCode(parseInt(p1, 16));
            }));
        } catch (e2) {
            return encodeURIComponent(str);
        }
    }
}
