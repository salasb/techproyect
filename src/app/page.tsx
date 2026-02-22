import { redirect } from 'next/navigation';
import { getWorkspaceState } from '@/lib/auth/workspace-resolver';

export default async function Home() {
  const workspace = await getWorkspaceState();
  
  if (workspace.isSuperadmin) {
    redirect('/admin');
  }
  
  redirect('/dashboard');
}
