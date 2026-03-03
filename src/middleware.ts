import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware Recovery Mode (v1.0)
 * Goal: Zero redirect loops.
 * Responsibility: Only validate session. Routing logic belongs to Node runtime.
 */
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

    // A) TOTAL BYPASS (Public & Safe Harbors)
    const publicPrefixes = ['/login', '/signup', '/forgot-password', '/auth', '/api', '/_next', '/favicon.ico', '/start', '/org/select', '/pending-activation'];
    const isPublic = publicPrefixes.some(p => pathname.startsWith(p));
    const isAsset = pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|css|js)$/);

    if (isPublic || isAsset) {
        return response;
    }

    // B) CORE SESSION GUARD
    if (!user) {
        const target = '/login';
        const res = NextResponse.redirect(new URL(target, request.url));
        res.headers.set('x-redirect-reason', 'unauthed_protected_access');
        res.headers.set('x-redirect-target', target);
        return res;
    }

    // C) LOGGED IN -> Let it pass. 
    // Org context resolution happens in Server Components (Layouts/Pages).
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
