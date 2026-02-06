'use client'

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const periods = [
    { value: '30d', label: 'Últimos 30 días' },
    { value: '6m', label: 'Últimos 6 Meses' },
    { value: '12m', label: 'Último Año' },
    { value: 'all', label: 'Todo' },
];

export function PeriodSelector() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentPeriod = searchParams.get('period') || '6m';

    const handlePeriodChange = useCallback((period: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('period', period);
        router.push(`?${params.toString()}`);
    }, [searchParams, router]);

    return (
        <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-lg">
            {periods.map((p) => (
                <button
                    key={p.value}
                    onClick={(e) => {
                        e.stopPropagation();
                        handlePeriodChange(p.value);
                    }}
                    className={`
                        px-3 py-1.5 text-xs font-medium rounded-md transition-all
                        ${currentPeriod === p.value
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                        }
                    `}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );
}
