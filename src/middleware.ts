import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // 1. Skip middleware for static assets
    if (request.nextUrl.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)) {
        return response;
    }

    // 1.5 Bypass for forensics and E2E endpoints
    if (request.nextUrl.pathname.startsWith('/api/forensics') || request.nextUrl.pathname.startsWith('/api/e2e')) {
        return response;
    }

    // 2. Auth Guard (Login)
    if (request.nextUrl.pathname.startsWith('/login')) {
        if (user) {
            return NextResponse.redirect(new URL('/', request.url))
        }
        return response
    }

    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 3. Start/Onboarding Guard
    // Allow access to /start for everyone authenticated
    if (request.nextUrl.pathname.startsWith('/start')) {
        return response;
    }

    // 4. Role-Based Route Protection (RBAC) - Moving to Node Runtime layouts
    // In middleware we only ensure the user is authenticated.
    // Fine-grained access control will happen in Server Components.

    // 7. Security Headers
    // Content Security Policy (CSP)
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

    // HSTS (Strict-Transport-Security) - Enabled for 1 year in production
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
