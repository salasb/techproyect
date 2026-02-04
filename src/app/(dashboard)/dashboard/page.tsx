
import { createClient } from "@/lib/supabase/server";
import { calculateProjectFinancials } from "@/services/financialCalculator";
import { Database } from "@/types/supabase";
import { ArrowUpRight, CheckCircle2, DollarSign, Wallet } from "lucide-react";
import Link from "next/link";
import { FinancialActivityChart } from "@/components/dashboard/FinancialActivityChart";
import { FocusBoard } from "@/components/dashboard/FocusBoard";

import { DashboardService } from "@/services/dashboardService";
import { DEFAULT_VAT_RATE } from "@/lib/constants";

type Settings = Database['public']['Tables']['Settings']['Row']

export default async function DashboardPage() {
    const supabase = await createClient();

    // 1. Fetch Global Settings (VAT, etc)
    const { data: settingsData } = await supabase.from('Settings').select('*').single();
    const settings = settingsData || { vatRate: DEFAULT_VAT_RATE } as Settings;

    // 2. Fetch Projects (Active & Recent)
    const { data: projectsData } = await supabase
        .from('Project')
        .select(`
            *,
            company:Company(*),
            costEntries:CostEntry(*),
            invoices:Invoice(*)
        `)
        .order('updatedAt', { ascending: false });

    const projects = projectsData || [];

    // 3. Calculate Global KPIs
    const activeProjects = projects.filter(p => p.status === 'EN_CURSO' || p.status === 'EN_ESPERA');

    let totalBudgetGross = 0;
    let totalReceivableGross = 0;
    let totalInvoicedGross = 0;
    let totalMarginNet = 0;
    let totalEffenciency = 0; // Avg progress

    projects.forEach(p => {
        const fin = calculateProjectFinancials(p, p.costEntries || [], p.invoices || [], settings!);

        // Accumulate totals
        // Use priceGross (Project Total Value) for Budget Total
        if (p.status !== 'CANCELADO' && p.status !== 'CERRADO') {
            totalBudgetGross += fin.priceGross;
        }

        totalInvoicedGross += fin.totalInvoicedGross;
        totalReceivableGross += fin.receivableGross;
        totalMarginNet += fin.marginAmountNet;
    });

    const avgProgress = projects.length > 0
        ? (projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length).toFixed(0)
        : 0;
    // 4. Calculate Financial Trends for Chart (Last 6 Months)
    const chartData = DashboardService.getFinancialTrends(projects as any);

    // Focus Board Data
    const { blockedProjects, focusProjects } = DashboardService.getFocusBoardData(projects as any);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
                    <p className="text-muted-foreground mt-1">Resumen general de tu operación.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Link href="/projects/new">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
                            + Nuevo Proyecto
                        </button>
                    </Link>
                </div>
            </div>

            <FocusBoard blockedProjects={blockedProjects} activeProjects={focusProjects} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Proyectos Activos"
                    value={activeProjects.length.toString()}
                    icon={CheckCircle2}
                    color="blue"
                    subtext="En curso o espera"
                />
                <StatCard
                    title="Presupuesto Activo"
                    value={`$${(totalBudgetGross / 1000000).toFixed(1)}M`}
                    icon={Wallet}
                    color="green"
                    subtext="Valor total proyectos activos"
                />
                <StatCard
                    title="Por Cobrar"
                    value={`$${(totalReceivableGross / 1000).toFixed(0)}k`}
                    icon={DollarSign}
                    color="amber"
                    subtext="Facturas emitidas impagas"
                />
                <StatCard
                    title="Eficiencia Global"
                    value={`${avgProgress}%`}
                    icon={ArrowUpRight}
                    color="purple"
                    subtext="Progreso promedio"
                />
                <StatCard
                    title="Ganancia Acumulada"
                    value={`$${(totalMarginNet / 1000000).toFixed(1)}M`}
                    icon={DollarSign}
                    color="emerald"
                    subtext="Margen total (Neto)"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 bg-card rounded-xl border border-border shadow-sm p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-foreground">Actividad Financiera</h3>
                        <p className="text-sm text-muted-foreground">Ingresos vs Costos (Últimos 6 meses)</p>
                    </div>

                    <div className="-ml-2">
                        <FinancialActivityChart data={chartData} />
                    </div>
                </div>

                <div className="col-span-3 bg-card rounded-xl border border-border shadow-sm p-6 overflow-hidden">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Últimos Proyectos</h3>
                    <div className="space-y-4">
                        {projects.slice(0, 5).map((p) => (
                            <div key={p.id} className="flex items-center group">
                                <div className="ml-0 space-y-1 flex-1">
                                    <Link href={`/projects/${p.id}`} className="text-sm font-medium leading-none text-foreground group-hover:text-primary transition-colors block truncate">
                                        {p.name}
                                    </Link>
                                    <p className="text-xs text-muted-foreground truncate">{p.company?.name || 'Sin Cliente'}</p>
                                </div>
                                <div className="ml-auto font-medium text-xs text-muted-foreground whitespace-nowrap">
                                    {new Date(p.updatedAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                        {projects.length === 0 && <p className="text-sm text-muted-foreground">No hay proyectos recientes.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, subtext }: any) {
    const colors: any = {
        blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
        green: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
        amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
        purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400",
        emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400",
    }

    return (
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                <div className={`p-2 rounded-lg ${colors[color]}`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
        </div>
    )
}
