'use client';

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function ReportsTabs() {
    const searchParams = useSearchParams();
    const view = searchParams.get('view') || 'financial';

    return (
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg">
            <Link
                href="/reports?view=financial"
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'financial' ? 'bg-white dark:bg-black shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
                Financiero
            </Link>
            <Link
                href="/reports?view=inventory"
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'inventory' ? 'bg-white dark:bg-black shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
                Inventario
            </Link>
        </div>
    );
}
