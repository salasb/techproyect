/**
 * Auth Utilities (v1.1)
 */

/**
 * Constructs the base URL for redirects, handling Local, Vercel Preview, and Production.
 */
export const getURL = (path: string = '') => {
    // 1. Try environment variables (Production/Staging/Preview)
    let url =
        process?.env?.NEXT_PUBLIC_SITE_URL ?? 
        process?.env?.NEXT_PUBLIC_VERCEL_URL;
    
    // 2. Fallback to localhost only if explicitly in local environment or if nothing else is available
    if (!url) {
        url = 'http://localhost:3000/';
    }
    
    // 3. Normalization
    // Make sure to include `https://` when not localhost.
    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }
    
    // Make sure to include a trailing `/`.
    if (!url.endsWith('/')) {
        url = `${url}/`;
    }
    
    // 4. Construction
    const cleanPath = path.replace(/^\/+/, '');
    const finalUrl = `${url}${cleanPath}`;
    
    console.log(`[AUTH][URL] Redirect URL generated: ${finalUrl}`);
    return finalUrl;
};
