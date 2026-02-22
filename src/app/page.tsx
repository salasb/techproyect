import { redirect } from 'next/navigation';
import { getWorkspaceState } from '@/lib/auth/workspace-resolver';

export default async function Home() {
  const { getWorkspaceState } = await import('@/lib/auth/workspace-resolver');
  const workspace = await getWorkspaceState();
  
  // Superadmin always lands on Global Cockpit by default
  if (workspace.isSuperadmin) {
    redirect('/admin');
  }
  
  // Tenants go to dashboard (which handles its own context resolution)
  redirect('/dashboard');
}
