import { createClient } from "@/lib/supabase/server";
import { calculateProjectFinancials, MinimalCostEntry, MinimalInvoice, MinimalProject } from "@/services/financialCalculator";
import { RevenueChart } from "@/components/reports/RevenueChart";
import { ProjectMarginChart } from "@/components/reports/ProjectMarginChart";
import { ClientRevenuePie } from "@/components/reports/ClientRevenuePie";
import { TrendingUp, PieChart, FileText, AlertCircle } from "lucide-react";
import { format, subMonths, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";

export default async function ReportsPage() {
    const supabase = await createClient();

    // 1. Fetch Data
    const { data: projectsRaw } = await supabase
        .from('Project')
        .select(`
            *,
            client:Client(name),
            quoteItems:QuoteItem(*),
            costEntries:CostEntry(*),
            invoices:Invoice(*)
        `)
        .neq('status', 'CANCELADO'); // Exclude cancelled

    const { data: settingsRaw } = await supabase.from('Settings').select('*').single();
    const settings = settingsRaw || { vatRate: 0.19, yellowThresholdDays: 7, defaultPaymentTermsDays: 30 };

    const projects: any[] = projectsRaw || [];

    // 2. Process Financials for each project
    const processedProjects = projects.map((p: any) => {
        const financials = calculateProjectFinancials(
            {
                budgetNet: p.budget || 0,
                marginPct: p.margin || 0.3,
                status: p.status,
                progress: p.progress,
                plannedEndDate: p.plannedEndDate
            } as MinimalProject,
            (p.costEntries || []) as MinimalCostEntry[],
            (p.invoices || []) as MinimalInvoice[],
            settings,
            p.quoteItems || []
        );

        return {
            ...p,
            financials,
            clientName: p.client?.name || 'Sin Cliente'
        };
    });

    // 3. Aggregations

    // A. KPI Cards
    const totalRevenue = processedProjects.reduce((acc: number, p: any) => acc + p.financials.priceNet, 0);
    const totalMargin = processedProjects.reduce((acc: number, p: any) => acc + p.financials.marginAmountNet, 0);
    const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    const activeProjects = processedProjects.filter((p: any) => p.status !== 'CERRADO' && p.status !== 'COMPLETADO').length;
    const pendingQuotes = processedProjects.filter((p: any) => p.stage === 'LEVANTAMIENTO').length;

    // B. Revenue Chart (Last 6 Months)
    // We ideally need dates for Invoices/Costs. 
    // Simplified: Use "Project Start Date" or Invoice Date if available. 
    // Better: Aggregating executed costs by date and invoiced amounts by date.

    const curDate = new Date();
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
        const d = subMonths(curDate, 5 - i);
        return {
            date: d,
            name: format(d, 'MMM', { locale: es }),
            income: 0,
            cost: 0,
            profit: 0 // calculated later
        };
    });

    // Populate Monthly Data
    projects.forEach((p: any) => {
        // Costs
        p.costEntries?.forEach((c: any) => {
            const cDate = new Date(c.date);
            const monthBin = last6Months.find(m => isSameMonth(m.date, cDate));
            if (monthBin) monthBin.cost += c.amountNet;
        });

        // Incomes (Invoices SENT)
        p.invoices?.filter((i: any) => i.sent && i.sentDate).forEach((i: any) => {
            const iDate = i.sentDate ? new Date(i.sentDate) : new Date();
            const monthBin = last6Months.find(m => isSameMonth(m.date, iDate));
            if (monthBin) monthBin.income += i.amountInvoicedGross / (1 + settings.vatRate); // Approximate Net
        });
    });

    // C. Project Margins (Top 10 by Value)
    const marginData = processedProjects
        .filter((p: any) => p.financials.priceNet > 0)
        .sort((a: any, b: any) => b.financials.priceNet - a.financials.priceNet)
        .slice(0, 10)
        .map((p: any) => ({
            name: p.name.substring(0, 15) + (p.name.length > 15 ? '...' : ''),
            marginPct: p.financials.priceNet > 0 ? (p.financials.marginAmountNet / p.financials.priceNet) * 100 : 0
        }));

    // D. Client Pie
    const clientMap = new Map<string, number>();
    processedProjects.forEach((p: any) => {
        const cName = p.clientName;
        const val = p.financials.priceNet;
        clientMap.set(cName, (clientMap.get(cName) || 0) + val);
    });

    const clientData = Array.from(clientMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Reportes Financieros</h2>
                    <p className="text-muted-foreground">Análisis detallado del rendimiento de tu negocio.</p>
                </div>
                <div className="flex space-x-2">
                    <span className="text-xs text-muted-foreground self-center mr-2">
                        Actualizado: {format(new Date(), 'dd/MM/yy HH:mm')}
                    </span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { title: "Venta Neta Total", value: `$${(totalRevenue / 1000000).toFixed(1)}M`, icon: TrendingUp, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" },
                    { title: "Margen Promedio", value: `${avgMarginPct.toFixed(1)}%`, icon: PieChart, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
                    { title: "Proyectos Activos", value: activeProjects.toString(), icon: FileText, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
                    { title: "Cotizaciones Pend.", value: pendingQuotes.toString(), icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
                ].map((stat, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-6 flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                            <h3 className="text-2xl font-bold text-foreground mt-2">{stat.value}</h3>
                        </div>
                        <div className={`p-3 rounded-lg ${stat.bg}`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RevenueChart data={last6Months} />
                </div>
                <div>
                    <ClientRevenuePie data={clientData} />
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 gap-6">
                <ProjectMarginChart data={marginData} />
            </div>
        </div>
    );
}
