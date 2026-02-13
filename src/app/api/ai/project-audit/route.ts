import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
    const { projectId } = await req.json();

    if (!projectId) {
        return Response.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );

    // 1. Fetch Project Data
    const { data: project } = await supabase
        .from('Project')
        .select(`
            *,
            company:Company(name),
            quote_items:QuoteItem(*),
            costs:CostEntry(*),
            invoices:Invoice(*)
        `)
        .eq('id', projectId)
        .single();

    if (!project) {
        return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // 2. Prepare Context for AI
    const totalSales = project.quote_items.reduce((acc: number, item: any) => acc + (item.priceNet * item.quantity), 0);
    const totalBudgetCost = project.quote_items.reduce((acc: number, item: any) => acc + (item.costNet * item.quantity), 0);
    const totalExecutedCost = project.costs.reduce((acc: number, cost: any) => acc + cost.amountNet, 0);
    const totalInvoiced = project.invoices.filter((i: any) => i.sent).reduce((acc: number, i: any) => acc + i.amountInvoicedGross, 0);

    // Group costs by category
    const costsByCategory = project.costs.reduce((acc: any, cost: any) => {
        acc[cost.category] = (acc[cost.category] || 0) + cost.amountNet;
        return acc;
    }, {});

    const context = {
        projectName: project.name,
        client: project.company?.name,
        status: project.status,
        financials: {
            sold: totalSales,
            budgetedCost: totalBudgetCost,
            executedCost: totalExecutedCost,
            margin: totalSales - totalExecutedCost,
            marginPct: totalSales > 0 ? ((totalSales - totalExecutedCost) / totalSales) * 100 : 0
        },
        costsBreakdown: costsByCategory,
        invoicing: {
            totalInvoiced: totalInvoiced,
            pendingToInvoice: (totalSales * 1.19) - totalInvoiced // Approx with VAT
        }
    };

    // 3. AI Analysis
    try {
        const { object } = await generateObject({
            model: openai('gpt-4o-mini'),
            schema: z.object({
                healthScore: z.number().min(0).max(100).describe("Score from 0 (Critical) to 100 (Perfect) representing project financial health"),
                summary: z.string().describe("Executive summary of the financial status (max 2 sentences)"),
                issues: z.array(z.object({
                    title: z.string(),
                    severity: z.enum(['CRITICAL', 'WARNING', 'INFO']),
                    description: z.string()
                })).describe("List of detected issues or risks"),
                recommendations: z.array(z.string()).describe("Actionable steps to improve the project health"),
                sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']).describe("Overall sentiment of the analysis")
            }),
            system: `You are an expert Financial Auditor for IT Projects.
            Your role is to analyze the provided project data and detect anomalies, risks, and health issues.
            
            Key Indicators to Watch:
            - Negative Margins (Sold < Executed Cost) -> CRITICAL
            - Low Margins (< 15%) -> WARNING
            - High Cost in unexpected categories (e.g., Logistica too high)
            - Not Invoiced but High Execution -> Cash Flow Risk
            
            Output a JSON object with:
            - healthScore: 0-100 based on margin and risks.
            - summary: Brief explanation.
            - issues: Structured list of specific problems.
            - recommendations: Tactic actions.
            
            Language: Spanish.
            `,
            prompt: `Audit this project: ${JSON.stringify(context, null, 2)}`
        });

        return Response.json(object);

    } catch (error: any) {
        console.error("AI Audit Error", error);
        return Response.json({
            error: 'AI Analysis failed',
            details: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
