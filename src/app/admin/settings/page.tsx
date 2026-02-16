import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AdminSettingsPage() {
    const supabase = await createClient();

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

                {/* Future: Plan Definitions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Planes y Suscripciones</CardTitle>
                        <CardDescription>Definición de tipos de planes disponibles.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">La gestión avanzada de planes se implementará aquí.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
