import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    const traceId = Math.random().toString(36).substring(7).toUpperCase();
    const pathname = request.nextUrl.pathname;
    
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) => {
                        const opt = { ...options };
                        if (process.env.VERCEL_ENV === 'preview') {
                            delete opt.domain;
                        }
                        response.cookies.set(name, value, opt);
                    })
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isPublicRoute = ['/login', '/signup', '/forgot-password', '/favicon.ico'].some(p => pathname.startsWith(p)) || pathname.startsWith('/auth') || pathname.startsWith('/api');
    const isAsset = pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/);

    // Debug logging
    if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview') {
        console.log(`[Middleware][${traceId}] Path: ${pathname}, Authed: ${!!user}`);
    }

    if (isAsset) return response;

    // Core Auth Guard
    if (!user && !isPublicRoute) {
        const target = '/login';
        const res = NextResponse.redirect(new URL(target, request.url));
        res.headers.set('x-redirect-reason', 'unauthed_protected_access');
        res.headers.set('x-redirect-target', target);
        return res;
    }

    if (user && pathname === '/login') {
        const target = '/';
        const res = NextResponse.redirect(new URL(target, request.url));
        res.headers.set('x-redirect-reason', 'authed_login_access');
        res.headers.set('x-redirect-target', target);
        return res;
    }

    // Security Headers
    const cspHeader = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://m.stripe.network https://*.supabase.co;
        style-src 'self' 'unsafe-inline';
        img-src 'self' blob: data: https://*.stripe.com;
        font-src 'self' data:;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        frame-src 'self' https://js.stripe.com https://hooks.stripe.com;
        connect-src 'self' https://api.stripe.com https://m.stripe.network https://*.supabase.co https://*.supabase.in;
        upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    return response
}

export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
