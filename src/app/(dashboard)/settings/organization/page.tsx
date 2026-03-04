import { requirePermission } from "@/lib/auth/server-resolver";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Save, ShieldCheck } from "lucide-react";
import { updateOrganizationAction } from "@/actions/organizations";

export default async function OrganizationSettingsPage() {
    const scope = await requirePermission('ORG_MANAGE');
    const org = await prisma.organization.findUnique({
        where: { id: scope.orgId }
    });

    if (!org) return null;
    const settings = (org.settings as any) || {};

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Configuración</span>
                    </div>
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase">Perfil de Empresa</h1>
                    <p className="text-muted-foreground font-medium italic underline decoration-blue-500/20 underline-offset-8">Gestiona la identidad y datos legales de tu organización.</p>
                </div>
            </div>

            <div className="max-w-3xl">
                <Card className="rounded-[2.5rem] border-slate-100 dark:border-zinc-800 shadow-xl overflow-hidden">
                    <CardHeader className="p-10 pb-6 bg-slate-50 dark:bg-zinc-800/50 border-b border-border/50">
                        <CardTitle className="text-xl font-black uppercase italic tracking-tight">Información General</CardTitle>
                        <CardDescription className="text-sm font-medium italic">Datos públicos y de facturación de la organización.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-10">
                        <form action={async (fd) => {
                            'use server';
                            await updateOrganizationAction(fd);
                        }} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre Legal / Comercial</Label>
                                    <Input 
                                        id="name"
                                        name="name"
                                        defaultValue={org.name}
                                        required 
                                        className="h-12 rounded-xl border-slate-200 bg-slate-50 dark:bg-zinc-800 font-bold focus:bg-white dark:focus:bg-zinc-950 transition-all" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rut" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">RUT / Tax ID</Label>
                                    <Input 
                                        id="rut"
                                        name="rut"
                                        defaultValue={org.rut || ''}
                                        placeholder="Ej: 76.123.456-7"
                                        className="h-12 rounded-xl border-slate-200 bg-slate-50 dark:bg-zinc-800 font-bold focus:bg-white dark:focus:bg-zinc-950 transition-all" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="country" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">País</Label>
                                    <select 
                                        id="country"
                                        name="country"
                                        className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 dark:bg-zinc-800 px-4 font-bold text-sm focus:bg-white dark:focus:bg-zinc-950 transition-all outline-none"
                                        defaultValue={settings.country || 'CL'}
                                    >
                                        <option value="CL">Chile</option>
                                        <option value="AR">Argentina</option>
                                        <option value="MX">México</option>
                                        <option value="US">Estados Unidos</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sector" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Rubro / Sector</Label>
                                    <Input 
                                        id="sector"
                                        name="sector"
                                        defaultValue={settings.sector || ''}
                                        placeholder="Ej: Construcción, Tecnología..."
                                        className="h-12 rounded-xl border-slate-200 bg-slate-50 dark:bg-zinc-800 font-bold focus:bg-white dark:focus:bg-zinc-950 transition-all" 
                                    />
                                </div>
                            </div>

                            <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800/50 flex items-start gap-4">
                                <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-900 dark:text-emerald-300">Cambios Auditados</p>
                                    <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70 font-medium leading-relaxed italic">Cada modificación en este perfil quedará registrada en el log de auditoría para fines de cumplimiento.</p>
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button type="submit" className="h-14 px-10 bg-slate-900 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl transition-all group">
                                    <Save className="w-4 h-4 mr-2" /> Guardar Cambios
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
