import { getVendorsAction } from "@/app/actions/procurement";
import { VendorsClientView } from "@/components/procurement/VendorsClientView";

export const dynamic = 'force-dynamic';

export default async function VendorsPage() {
    const vendors = await getVendorsAction();

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Proveedores</h1>
                    <p className="text-muted-foreground mt-1">Gestión de proveedores para órdenes de compra</p>
                </div>
            </div>

            <VendorsClientView initialVendors={vendors} />
        </div>
    );
}
