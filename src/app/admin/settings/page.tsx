import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Save, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from 'next/link';

export default async function AdminSettingsPage() {
    const supabase = await createClient();

    // Fetch active plans for summary
    const { data: plans } = await supabase
        .from('Plan')
        .select('*')
        .eq('isActive', true)
        .order('price', { ascending: true });

    // Placeholder for global settings fetch
    // const { data: settings } = await supabase.from('GlobalSettings').select('*').single();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Ajustes del Sistema</h2>
                <p className="text-slate-500">Configuración general de la plataforma TechWise.</p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5 text-blue-500" />
                            Configuración General
                        </CardTitle>
                        <CardDescription>
                            Parámetros globales que afectan a toda la aplicación.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="appName">Nombre de la Aplicación</Label>
                            <Input id="appName" defaultValue="TechWise" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="supportEmail">Correo de Soporte</Label>
                            <Input id="supportEmail" type="email" defaultValue="support@techwise.com" />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button disabled variant="secondary">
                                <Save className="w-4 h-4 mr-2" />
                                Guardar Cambios (Próximamente)
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Planes y Suscripciones</CardTitle>
                                <CardDescription>Gestiona los planes disponibles para las organizaciones.</CardDescription>
                            </div>
                            <Link href="/admin/plans">
                                <Button variant="outline" size="sm">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Gestionar Planes
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {plans?.map((plan) => (
                                    <div key={plan.id} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-sm">{plan.name}</span>
                                            <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                                                {plan.id}
                                            </span>
                                        </div>
                                        <div className="text-2xl font-bold mb-1">
                                            ${plan.price.toLocaleString()}
                                            <span className="text-xs font-normal text-muted-foreground ml-1">/ {plan.interval === 'month' ? 'mess' : 'año'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {(!plans || plans.length === 0) && (
                                <p className="text-sm text-muted-foreground italic">No hay planes activos configurados.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
