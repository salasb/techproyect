import { requireOperationalScope } from "@/lib/auth/server-resolver";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Globe, FileDown, Shield, Key, History } from "lucide-react";
import { IntegrationsManager } from "@/components/settings/IntegrationsManager";
import { DataExporter } from "@/components/settings/DataExporter";

export default async function IntegrationsPage() {
    const scope = await requireOperationalScope();
    
    const endpoints = await prisma.webhookEndpoint.findMany({
        where: { organizationId: scope.orgId },
        include: { _count: { select: { logs: true } } },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20">
            <div>
                <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase italic">Integraciones & API</h2>
                <p className="text-muted-foreground font-medium">Conecta TechWise con tus sistemas externos y exporta tus datos.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                    {/* Webhooks Section */}
                    <Card className="rounded-[2.5rem] shadow-sm border-border/50 overflow-hidden">
                        <CardHeader className="p-8 border-b border-border/50 bg-muted/5 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                                    Webhooks Outbound
                                </CardTitle>
                                <p className="text-[11px] font-medium text-muted-foreground mt-1 italic">Recibe notificaciones en tiempo real en tu servidor.</p>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <IntegrationsManager initialEndpoints={endpoints as any} />
                        </CardContent>
                    </Card>

                    {/* Data Export Section */}
                    <Card className="rounded-[2.5rem] shadow-sm border-border/50 overflow-hidden">
                        <CardHeader className="p-8 border-b border-border/50 bg-muted/5">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                                <FileDown className="w-3.5 h-3.5 text-emerald-500" />
                                Exportación de Datos
                            </CardTitle>
                            <p className="text-[11px] font-medium text-muted-foreground mt-1 italic">Descarga tus registros comerciales en formatos estándar.</p>
                        </CardHeader>
                        <CardContent className="p-8">
                            <DataExporter />
                        </CardContent>
                    </Card>
                </div>

                <aside className="space-y-6">
                    <Card className="rounded-[2.5rem] bg-indigo-600 text-white p-8 space-y-6 border-none shadow-xl shadow-indigo-500/20">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black italic tracking-tighter uppercase">Seguridad API</h3>
                            <p className="text-indigo-100 text-xs leading-relaxed font-medium">
                                Todos los webhooks son firmados usando HMAC-SHA256. Debes validar el header <code className="bg-white/10 px-1 rounded">X-TechWise-Signature</code> usando tu secret.
                            </p>
                        </div>
                        <div className="pt-4 flex items-center gap-2 border-t border-white/10">
                            <Key className="w-3.5 h-3.5 text-indigo-300" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Secrets Protegidos</span>
                        </div>
                    </Card>

                    <div className="bg-muted/30 border border-dashed border-border rounded-[2.5rem] p-8">
                        <div className="flex items-center gap-2 mb-4">
                            <History className="w-4 h-4 text-muted-foreground" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Eventos Soportados</h4>
                        </div>
                        <ul className="space-y-2">
                            {['quote.accepted', 'invoice.created', 'invoice.paid', 'payment.failed', 'ticket.created'].map(ev => (
                                <li key={ev} className="flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-blue-500" />
                                    <code className="text-[10px] font-mono text-zinc-600">{ev}</code>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
            </div>
        </div>
    );
}
