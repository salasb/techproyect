import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Sparkles, ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { createOrganizationAction } from "@/actions/organizations";

export default function NewOrganizationPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 font-sans">
            <div className="max-w-xl w-full space-y-8">
                <Link href="/organizations" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors group">
                    <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Volver a mis organizaciones
                </Link>

                <Card className="rounded-[3rem] shadow-2xl border-none overflow-hidden bg-white dark:bg-zinc-900">
                    <CardHeader className="p-12 pb-6 bg-slate-50 dark:bg-zinc-800/50 border-b border-border/50 text-center">
                        <div className="w-20 h-20 bg-white dark:bg-zinc-700 rounded-[2rem] border border-slate-100 dark:border-zinc-600 flex items-center justify-center mx-auto mb-6 shadow-inner rotate-3">
                            <Building2 className="w-10 h-10 text-blue-600" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2">
                                <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Nuevo Espacio</span>
                            </div>
                            <CardTitle className="text-4xl font-black tracking-tighter italic uppercase">Crear Empresa</CardTitle>
                            <CardDescription className="text-sm font-medium italic">Configura tu entorno de trabajo profesional.</CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="p-12">
                        <form action={createOrganizationAction} className="space-y-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre Comercial</Label>
                                    <Input 
                                        id="name"
                                        name="name"
                                        placeholder="Ej: TechWise Solutions SpA" 
                                        required 
                                        autoFocus
                                        className="h-14 rounded-2xl border-slate-200 bg-slate-50 dark:bg-zinc-800 font-bold text-lg focus:bg-white dark:focus:bg-zinc-950 transition-all" 
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="country" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">País</Label>
                                        <select 
                                            id="country"
                                            name="country"
                                            className="w-full h-14 rounded-2xl border-slate-200 bg-slate-50 dark:bg-zinc-800 px-4 font-bold text-sm focus:bg-white dark:focus:bg-zinc-950 transition-all outline-none"
                                            defaultValue="CL"
                                        >
                                            <option value="CL">Chile</option>
                                            <option value="AR">Argentina</option>
                                            <option value="MX">México</option>
                                            <option value="US">Estados Unidos</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="mode" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo de Uso</Label>
                                        <select 
                                            id="mode"
                                            name="mode"
                                            className="w-full h-14 rounded-2xl border-slate-200 bg-slate-50 dark:bg-zinc-800 px-4 font-bold text-sm focus:bg-white dark:focus:bg-zinc-950 transition-all outline-none"
                                            defaultValue="TEAM"
                                        >
                                            <option value="SOLO">Solo (1 usuario)</option>
                                            <option value="TEAM">Equipo (Multi-usuario)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-3xl p-6 border border-blue-100 dark:border-blue-800/50 flex items-start gap-4">
                                <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-900 dark:text-blue-300">Infraestructura Aislada</p>
                                    <p className="text-[11px] text-blue-700/70 dark:text-blue-400/70 font-medium leading-relaxed italic">Al crear una organización, se genera un entorno seguro y privado para tus datos.</p>
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase italic tracking-widest shadow-2xl shadow-blue-900/30 text-lg group">
                                Crear y Empezar <Sparkles className="w-5 h-5 ml-2 group-hover:rotate-12 transition-transform" />
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
