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
    const orgId = request.cookies.get('app-org-id')?.value

    // Fetch default org if not in cookies
    let currentOrgId = orgId;
    if (!currentOrgId) {
        const { data: member } = await supabase
            .from('OrganizationMember')
            .select('organizationId')
            .eq('userId', user.id)
            .limit(1)
            .maybeSingle();

        if (member?.organizationId) {
            currentOrgId = member.organizationId;
            response.cookies.set('app-org-id', currentOrgId, {
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
