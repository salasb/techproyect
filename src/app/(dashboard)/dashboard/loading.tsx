import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { ReportExportButton } from "@/components/dashboard/ReportExportButton";

export default function DashboardLoading() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <Skeleton className="h-9 w-48 mb-2" />
                    <Skeleton className="h-5 w-64" />
                </div>
                <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-36 rounded-lg" />
                </div>
            </div>

            {/* 1. KPIs Section Skeleton */}
            <DashboardKPIs isLoading={true} />

            {/* 2. Main Grid Layout Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Revenue Chart (Span 2) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card rounded-xl border border-border shadow-sm p-6 h-[400px]">
                        <div className="mb-6">
                            <Skeleton className="h-6 w-40 mb-2" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="w-full h-[300px]" />
                    </div>

                    {/* Pending Tasks Widget Skeleton */}
                    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                        <Skeleton className="h-6 w-40 mb-4" />
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Widgets Stack */}
                <div className="space-y-6">
                    {/* Billing Alerts Skeleton */}
                    <div className="h-[300px] bg-card rounded-xl border border-border p-6 shadow-sm">
                        <Skeleton className="h-6 w-32 mb-4" />
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    </div>

                    {/* Top Clients Skeleton */}
                    <div className="h-[300px] bg-card rounded-xl border border-border p-6 shadow-sm">
                        <Skeleton className="h-6 w-32 mb-4" />
                        <Skeleton className="w-full h-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}
