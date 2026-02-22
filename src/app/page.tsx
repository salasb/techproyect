import { redirect } from 'next/navigation';
import { getWorkspaceState } from '@/lib/auth/workspace-resolver';

export default async function Home() {
  const { getWorkspaceState } = await import('@/lib/auth/workspace-resolver');
  const workspace = await getWorkspaceState();
  
  if (workspace.isSuperadmin && !workspace.activeOrgId) {
    redirect('/admin');
  }
  
  redirect('/dashboard');
}
