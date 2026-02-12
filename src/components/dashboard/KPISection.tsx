'use client';

import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Activity, Target } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { ExchangeRate } from '@/services/currency';

import { Skeleton } from "@/components/ui/skeleton";

interface KPIProps {
    isLoading?: boolean;
    totalRevenue: number;
    pipelineValue: number;
    avgMargin: number;
    marginAmount: number;
    exchangeRateInfo?: ExchangeRate;
}

export function KPISection({ isLoading, totalRevenue, pipelineValue, avgMargin, marginAmount, exchangeRateInfo }: KPIProps) {

    // Helper for currency
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">

            {/* CARD 1: REVENUE (Realized) */}
            <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm group hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Facturación Total</h3>
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-100 transition-all duration-300">
                        <DollarSign className="w-5 h-5" />
                    </div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                        {isLoading ? <Skeleton className="h-8 w-32" /> : formatMoney(totalRevenue)}
                    </div>
                </div>
            </div>

            {/* CARD 2: PIPELINE (Future) */}
            <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm group hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Por Facturar</h3>
                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
                        <Wallet className="w-5 h-5" />
                    </div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                        {isLoading ? <Skeleton className="h-8 w-32" /> : formatMoney(pipelineValue)}
                    </div>
                </div>
            </div>

            {/* CARD 3: MARGIN (Profitability) - Expanded */}
            <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm group hover:shadow-md transition-all duration-300 md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Margen Esperado (Utilidad)</h3>
                        {isLoading ? (
                            <Skeleton className="h-3 w-48 mt-1" />
                        ) : (
                            exchangeRateInfo && (
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                                    USD/CLP: ${exchangeRateInfo.value.toLocaleString('es-CL')} ({exchangeRateInfo.date ? new Date(exchangeRateInfo.date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}) • {exchangeRateInfo.source}
                                </span>
                            )
                        )}
                    </div>
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300">
                        <Activity className="w-5 h-5" />
                    </div>
                </div>
                <div>
                    <div className="flex items-end gap-3 mb-1">
                        <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                            {isLoading ? <Skeleton className="h-9 w-40" /> : formatMoney(marginAmount)}
                        </div>
                        {isLoading ? (
                            <Skeleton className="h-6 w-16" />
                        ) : (
                            <div className={`flex items-center pb-1.5 ${avgMargin >= 30 ? 'text-emerald-500' : avgMargin >= 20 ? 'text-amber-500' : 'text-red-500'}`}>
                                <span className="text-sm font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                                    {avgMargin.toFixed(0)}%
                                </span>
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Utilidad Proyectada Global
                    </p>
                </div>
            </div>

        </div>
    );
}
