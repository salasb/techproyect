import Link from "next/link";
import { resolveActiveOrganization } from "@/lib/auth/server-resolver";
import { ProcurementService } from "@/services/procurement-service";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ShoppingCart, Plus, Search, FileText } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function PurchasesPage() {
    const orgId = await resolveActiveOrganization();
    const pos = await ProcurementService.getPOs(orgId);

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground text-gradient bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Órdenes de Compra
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">Gestiona tus adquisiciones y recepciones de inventario</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href="/purchases/new"
                        className="flex items-center px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva OC
                    </Link>
                </div>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden backdrop-blur-sm bg-white/50">
                {!pos || pos.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="mx-auto w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <ShoppingCart className="w-10 h-10 text-zinc-400" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">No hay órdenes de compra</h3>
                        <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                            Aún no has registrado compras. Crea una nueva OC para abastecer tu inventario.
                        </p>
                        <div className="mt-8">
                            <Link
                                href="/purchases/new"
                                className="inline-flex items-center px-6 py-3 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Crear Primera OC
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
                                <tr>
                                    <th className="px-8 py-4 font-bold">OC # / Proveedor</th>
                                    <th className="px-8 py-4 font-bold">Items</th>
                                    <th className="px-8 py-4 font-bold">Fecha</th>
                                    <th className="px-8 py-4 font-bold">Total</th>
                                    <th className="px-8 py-4 font-bold text-right">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {pos.map((po: any) => (
                                    <tr key={po.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-foreground group-hover:text-blue-600 transition-colors">
                                                <Link href={`/purchases/${po.id}`}>
                                                    #{po.poNumber || po.id.slice(0, 8)}
                                                </Link>
                                            </div>
                                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                                {po.vendor?.name}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="text-sm font-medium">
                                                {po.items?.length || 0} línea(s)
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                {po.items?.[0]?.description} {po.items?.length > 1 ? '...' : ''}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-zinc-600 font-medium">
                                            {format(new Date(po.createdAt), 'dd MMM, yyyy', { locale: es })}
                                        </td>
                                        <td className="px-8 py-5 font-bold text-foreground">
                                            ${po.totalBruto.toLocaleString('es-CL')}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <StatusBadge status={po.status} type="PURCHASE_ORDER" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
