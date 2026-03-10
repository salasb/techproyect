/**
 * Auth Utilities (v1.2) - Strict Environment Detection
 */

/**
 * Constructs the base URL for redirects.
 * Strictly avoids localhost in production/preview environments.
 */
export const getURL = (path: string = '') => {
    const isDev = process.env.NODE_ENV === 'development';
    
    // 1. Priority: Explicit Site URL (Production/Staging)
    let url = process.env.NEXT_PUBLIC_SITE_URL;
    
    // 2. Fallback: Vercel Auto-generated URL (Previews)
    if (!url) {
        url = process.env.NEXT_PUBLIC_VERCEL_URL;
    }

    // 3. Last Resort: Localhost (ONLY in dev mode)
    if (!url && isDev) {
        url = 'http://localhost:3000';
    }

    // Safety Check: If we are not in dev and have no URL, we have a CRITICAL config error
    if (!url) {
        console.error('[AUTH][FATAL] NEXT_PUBLIC_SITE_URL is missing in a non-development environment.');
        // We return an empty string or a placeholder to avoid sending a valid but broken localhost link
        return `https://MISSING_SITE_URL_CONFIG_IN_VERCEL${path}`;
    }

    // 4. Normalization
    // Ensure protocol
    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }
    
    // Remove trailing slash to avoid double slashes during concatenation
    url = url.endsWith('/') ? url.slice(0, -1) : url;
    
    // Add the path (ensure it starts with /)
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const finalUrl = `${url}${cleanPath}`;
    
    console.log(`[AUTH][DEBUG] Generated URL: ${finalUrl} (Source: ${process.env.NODE_ENV})`);
    return finalUrl;
};
