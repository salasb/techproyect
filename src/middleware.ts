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

    // 1. Auth Guard (Login)
    if (request.nextUrl.pathname.startsWith('/login')) {
        if (user) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
        return response
    }

    if (!user && !request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 2. Org Context Management
    if (user && !request.nextUrl.pathname.startsWith('/login')) {
        const orgId = request.cookies.get('app-org-id')?.value

        if (!orgId) {
            // User authenticated but no Org Context. Fetch default.
            try {
                const { data: member } = await supabase
                    .from('OrganizationMember')
                    .select('organizationId')
                    .eq('userId', user.id)
                    .limit(1)
                    .single()

                if (member?.organizationId) {
                    // Check if organization is ACTIVE and get user role
                    const { data: memberData } = await supabase
                        .from('OrganizationMember')
                        .select('role, organization:Organization(status)')
                        .eq('organizationId', member.organizationId)
                        .eq('userId', user.id)
                        .single();

                    const orgStatus = (memberData?.organization as any)?.status;
                    const userRole = memberData?.role;

                    if (orgStatus && orgStatus !== 'ACTIVE' && !request.nextUrl.pathname.startsWith('/pending-activation')) {
                        return NextResponse.redirect(new URL('/pending-activation', request.url))
                    }

                    // 3. Role-Based Route Protection (RBAC)
                    const restrictedPaths = ['/settings/users', '/settings/organization', '/admin'];
                    const isRestrictedPath = restrictedPaths.some(path => request.nextUrl.pathname.startsWith(path));

                    if (isRestrictedPath) {
                        const { data: profile } = await supabase.from('Profile').select('role').eq('id', user.id).single();
                        const role = profile?.role;

                        if (request.nextUrl.pathname.startsWith('/admin') && role !== 'SUPERADMIN') {
                            return NextResponse.redirect(new URL('/dashboard', request.url));
                        }

                        // For other restricted paths, must be ADMIN or SUPERADMIN
                        if (!request.nextUrl.pathname.startsWith('/admin') && role !== 'ADMIN' && role !== 'SUPERADMIN') {
                            return NextResponse.redirect(new URL('/dashboard', request.url));
                        }
                    }

                    // Set cookie for subsequent requests
                    response.cookies.set('app-org-id', member.organizationId, {
                        httpOnly: false,
                        sameSite: 'lax',
                        secure: process.env.NODE_ENV === 'production',
                        maxAge: 60 * 60 * 24 * 7
                    })
                }
            } catch (e) {
                console.error("Failed to fetch organization context:", e)
            }
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
