import { createOrganizationAction, getUserOrganizations } from "@/actions/organizations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building2, User, CheckCircle2, AlertCircle, RefreshCcw, LogOut, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { selectOrganization } from "@/app/org/select/actions";
import { ORG_CONTEXT_COOKIE } from "@/lib/auth/constants";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OrgSelector } from "@/components/auth/OrgSelector";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * StartPage (Safe Harbor v1.0)
 * Order of logic:
 * 1. Ensure user is authenticated.
 * 2. If user has orgs, show selector (don't auto-redirect to avoid loops).
 * 3. If user has NO orgs, show creation form.
 * 4. Handle invalid cookies silently.
 */
export default async function StartPage({
    searchParams
}: {
    searchParams: Promise<{ error?: string; msg?: string }>
}) {
    const { error: urlError, msg } = await searchParams;
    const isPreview = process.env.VERCEL_ENV === 'preview';
    
    // Instrumentation (Preview/Dev only)
    const traceId = Math.random().toString(36).substring(7).toUpperCase();
    console.log(`[StartPage][${traceId}] Loading safe harbor...`);

    // 1. Fetch User and Orgs
    const orgs = await getUserOrganizations();
    const cookieStore = await cookies();
    const currentOrgCookie = cookieStore.get(ORG_CONTEXT_COOKIE)?.value;

    // Check for invalid cookie state
    const hasOrgContext = !!currentOrgCookie;
    const isCookieValid = hasOrgContext && orgs.some(o => o.id === currentOrgCookie);
    const shouldClearCookie = hasOrgContext && !isCookieValid;

    if (isPreview) {
        console.log(`[StartPage][${traceId}] Orgs: ${orgs.length}, Cookie: ${currentOrgCookie}, Valid: ${isCookieValid}`);
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
            {/* Top Minimal Branding */}
            <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700 flex flex-col items-center">
                <img src="/techwise logo negro.png" alt="TechWise" className="h-10 w-auto grayscale opacity-50" />
                <div className="mt-2 h-0.5 w-8 bg-blue-600/30 rounded-full" />
            </div>

            <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                
                {/* Left: Value Proposition (Static) */}
                <div className="lg:col-span-5 flex flex-col justify-center space-y-8 py-8 animate-in fade-in slide-in-from-left-4 duration-1000">
                    {shouldClearCookie && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-3 shadow-sm border-dashed">
                            <div className="flex items-center gap-2 text-amber-800 font-black uppercase text-[10px] tracking-widest">
                                <AlertCircle className="w-4 h-4" />
                                <span>Contexto No Válido</span>
                            </div>
                            <p className="text-[11px] text-amber-700 font-medium italic">
                                Tu sesión anterior expiró o pertenece a otro entorno. Por favor selecciona una organización o crea una nueva.
                            </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none italic uppercase">
                            Empieza <span className="text-blue-600">Ahora.</span>
                        </h1>
                        <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-sm">
                            Tu centro de operaciones tecnológicas está a un paso de distancia.
                        </p>
                    </div>

                    <div className="space-y-6 pt-4">
                        {[
                            { title: "Control Total", desc: "Gestión de proyectos, costos y márgenes en tiempo real." },
                            { title: "Enterprise Ready", desc: "Soporte multi-empresa y roles B2B desde el inicio." },
                            { title: "Automatización", desc: "Facturación y cobranza automática con Stripe." }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 group">
                                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:border-blue-200 group-hover:shadow-lg transition-all shrink-0">
                                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="font-black uppercase text-[10px] tracking-widest text-slate-900">{item.title}</h4>
                                    <p className="text-xs text-slate-500 font-medium italic">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 flex items-center gap-4">
                        <div className="flex -space-x-3">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-50 bg-slate-200 animate-pulse" />
                            ))}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">+50 empresas operando hoy</p>
                    </div>
                </div>

                {/* Right: Explicit Branches (Dynamic) */}
                <div className="lg:col-span-7 animate-in fade-in slide-in-from-right-4 duration-1000">
                    
                    {/* BRANCH A: User HAS organizations -> Show Selector */}
                    {orgs.length > 0 ? (
                        <Card className="rounded-[3rem] shadow-2xl border-blue-50 bg-white overflow-hidden">
                            <CardHeader className="p-10 pb-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Bienvenido de vuelta</span>
                                </div>
                                <CardTitle className="text-3xl font-black tracking-tighter italic uppercase text-slate-900">Selecciona tu espacio</CardTitle>
                                <CardDescription className="text-sm font-medium italic">Elige la organización en la que deseas operar hoy.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-10 pt-0 space-y-8">
                                <OrgSelector orgs={orgs as any} />

                                <div className="relative py-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-slate-100"></span>
                                    </div>
                                    <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                                        <span className="bg-white px-4 text-slate-400 font-bold italic">O expande tu horizonte</span>
                                    </div>
                                </div>

                                <form action={createOrganizationAction} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre de la nueva empresa</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                name="name"
                                                placeholder="Ej: Tech Solution Ltd"
                                                required
                                                className="rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white h-12 font-bold"
                                            />
                                            <Button type="submit" variant="outline" className="rounded-2xl px-6 h-12 font-black uppercase text-[10px] tracking-widest border-blue-100 text-blue-600 hover:bg-blue-50">Crear</Button>
                                        </div>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    ) : (
                        
                        /* BRANCH B: User has NO organizations -> Show Creation Form */
                        <Card className="rounded-[3rem] shadow-2xl border-blue-50 bg-white overflow-hidden">
                            <CardHeader className="p-10 pb-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Configuración Inicial</span>
                                </div>
                                <CardTitle className="text-3xl font-black tracking-tighter italic uppercase text-slate-900">Crea tu Organización</CardTitle>
                                <CardDescription className="text-sm font-medium italic">Define tu entorno de trabajo para comenzar.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-10 pt-4">
                                <form action={createOrganizationAction} className="space-y-8">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Comercial</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            placeholder="Ej: Mi Consultora Tecnológica"
                                            required
                                            className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all text-lg font-bold shadow-inner"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Modelo de Operación</Label>
                                        <RadioGroup defaultValue="SOLO" name="mode" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <label
                                                htmlFor="mode-solo"
                                                className="flex flex-col items-center justify-between rounded-[2rem] border-2 border-slate-100 bg-white p-6 hover:border-blue-200 hover:bg-blue-50/20 transition-all cursor-pointer [&:has([data-state=checked])]:border-blue-600 [&:has([data-state=checked])]:bg-blue-50/50 group"
                                            >
                                                <RadioGroupItem value="SOLO" id="mode-solo" className="sr-only" />
                                                <User className="mb-3 h-8 w-8 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                                <div className="space-y-1 text-center">
                                                    <p className="text-xs font-black uppercase tracking-tight text-slate-900">Solo Pro</p>
                                                    <p className="text-[10px] text-slate-500 font-medium italic">Uso independiente.</p>
                                                </div>
                                            </label>
                                            <label
                                                htmlFor="mode-team"
                                                className="flex flex-col items-center justify-between rounded-[2rem] border-2 border-slate-100 bg-white p-6 hover:border-blue-200 hover:bg-blue-50/20 transition-all cursor-pointer [&:has([data-state=checked])]:border-blue-600 [&:has([data-state=checked])]:bg-blue-50/50 group"
                                            >
                                                <RadioGroupItem value="TEAM" id="mode-team" className="sr-only" />
                                                <Building2 className="mb-3 h-8 w-8 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                                <div className="space-y-1 text-center">
                                                    <p className="text-xs font-black uppercase tracking-tight text-slate-900">Equipo B2B</p>
                                                    <p className="text-[10px] text-slate-500 font-medium italic">Colaboración real.</p>
                                                </div>
                                            </label>
                                        </RadioGroup>
                                    </div>

                                    <Button type="submit" className="w-full h-16 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-500/30 transition-all active:scale-[0.98]">
                                        Crear y Activar Trial
                                    </Button>

                                    <div className="text-center">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            Al continuar, aceptas nuestros términos de servicio y privacidad.
                                        </p>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {/* Quick Support / Logout */}
                    <div className="mt-8 flex items-center justify-between px-6">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sistemas Operativos</span>
                        </div>
                        <form action={async () => {
                            'use server';
                            const { createClient } = await import("@/lib/supabase/server");
                            const supabase = await createClient();
                            await supabase.auth.signOut();
                            redirect('/login');
                        }}>
                            <Button variant="ghost" type="submit" className="text-slate-400 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest h-auto p-0">
                                <LogOut className="w-3.5 h-3.5 mr-2" /> Cerrar Sesión
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

