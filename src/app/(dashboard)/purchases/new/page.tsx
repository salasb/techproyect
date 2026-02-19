import { createClient } from "@/lib/supabase/server";
import { resolveActiveOrganization } from "@/lib/auth/server-resolver";
import { ProcurementService } from "@/services/procurement-service";
import { POBuilder } from "@/components/procurement/POBuilder";

export const dynamic = 'force-dynamic';

export default async function NewPurchaseOrderPage() {
    const orgId = await resolveActiveOrganization();
    const supabase = await createClient();

    // Fetch data for the builder
    const [vendors, products, projects, locations] = await Promise.all([
        ProcurementService.getVendors(orgId),
        supabase.from('Product').select('id, name, sku, costNet').eq('organizationId', orgId),
        supabase.from('Project').select('id, name').eq('organizationId', orgId).neq('status', 'CERRADO'),
        supabase.from('Location').select('id, name').eq('organizationId', orgId)
    ]);

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Nueva Orden de Compra</h1>
                <p className="text-muted-foreground mt-1">Completa los datos para generar un borrador de OC</p>
            </div>

            <POBuilder
                vendors={vendors}
                products={products.data || []}
                projects={projects.data || []}
                locations={locations.data || []}
            />
        </div>
    );
}
