import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Calendar, DollarSign, Mail, Phone, Clock, CalendarClock, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { LogActivityWidget } from "@/components/crm/LogActivityWidget";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function OpportunityDetailsPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();

    // 1. Fetch Opportunity
    const { data: opportunity } = await supabase
        .from('Opportunity')
        .select(`
            *,
            Client:clientId ( id, name, contactName, email, phone, address ),
            Organization:organizationId ( name )
        `)
        .eq('id', params.id)
        .single();

    if (!opportunity) {
        notFound();
    }

    // 2. Fetch Interactions
    const { data: interactions } = await supabase
        .from('Interaction')
        .select('*')
        .eq('opportunityId', params.id)
        .order('date', { ascending: false });

    // Format Currency
    const formatter = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
    });

    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'WON': return 'bg-green-100 text-green-700 border-green-200';
            case 'LOST': return 'bg-red-100 text-red-700 border-red-200';
            case 'LEAD': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-12">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/crm/pipeline">
                            <Button variant="ghost" size="sm" className="pl-0 text-slate-500 hover:text-slate-900">
                                <ArrowLeft className="h-4 w-4 mr-1" /> Volver al Pipeline
                            </Button>
                        </Link>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-slate-900">{opportunity.title}</h1>
                                <Badge className={getStageColor(opportunity.stage)}>
                                    {opportunity.stage}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-6 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5">
                                    <Building2 className="h-4 w-4" />
                                    {opportunity.Client?.name || 'Cliente desconocido'}
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-900 font-medium">
                                    <DollarSign className="h-4 w-4 text-emerald-600" />
                                    {formatter.format(opportunity.value || 0)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4" />
                                    Cierre esp: {opportunity.expectedCloseDate ? format(new Date(opportunity.expectedCloseDate), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button variant="outline">Editar</Button>
                            {/* Change Stage Button could go here */}
                            {opportunity.stage !== 'WON' && opportunity.stage !== 'LOST' && (
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                    Marcar Ganada
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Activity & Log */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Log Activity Widget */}
                        <section>
                            <h3 className="text-lg font-semibold text-slate-900 mb-4 px-1">Registrar Actividad</h3>
                            <LogActivityWidget opportunityId={opportunity.id} />
                        </section>

                        {/* Timeline */}
                        <section>
                            <h3 className="text-lg font-semibold text-slate-900 mb-4 px-1">Historial</h3>
                            <ActivityTimeline interactions={interactions || []} />
                        </section>
                    </div>

                    {/* Right Column: Details & Client Info */}
                    <div className="space-y-6">
                        {/* Client Card */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Cliente</h3>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                        <Building2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">{opportunity.Client?.name}</p>
                                        <p className="text-xs text-slate-500">{opportunity.Client?.address || 'Sin dirección'}</p>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-slate-100 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Users className="h-4 w-4 text-slate-400" />
                                        {opportunity.Client?.contactName || 'S/N'}
                                    </div>
                                    {opportunity.Client?.email && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Mail className="h-4 w-4 text-slate-400" />
                                            <a href={`mailto:${opportunity.Client.email}`} className="hover:text-indigo-600 transition-colors">
                                                {opportunity.Client.email}
                                            </a>
                                        </div>
                                    )}
                                    {opportunity.Client?.phone && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Phone className="h-4 w-4 text-slate-400" />
                                            <a href={`tel:${opportunity.Client.phone}`} className="hover:text-indigo-600 transition-colors">
                                                {opportunity.Client.phone}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Next Follow Up Card */}
                        {opportunity.nextInteractionDate && (
                            <div className={`rounded-xl border p-5 shadow-sm ${new Date(opportunity.nextInteractionDate) < new Date()
                                ? 'bg-amber-50 border-amber-200'
                                : 'bg-white border-slate-200'
                                }`}>
                                <h3 className={`text-sm font-semibold uppercase tracking-wide mb-2 ${new Date(opportunity.nextInteractionDate) < new Date() ? 'text-amber-800' : 'text-slate-900'
                                    }`}>
                                    Próximo Contacto
                                </h3>
                                <div className="flex items-center gap-2">
                                    <CalendarClock className={`h-5 w-5 ${new Date(opportunity.nextInteractionDate) < new Date() ? 'text-amber-600' : 'text-slate-500'
                                        }`} />
                                    <span className="font-medium text-lg">
                                        {format(new Date(opportunity.nextInteractionDate), 'dd MMM, HH:mm', { locale: es })}
                                    </span>
                                </div>
                                {new Date(opportunity.nextInteractionDate) < new Date() && (
                                    <p className="text-xs text-amber-700 mt-2 font-medium">⚠️ Atrasado</p>
                                )}
                            </div>
                        )}

                        {/* Opportunity Info */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Detalles del Trato</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Descripción</p>
                                    <p className="text-sm text-slate-700">{opportunity.description || 'Sin descripción'}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Probabilidad</p>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500" style={{ width: `${opportunity.probability}%` }}></div>
                                            </div>
                                            <span className="text-xs font-medium">{opportunity.probability}%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Creado</p>
                                        <p className="text-xs text-slate-700">{format(new Date(opportunity.createdAt || new Date()), 'dd MMM yyyy')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
