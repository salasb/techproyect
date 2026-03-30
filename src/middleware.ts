import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware Recovery Mode (v1.5)
 * Goal: Eliminate redirect loops and PREVENT idle session decay.
 * Strategy: Bypass static assets early. Ensure getUser() runs to refresh token. Propagate cookies correctly on redirect.
 */
export async function updateSession(request: NextRequest) {
    const traceId = Math.random().toString(36).substring(7).toUpperCase();
    const pathname = request.nextUrl.pathname;
    
    // A) EARLY BYPASS FOR STATIC ASSETS (Performance)
    const isAsset = pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|css|js|woff2?)$/) || pathname.startsWith('/_next');
    if (isAsset) {
        return NextResponse.next();
    }
    
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

    // CRITICAL: This call refreshes the session if expired. It MUST run for all logic routes.
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // B) INFRASTRUCTURE BYPASS
    const bypassList = [
        '/login', '/signup', '/forgot-password', 
        '/auth', '/api', '/favicon.ico', 
        '/start', '/pending-activation', '/logout'
    ];
    const isBypass = bypassList.some(p => pathname.startsWith(p));

    if (isBypass) {
        // Return the tracked response to guarantee cookie persistence
        return response;
    }

    // C) SESSION GUARD
    if (!user) {
        const target = '/login';
        const redirectUrl = new URL(target, request.url);
        const res = NextResponse.redirect(redirectUrl);
        
        // Propagate refreshed cookies (like deleted tokens) to the redirect response
        response.cookies.getAll().forEach(cookie => {
            res.cookies.set(cookie.name, cookie.value, cookie);
        });

        res.headers.set('x-redirect-reason', 'unauthed_access_or_idle_decay');
        res.headers.set('x-redirect-target', target);
        res.headers.set('x-trace-id', traceId);
        return res;
    }

    // D) AUTHENTICATED -> Let it pass with refreshed cookies.
    return response
}

export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

