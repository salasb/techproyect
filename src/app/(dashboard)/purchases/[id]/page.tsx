import { notFound } from "next/navigation";
import { resolveActiveOrganization } from "@/lib/auth/server-resolver";
import { ProcurementService } from "@/services/procurement-service";
import { PODetailView } from "@/components/procurement/PODetailView";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const orgId = await resolveActiveOrganization();
    const supabase = await createClient();

    const po = await ProcurementService.getPODetail(orgId, id);

    if (!po) {
        notFound();
    }

    // Fetch locations for reception
    const { data: locations } = await supabase
        .from('Location')
        .select('id, name')
        .eq('organizationId', orgId);

    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto">
            <PODetailView
                po={po}
                locations={locations || []}
            />
        </div>
    );
}
