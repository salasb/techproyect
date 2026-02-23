import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const dynamic = 'force-dynamic';

import Link from "next/link";
import { Users, ChevronRight, History, Building2, CreditCard } from "lucide-react";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { GlobalAuditModal } from "@/components/settings/GlobalAuditModal";
import { UserPreferencesForm } from "@/components/settings/UserPreferencesForm";

export default async function SettingsPage() {
    const supabase = await createClient();

    // 1. Fetch Settings with safe fallback
    const { data: settingsRes, error: settingsError } = await supabase.from('Settings').select('*').maybeSingle();
    let settings = settingsRes;

    if (!settings || settingsError) {
        console.warn("[SettingsPage] Settings missing or error, creating default...");
        const { data: newSettings } = await supabase
            .from('Settings')
            .insert({ vatRate: 0.19, currency: 'CLP', yellowThresholdDays: 7, defaultPaymentTermsDays: 30 })
            .select()
            .maybeSingle();
        settings = newSettings || { id: 0, vatRate: 0.19, currency: 'CLP', yellowThresholdDays: 7, defaultPaymentTermsDays: 30, isSoloMode: false };
    }

    // 2. Fetch Global Audit Logs
    const { data: auditLogs } = await supabase
        .from('AuditLog')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(50);

    // 3. Update Action
    async function updateSettings(formData: FormData) {
        'use server'
        const supabase = await createClient();

        const vatRate = parseFloat(formData.get("vatRate") as string) / 100;
        const yellowThresholdDays = parseInt(formData.get("yellowThresholdDays") as string);
        const defaultPaymentTermsDays = parseInt(formData.get("defaultPaymentTermsDays") as string);
        const isSoloMode = formData.get("isSoloMode") === "on";

        if (settings?.id) {
            await supabase.from('Settings').update({
                vatRate,
                yellowThresholdDays,
                defaultPaymentTermsDays,
                isSoloMode
            }).eq('id', settings.id);
        }

        revalidatePath('/settings');
    }

    // 4. Identity Context
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    
    let profile = null;
    if (user) {
        const { data } = await supabase.from('Profile').select('*').eq('id', user.id).maybeSingle();
        profile = data;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Configuración</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">Ajusta tus preferencias personales y los parámetros del sistema.</p>
                </div>
            </div>

            {/* User Preferences Section (PLG Wave 5.1) */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-500" /> Mis Preferencias
                </h3>
                {profile && (
                    <UserPreferencesForm
                        userId={profile.id}
                        initialPreferences={{ receiveProductTips: (profile as any).receiveProductTips ?? true }}
                    />
                )}
            </div>

            {/* Quick Access */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/settings/users" className="group bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-md flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-white">Gestión de Usuarios</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Administrar equipo y permisos</p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-blue-500 transition-colors" />
                </Link>

                <Link href="/settings/organization" className="group bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-md flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 transition-colors">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-white">Organización</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Logo, RUT e identidad</p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-blue-500 transition-colors" />
                </Link>

                <Link href="/settings/billing" className="group bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-md flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-white">Facturación y Planes</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Ver consumo y suscripción</p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-blue-500 transition-colors" />
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <div className="space-y-8">
                    {/* Audit Log Trigger */}
                    <div className="max-w-2xl">
                        <GlobalAuditModal logs={auditLogs || []} />
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            Parámetros Generales
                        </h3>
                        <SettingsForm settings={settings!} updateSettingsAction={updateSettings} />
                    </div>
                </div>
            </div>
        </div>
    )
}
