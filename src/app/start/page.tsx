import { NoOrgOverlay } from "@/components/auth/NoOrgOverlay";

export const dynamic = 'force-dynamic';

/**
 * Start Page (v2.0 - Safe Harbor)
 * Now uses the same robust overlay logic as the dashboard layout.
 */
export default function StartPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            {/* We render the same overlay but without the background behind it */}
            <NoOrgOverlay />
        </div>
    );
}
