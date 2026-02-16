'use client'

import { LayoutGrid, List } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function QuoteViewToggle({ currentView }: { currentView: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const setView = (view: 'grid' | 'list') => {
        // Set cookie manually (simple way)
        document.cookie = `app-quotes-view=${view}; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year

        // Update URL
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', view);
        router.push(`/quotes?${params.toString()}`);
    };

    return (
        <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border">
            <button
                onClick={() => setView('grid')}
                className={`p-2 rounded-md transition-all ${currentView === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="Vista Cuadrícula"
            >
                <LayoutGrid className="w-4 h-4" />
            </button>
            <button
                onClick={() => setView('list')}
                className={`p-2 rounded-md transition-all ${currentView === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="Vista Lista"
            >
                <List className="w-4 h-4" />
            </button>
        </div>
    );
}
