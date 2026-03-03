import { redirect } from 'next/navigation';
import { resolveRedirect } from '@/lib/auth/redirect-resolver';

export default async function Home() {
  console.log("[RootPage] Resolving workspace state...");
  const { getWorkspaceState } = await import('@/lib/auth/workspace-resolver');
  const workspace = await getWorkspaceState();
  
  const redirectPath = resolveRedirect({
    pathname: '/',
    isAuthed: workspace.status !== 'NOT_AUTHENTICATED',
    hasOrgContext: !!workspace.activeOrgId,
    recommendedRoute: workspace.recommendedRoute
  });

  console.log(`[RootPage] Status: ${workspace.status}, Redirect Target: ${redirectPath}`);
  
  if (redirectPath && redirectPath !== '/') {
    redirect(redirectPath);
  }
  
  // Fallback if resolver says stay but we are on /
  redirect(workspace.recommendedRoute || '/dashboard');
}
