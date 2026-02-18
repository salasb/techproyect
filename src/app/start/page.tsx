import { createOrganizationAction, getUserOrganizations } from "@/actions/organizations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building2, User, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function StartPage() {
    const orgs = await getUserOrganizations();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Intro Section */}
                <div className="flex flex-col justify-center space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                            Bienvenido a <span className="text-blue-600">TechProyect</span>
                        </h1>
                        <p className="text-lg text-slate-600">
                            La plataforma integral para gestionar tus proyectos tecnológicos, finanzas y clientes en un solo lugar.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {[
                            "Trial de 14 días con acceso Pro completo.",
                            "Sin necesidad de tarjeta de crédito hoy.",
                            "Soporte multi-organización desde el día 1."
                        ].map((text, i) => (
                            <div key={i} className="flex items-center space-x-3 text-slate-700 font-medium">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span>{text}</span>
                            </div>
                        ))}
                    </div>

                    {orgs.length > 0 && (
                        <Card className="border-blue-100 bg-blue-50/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold text-blue-900">Tus Organizaciones</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {orgs.map(org => (
                                    <Link
                                        key={org.id}
                                        href={`/dashboard`}
                                        className="flex items-center justify-between p-2 rounded-md hover:bg-blue-100 transition-colors group"
                                    >
                                        <span className="text-sm font-medium text-slate-700 group-hover:text-blue-900">{org.name}</span>
                                        <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-white border border-blue-200 rounded text-blue-600">
                                            {org.subscription?.status}
                                        </span>
                                    </Link>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Wizard Card */}
                <Card className="shadow-xl border-slate-200">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl">Crear Organización</CardTitle>
                        <CardDescription>Configura tu espacio de trabajo en segundos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={createOrganizationAction} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre de la Organización</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="Ej: Mi Consultora Tech"
                                    required
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>Modo de operación</Label>
                                <RadioGroup defaultValue="SOLO" name="mode" className="grid grid-cols-2 gap-4">
                                    <Label
                                        htmlFor="mode-solo"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-blue-600 transition-all cursor-pointer"
                                    >
                                        <RadioGroupItem value="SOLO" id="mode-solo" className="sr-only" />
                                        <User className="mb-3 h-6 w-6 text-slate-600" />
                                        <div className="space-y-1 text-center">
                                            <p className="text-sm font-semibold leading-none">Independiente</p>
                                            <p className="text-xs text-slate-500">Uso personal.</p>
                                        </div>
                                    </Label>
                                    <Label
                                        htmlFor="mode-team"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-blue-600 transition-all cursor-pointer"
                                    >
                                        <RadioGroupItem value="TEAM" id="mode-team" className="sr-only" />
                                        <Building2 className="mb-3 h-6 w-6 text-slate-600" />
                                        <div className="space-y-1 text-center">
                                            <p className="text-sm font-semibold leading-none">Equipo / Empresa</p>
                                            <p className="text-xs text-slate-500">Múltiples usuarios.</p>
                                        </div>
                                    </Label>
                                </RadioGroup>
                            </div>

                            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center h-5">
                                    <input
                                        id="loadDemo"
                                        name="loadDemo"
                                        type="checkbox"
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                                        defaultChecked
                                    />
                                </div>
                                <div className="text-sm leading-5">
                                    <Label htmlFor="loadDemo" className="font-semibold text-slate-700 cursor-pointer">
                                        Cargar datos de demostración
                                    </Label>
                                    <p className="text-slate-500 text-xs">Añadiremos proyectos y clientes de ejemplo para que explores el sistema.</p>
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]">
                                Crear y comenzar prueba
                            </Button>

                            <p className="text-center text-xs text-slate-500 mt-4">
                                Al continuar, aceptas nuestros términos de servicio y política de privacidad.
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
