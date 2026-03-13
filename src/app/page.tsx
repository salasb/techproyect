import { redirect } from 'next/navigation';
import { resolveAccessContext } from '@/lib/auth/access-resolver';

/**
 * Root Landing Page (Canonical Gateway)
 * Implements Rule 2: Global operators land in Global Cockpit.
 */
export default async function Home() {
  try {
    const context = await resolveAccessContext();
    
    // RULE: Global operators land in /admin by default
    if (context.isGlobalOperator) {
        console.log(`[Home][${context.traceId}] Root landing: Global Operator -> /admin`);
        redirect('/admin');
    }

    // Default: land in dashboard
    console.log(`[Home][${context.traceId}] Root landing: Tenant User -> /dashboard`);
    redirect('/dashboard');
    
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') {
        redirect('/login');
    }
    // Fallback to login on any other error
    console.error(`[Home] Error resolving access context:`, e.message);
    redirect('/login');
  }
}
