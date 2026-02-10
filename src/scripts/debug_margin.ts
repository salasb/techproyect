
import { createClient } from "@supabase/supabase-js";
import { calculateProjectFinancials } from "../services/financialCalculator";
import { DEFAULT_VAT_RATE, EXCHANGE_RATE_USD_CLP } from "../lib/constants";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugMargins() {
    console.log("--- DEBUGGING MARGIN CALCULATION ---");
    console.log(`Exchange Rate: ${EXCHANGE_RATE_USD_CLP}`);

    const { data: settingsData } = await supabase.from('Settings').select('*').single();
    const settings = settingsData || { vatRate: DEFAULT_VAT_RATE };

    const { data: projects } = await supabase
        .from('Project')
        .select(`
            *,
            company:Company(*),
            costEntries:CostEntry(*),
            invoices:Invoice(*),
            quoteItems:QuoteItem(*)
        `)
        .order('updatedAt', { ascending: false });

    if (!projects) {
        console.log("No projects found.");
        return;
    }

    let totalMarginActive = 0;
    let totalMarginAll = 0;

    console.log("\n| Project Name | Status | Currency | Raw Margin | Rate | Final Margin (CLP) |");
    console.log("|---|---|---|---|---|---|");

    projects.forEach(p => {
        const fin = calculateProjectFinancials(p, p.costEntries || [], p.invoices || [], settings as any, p.quoteItems || []);

        let rate = 1;
        if (p.currency === 'USD') {
            rate = EXCHANGE_RATE_USD_CLP;
        }

        const finalMargin = fin.marginAmountNet * rate;

        // Check if excluded in dashboard
        const isActive = p.status !== 'CANCELADO' && p.status !== 'CERRADO';

        if (isActive) {
            totalMarginActive += finalMargin;
        }
        totalMarginAll += finalMargin;

        console.log(`| ${p.name.padEnd(20).slice(0, 20)} | ${p.status.padEnd(10)} | ${p.currency || 'null'} | ${fin.marginAmountNet.toFixed(0).padStart(10)} | ${rate} | ${finalMargin.toFixed(0).padStart(12)} | ${isActive ? '✅' : '❌'}`);
    });

    console.log("\n--------------------------------");
    console.log(`TOTAL MARGIN (Active Only - Dashboard): $${totalMarginActive.toLocaleString('es-CL')}`);
    console.log(`TOTAL MARGIN (All Projects - User?):   $${totalMarginAll.toLocaleString('es-CL')}`);
    console.log("--------------------------------");
}

debugMargins().catch(console.error);
