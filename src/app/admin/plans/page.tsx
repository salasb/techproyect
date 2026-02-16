import { createClient } from "@/lib/supabase/server";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";

export default async function AdminPlansPage() {
    const supabase = await createClient();
    const { data: plans } = await supabase
        .from('Plan')
        .select('*')
        .order('price', { ascending: true });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Planes de Suscripción</h2>
                    <p className="text-slate-500">Define los precios y límites para cada nivel de servicio.</p>
                </div>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Plan
                </Button>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre / ID</TableHead>
                            <TableHead>Precio</TableHead>
                            <TableHead>Límites (Usuarios / Proyectos)</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {plans?.map((plan) => {
                            const limits = plan.limits as any;
                            return (
                                <TableRow key={plan.id}>
                                    <TableCell>
                                        <div className="font-medium">{plan.name}</div>
                                        <div className="text-xs text-muted-foreground">{plan.id}</div>
                                    </TableCell>
                                    <TableCell>
                                        ${plan.price.toLocaleString()} {plan.currency} / {plan.interval === 'month' ? 'mes' : 'año'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <span className="font-semibold">{limits.maxUsers || '∞'}</span> usuarios
                                            <span className="mx-2">•</span>
                                            <span className="font-semibold">{limits.maxProjects || '∞'}</span> proyectos
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {plan.isActive ? (
                                            <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-200">Activo</Badge>
                                        ) : (
                                            <Badge variant="secondary">Inactivo</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/admin/plans/${plan.id}`}>
                                            <Button variant="ghost" size="icon">
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
