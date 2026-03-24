/**
 * Auth Utilities (v1.3) - Strict Environment Detection & Canonical Routing
 */

/**
 * Constructs the base URL for redirects.
 * Strictly avoids localhost in production/preview environments.
 */
export const getURL = (path: string = '') => {
    const isDev = process.env.NODE_ENV === 'development';
    
    // 1. Priority: Explicit Site URL (Production/Staging)
    let url = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
    
    // 2. Fallback: Vercel Auto-generated URL (Previews)
    if (!url) {
        url = process.env.NEXT_PUBLIC_VERCEL_URL;
    }

    // 3. Last Resort: Production Canonical (Better than broken localhost or MISSING_SITE_URL)
    if (!url && !isDev) {
        url = 'techproyect.vercel.app';
    }

    if (!url && isDev) {
        url = 'http://localhost:3000';
    }

    // 4. Normalization (v1.3 Fix: Ensure string for TS)
    let normalizedUrl = url || (isDev ? 'http://localhost:3000' : 'https://techproyect.vercel.app');

    // Ensure protocol
    if (!normalizedUrl.startsWith('http')) {
        normalizedUrl = `https://${normalizedUrl}`;
    }
    
    // Remove trailing slash to avoid double slashes during concatenation
    if (normalizedUrl.endsWith('/')) {
        normalizedUrl = normalizedUrl.slice(0, -1);
    }
    
    // Add the path (ensure it starts with /)
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const finalUrl = `${normalizedUrl}${cleanPath}`;
    
    if (!isDev) {
        console.log(`[AUTH][DEBUG] Generated URL: ${finalUrl} (Source: ${process.env.NODE_ENV})`);
    }
    
    return finalUrl;
};
