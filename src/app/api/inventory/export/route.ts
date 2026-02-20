import { requireOperationalScope } from "@/lib/auth/server-resolver";
import prisma from "@/lib/prisma";
import { generateCsv } from "@/lib/security/csv";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const scope = await requireOperationalScope();

        const products = await prisma.product.findMany({
            where: { organizationId: scope.orgId },
            include: { stockEntries: true }
        });

        const reportData = products.map(p => {
            const totalStock = p.stockEntries.reduce((acc, e) => acc + e.quantity, 0);
            return {
                SKU: p.sku,
                Nombre: p.name,
                "Costo Neto": p.costNet,
                Precio: p.priceNet,
                Existencia: totalStock,
                Unidad: p.unit
            };
        });

        const csv = generateCsv(reportData);

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="inventario_${new Date().toISOString().split('T')[0]}.csv"`,
            }
        });

    } catch (error) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}
