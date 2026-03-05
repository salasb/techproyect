/**
 * Auth Utilities (v1.0)
 */

/**
 * Constructs the base URL for redirects, handling Local, Vercel Preview, and Production.
 */
export const getURL = (path: string = '') => {
    let url =
        process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env vars
        process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel
        'http://localhost:3000/';
    
    // Make sure to include `https://` when not localhost.
    url = url.includes('http') ? url : `https://${url}`;
    
    // Make sure to include a trailing `/`.
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
    
    // Add the path.
    const cleanPath = path.replace(/^\/+/, '');
    return `${url}${cleanPath}`;
};
