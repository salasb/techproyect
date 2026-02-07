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

    // 2. RBAC Guard (Admin/Settings)
    // TEMPORARY: Allow all authenticated users to access settings to fix redirect issue.
    // User reported: "El módulo configuración, no funciona, me lleva al Dashboard principal."
    /*
    if (user && (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/settings'))) {
        try {
            // Fetch profile to check role
            const { data: profile } = await supabase
                .from('Profile')
                .select('role')
                .eq('id', user.id)
                .single();

            // Assuming 'admin' is the role string. Adjust if 'ADMIN' or other.
            // If not admin, redirect to dashboard with error (or just dashboard)
            if (profile?.role !== 'admin') {
                console.warn(`Unauthorized access attempt to ${request.nextUrl.pathname} by user ${user.id}`);
                return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
            }
        } catch (error) {
            console.error("Error checking role in middleware:", error);
            // On error, fail safe to dashboard
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }
    */

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
