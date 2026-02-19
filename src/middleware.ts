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

    // 2. Auth Guard (Login)
    if (request.nextUrl.pathname.startsWith('/login')) {
        if (user) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
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

    // 4. Org Context & Onboarding Enforcement
    const orgIdFromCookie = request.cookies.get('app-org-id')?.value
    let currentOrgId = orgIdFromCookie;

    // VALIDATE MEMBERSHIP IF FROM COOKIE
    if (orgIdFromCookie) {
        const { data: membership } = await supabase
            .from('OrganizationMember')
            .select('status')
            .eq('organizationId', orgIdFromCookie)
            .eq('userId', user.id)
            .eq('status', 'ACTIVE')
            .maybeSingle();

        if (!membership) {
            // Invisible security: clear invalid cookie and force re-detection or /start
            currentOrgId = undefined;
            response.cookies.delete('app-org-id');
        }
    }

    // Fetch default org if not in cookies or invalid
    if (!currentOrgId) {
        // 1. Try Membership first
        const { data: member } = await supabase
            .from('OrganizationMember')
            .select('organizationId')
            .eq('userId', user.id)
            .eq('status', 'ACTIVE') // Only active memberships
            .limit(1)
            .maybeSingle();

        if (member?.organizationId) {
            currentOrgId = member.organizationId;
        } else {
            // 2. Fallback: Check Profile.organizationId (Legacy/Single org mode)
            const { data: profile } = await supabase
                .from('Profile')
                .select('organizationId')
                .eq('id', user.id)
                .single();

            if (profile?.organizationId) {
                currentOrgId = profile.organizationId;
            }
        }

        if (currentOrgId) {
            response.cookies.set('app-org-id', currentOrgId as string, {
                httpOnly: false,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 7
            });
        }
    }

    // REDIRECT TO /START IF NO ORG (Except for Superadmins who can roam)
    if (!currentOrgId && !request.nextUrl.pathname.startsWith('/admin')) {
        const { data: profile } = await supabase.from('Profile').select('role').eq('id', user.id).single();
        if (profile?.role !== 'SUPERADMIN') {
            return NextResponse.redirect(new URL('/start', request.url));
        }
    }

    // 5. Subscription & State Verification
    if (currentOrgId && !request.nextUrl.pathname.startsWith('/admin')) {
        const { data: subscription } = await supabase
            .from('Subscription')
            .select('status, trialEndsAt')
            .eq('organizationId', currentOrgId)
            .maybeSingle();

        // Auto-pause trial if expired (Middleware level check)
        if (subscription?.status === 'TRIALING' && subscription.trialEndsAt) {
            const now = new Date();
            const trialEnd = new Date(subscription.trialEndsAt);
            if (now > trialEnd) {
                // Update via SQL (Silent update here, next request will see PAUSED)
                await supabase.from('Subscription').update({ status: 'PAUSED' }).eq('organizationId', currentOrgId);
            }
        }
    }

    // 6. Role-Based Route Protection (RBAC)
    const restrictedPaths = ['/settings/users', '/settings/organization', '/admin'];
    const isRestrictedPath = restrictedPaths.some(path => request.nextUrl.pathname.startsWith(path));

    if (isRestrictedPath) {
        const { data: profile } = await supabase.from('Profile').select('role').eq('id', user.id).single();
        const role = profile?.role;

        if (request.nextUrl.pathname.startsWith('/admin') && role !== 'SUPERADMIN') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        if (!request.nextUrl.pathname.startsWith('/admin') && role !== 'ADMIN' && role !== 'SUPERADMIN') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

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
