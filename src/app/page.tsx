import { redirect, unstable_rethrow } from 'next/navigation';
import { resolveAccessContext } from '@/lib/auth/access-resolver';

export const dynamic = 'force-dynamic';

/**
 * Root Landing Page (Canonical Gateway)
 * Implements Rule 2: Global operators land in Global Cockpit.
 */
export default async function Home() {
  let context;
  try {
    context = await resolveAccessContext();
  } catch (e: any) {
    unstable_rethrow(e);

    if (e.message === 'UNAUTHORIZED') {
        redirect('/login');
    }
    // Fallback to login on any other error
    console.error(`[Home] Error resolving access context:`, e.message);
    redirect('/login');
  }
  
  if (!context) redirect('/login');

  // RULE: Global operators land in /admin by default
  if (context.isGlobalOperator) {
      console.log(`[Home][${context.traceId}] Root landing: Global Operator -> /admin`);
      redirect('/admin');
  }

  // Default: land in dashboard
  console.log(`[Home][${context.traceId}] Root landing: Tenant User -> /dashboard`);
  redirect('/dashboard');
}
