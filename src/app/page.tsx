import { redirect } from 'next/navigation';

export default async function Home() {
  const { getWorkspaceState } = await import('@/lib/auth/workspace-resolver');
  const workspace = await getWorkspaceState();
  
  // Use canonical recommended route from resolver (v2.1 Policy)
  if (workspace.recommendedRoute) {
    redirect(workspace.recommendedRoute);
  }
  
  // Fallback
  redirect('/dashboard');
}
