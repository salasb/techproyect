import { WorkspaceState } from "./workspace-resolver";

interface ResolveRedirectArgs {
    pathname: string;
    isAuthed: boolean;
    hasOrgContext: boolean;
    recommendedRoute?: string;
}

/**
 * Canonical Redirect Resolver (v1.2)
 * Order of logic is strictly enforced to prevent loops.
 */
export function resolveRedirect({ pathname, isAuthed, hasOrgContext, recommendedRoute }: ResolveRedirectArgs): string | null {
    const publicRoutes = ['/login', '/signup', '/forgot-password', '/auth', '/api', '/favicon.ico'];
    const isPublicRoute = publicRoutes.some(p => pathname.startsWith(p));
    const isRoot = pathname === '/';
    
    // A) NOT AUTHENTICATED
    if (!isAuthed) {
        if (isPublicRoute) return null; // Let them be on login/signup
        return '/login';
    }

    // B) AUTHENTICATED
    // If they are on a public route but already authed, they should be redirected out of it
    if (isPublicRoute) {
        // If it's an API route or auth callback, let it pass
        if (pathname.startsWith('/api') || pathname.startsWith('/auth')) return null;
        return recommendedRoute || (hasOrgContext ? '/dashboard' : '/start');
    }

    // C) NO ORG CONTEXT
    if (!hasOrgContext) {
        const safeHarbors = ['/start', '/org/select', '/pending-activation', '/logout', '/api', '/admin'];
        const isSafeHarbor = safeHarbors.some(p => pathname.startsWith(p));
        
        if (isSafeHarbor) return null;
        
        if (isRoot) return recommendedRoute || '/start';

        // Protected routes require an org, so send to start
        return '/start';
    }

    // D) HAS ORG CONTEXT
    // If they are on /start or /org/select but already have an org, send them home
    const redundantOnboarding = ['/start', '/org/select'];
    if (redundantOnboarding.some(p => pathname === p)) {
        return recommendedRoute || '/dashboard';
    }
    
    if (isRoot) {
        return recommendedRoute || '/dashboard';
    }

    return null; // Stay on current path
}


