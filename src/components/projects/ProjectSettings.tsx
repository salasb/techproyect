'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Database } from "@/types/supabase";
import { updateProjectSettings } from "@/app/actions/project-settings";
import { getDollarRateAction, getUfRateAction } from "@/app/actions/currency";
import { useToast } from "@/components/ui/Toast";
import { Save, Building2, Search, Check, X, Link as LinkIcon, AlertTriangle, Loader2 } from "lucide-react";

type Project = Database['public']['Tables']['Project']['Row'] & {
    company: Database['public']['Tables']['Company']['Row']
    client?: Database['public']['Tables']['Client']['Row'] | null // Add client relation
};

interface Props {
    project: Project;
    clients: Database['public']['Tables']['Client']['Row'][];
}

export function ProjectSettings({ project, clients }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClientId, setSelectedClientId] = useState<string | null>(project.clientId);
    const [isClientLoading, setIsClientLoading] = useState(false);

    // Currency Conversion State
    const [selectedCurrency, setSelectedCurrency] = useState(project.currency || 'CLP');
    const [showConversionOption, setShowConversionOption] = useState(false);
    const [shouldConvert, setShouldConvert] = useState(false);
    const [conversionRate, setConversionRate] = useState<number | null>(null);
    const [conversionRateDisplay, setConversionRateDisplay] = useState<string>("");

    const { toast } = useToast();

    // Effect to handle currency change logic
    async function handleCurrencyChange(newCurrency: string) {
        setSelectedCurrency(newCurrency);
        const oldCurrency = project.currency || 'CLP';

        if (newCurrency === oldCurrency) {
            setShowConversionOption(false);
            return;
        }

        // Determine rate
        // We only support simple conversions for now: CLP <-> UF, CLP <-> USD, USD <-> UF (maybe)
        // Let's implement basics first as requested: "When switching to UF..."

        let rate = 1;
        let display = "";

        // CLP -> UF or USD -> UF
        if (newCurrency === 'UF') {
            const uf = await getUfRateAction();
            if (uf) {
                rate = 1 / uf.value; // Amount * (1/UF_Value)
                display = `1 UF = $${uf.value.toLocaleString('es-CL')} (Factor: ${rate.toFixed(5)})`;
                setConversionRate(rate);
                setConversionRateDisplay(display);
                setShowConversionOption(true);
                return;
            }
        }

        // UF -> CLP or USD -> CLP
        if (newCurrency === 'CLP' && oldCurrency !== 'CLP') {
            // Need rate of old currency
            if (oldCurrency === 'UF') {
                const uf = await getUfRateAction();
                if (uf) {
                    rate = uf.value;
                    display = `1 UF = $${uf.value.toLocaleString('es-CL')}`;
                    setConversionRate(rate);
                    setConversionRateDisplay(display);
                    setShowConversionOption(true);
                    return;
                }
            }
            if (oldCurrency === 'USD') {
                const usd = await getDollarRateAction();
                if (usd) {
                    rate = usd.value;
                    display = `1 USD = $${usd.value.toLocaleString('es-CL')}`;
                    setConversionRate(rate);
                    setConversionRateDisplay(display);
                    setShowConversionOption(true);
                    return;
                }
            }
        }

        // CLP -> USD
        if (newCurrency === 'USD') {
            const usd = await getDollarRateAction();
            if (usd) {
                rate = 1 / usd.value;
                display = `1 USD = $${usd.value.toLocaleString('es-CL')}`;
                setConversionRate(rate);
                setConversionRateDisplay(display);
                setShowConversionOption(true);
                return;
            }
        }

        // Fallback or unsupported cross-currency (e.g. UF -> USD directly might be tricky without intermediate)
        // For now, simplify: if we have a valid rate detected, show option.
        setShowConversionOption(false);
    }

    // Debug
    console.log("ProjectSettings received clients:", clients.length);

    // Filter clients
    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.contactName && c.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.taxId && c.taxId.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // DEBUG: Log clients to see if they are arriving
    useEffect(() => {
        console.log("ProjectSettings mounted. Total clients:", clients.length);
        console.log("Client search term:", searchTerm);
        console.log("Filtered results:", filteredClients.length);
    }, [clients, searchTerm, filteredClients.length]);

    const selectedClient = clients.find(c => c.id === selectedClientId);

    const router = useRouter();

    async function handleLinkClient() {
        if (!selectedClientId) return;
        setIsClientLoading(true);
        try {
            await updateProjectSettings(project.id, { clientId: selectedClientId });
            toast({ type: 'success', message: "Cliente vinculado exitosamente" });
            router.refresh();
        } catch (error) {
            console.error("Link Client Error:", error);
            toast({ type: 'error', message: "Error vinculando cliente" });
        } finally {
            setIsClientLoading(false);
        }
    }

    // State for controlled inputs
    const [name, setName] = useState(project.name);
    const [status, setStatus] = useState(project.status);
    const [paymentMethod, setPaymentMethod] = useState((project as any).paymentMethod || 'FIFTY_FIFTY');
    const [progress, setProgress] = useState(project.progress);

    // Sync state with props when project updates
    // Sync state with props when project updates
    useEffect(() => {
        setName(project.name);
        setStatus(project.status);
        setPaymentMethod((project as any).paymentMethod || 'FIFTY_FIFTY');
        // Progress kept from prop but not editable via slider anymore.
        // If we want to fully rely on automated progress, we might ignore this or use it for display only elsewhere.
        // For now, removing it from editable state sync to avoid confusion, 
        // though the state variable 'progress' still exists if we need it for API compatibility.
        // setProgress(project.progress); 
        setSelectedCurrency(project.currency || 'CLP');

        // Init search term if client exists
        if (project.clientId) {
            const c = clients.find(cl => cl.id === project.clientId);
            if (c) setSearchTerm(c.name);
        }
    }, [project.name, project.currency, project.status, project.clientId, project.updatedAt, clients]);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        try {
            // Use state 'name' or formData (formData should have it if input has name attribute)
            // const marginPct = (parseFloat(formData.get("marginPct") as string) || 0) / 100; 
            // We removed the input, so we preserve the existing value or default to 0.3 if null/undefined
            const marginPct = project.marginPct ?? 0.3;
            const currency = formData.get("currency") as string;
            const nextAction = formData.get("nextAction") as string;
            const nextActionDateStr = formData.get("nextActionDate") as string;

            // Handle dates appropriately
            const nextActionDate = nextActionDateStr ? new Date(nextActionDateStr).toISOString() : null;

            await updateProjectSettings(project.id, {
                name,
                clientId: selectedClientId,
                status,
                progress: project.progress, // Preserve existing value, do not update from removed slider
                marginPct,
                currency,
                paymentMethod,
                nextAction,
                nextActionDate
            } as any, {
                convertValues: shouldConvert,
                conversionFactor: (shouldConvert && conversionRate) ? conversionRate : 1
            });
            toast({ type: 'success', message: "Configuración guardada exitosamente" });
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast({ type: 'error', message: error.message || "Error guardando configuración" });
        } finally {
            setIsLoading(false);
        }
    }

    // ... (rest of code) ...

    return (
        <div className="space-y-8">
            <form action={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* General Settings */}
                <div className="space-y-6 bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div>
                        <h3 className="text-lg font-medium text-foreground mb-4">Configuración General</h3>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Nombre del Proyecto <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="name"
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground font-semibold text-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Estado del Proyecto <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                        >
                            <option value="EN_ESPERA">En Espera</option>
                            <option value="EN_CURSO">En Curso</option>
                            <option value="BLOQUEADO">Bloqueado</option>
                            <option value="CERRADO">Cerrado</option>
                            <option value="CANCELADO">Cancelado</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Client Selection */}
                    <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6">
                        {/* Client Selection */}
                        <div>
                            <h3 className="text-sm font-medium text-foreground mb-4">Cliente Asociado</h3>
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Buscar cliente por nombre o RUT..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            // If user clears search or types, we might want to unset selectedClientId or keep it?
                                            // Standard Combobox behavior: if it doesn't match selected, it's just filtering.
                                        }}
                                        onFocus={() => {
                                            // Show list on focus
                                        }}
                                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                    {selectedClientId && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedClientId(null);
                                                setSearchTerm("");
                                            }}
                                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Combobox Dropdown - Only show if searching */}
                                {searchTerm && (
                                    <div className="border border-border rounded-lg max-h-48 overflow-y-auto bg-popover/50 backdrop-blur-sm">
                                        {filteredClients.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron clientes.</div>
                                        ) : (
                                            <div className="divide-y divide-border">
                                                {filteredClients.slice(0, 5).map((client) => ( // Limit to 5 results for cleaner UI
                                                    <button
                                                        key={client.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedClientId(client.id);
                                                            setSearchTerm(client.name); // Set input to selected Name
                                                        }}
                                                        className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors ${selectedClientId === client.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                                                    >
                                                        <div>
                                                            <p className="font-medium text-sm text-foreground">{client.name}</p>
                                                            <p className="text-xs text-muted-foreground">{client.taxId || 'Sin RUT'}</p>
                                                        </div>
                                                        {selectedClientId === client.id && <Check className="h-4 w-4 text-primary" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedClientId && !searchTerm && (
                                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {clients.find(c => c.id === selectedClientId)?.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {clients.find(c => c.id === selectedClientId)?.taxId}
                                            </p>
                                        </div>
                                        <Check className="h-4 w-4 text-primary" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Financial Settings Card */}
                    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">Financiero</h4>

                        <div className="space-y-4">


                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Moneda del Proyecto <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="currency"
                                    value={selectedCurrency}
                                    onChange={(e) => handleCurrencyChange(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                                >
                                    <option value="CLP">Pesos Chilenos (CLP)</option>
                                    <option value="USD">Dólares (USD)</option>
                                    <option value="UF">Unidad de Fomento (UF)</option>
                                </select>

                                {showConversionOption && (
                                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 rounded-lg">
                                        <div className="flex items-start">
                                            <input
                                                id="convertValues"
                                                type="checkbox"
                                                checked={shouldConvert}
                                                onChange={(e) => setShouldConvert(e.target.checked)}
                                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor="convertValues" className="ml-2 block text-sm">
                                                <span className="font-medium text-blue-900 dark:text-blue-100">Recalcular montos existentes</span>
                                                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                                    Se convertirán costos, presupuestos y cotizaciones usando la tasa de hoy: <br />
                                                    <strong>{conversionRateDisplay}</strong>
                                                </p>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Condición de Pago <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                                >
                                    <option value="FIFTY_FIFTY">50% Anticipo / 50% Contra Entrega</option>
                                    <option value="CASH">Contado Contra Entrega</option>
                                    <option value="30_DAYS">Crédito 30 Días</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Alerts & Workflow Card */}
                    <div className="bg-card rounded-xl border border-border p-6 shadow-sm h-full">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-2 flex items-center gap-2">
                            Control & Alertas
                        </h4>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Próxima Acción (Recordatorio)
                                </label>
                                <input
                                    name="nextAction"
                                    type="text"
                                    defaultValue={project.nextAction || ''}
                                    placeholder="Ej: Llamar cliente, Enviar cotización..."
                                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Fecha Límite Próxima Acción
                                </label>
                                <input
                                    name="nextActionDate"
                                    type="date"
                                    defaultValue={project.nextActionDate ? new Date(project.nextActionDate).toISOString().split('T')[0] : ''}
                                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                                />
                            </div>
                        </div>
                    </div>
                </div>


                <div className="col-span-1 lg:col-span-2 pt-4 border-t border-border flex justify-end">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>

            {/* DANGER ZONE */}
            <div className="max-w-2xl bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-900/50 p-6 shadow-sm">
                <h3 className="text-lg font-medium text-red-700 dark:text-red-400 mb-2 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Zona de Peligro
                </h3>
                <p className="text-sm text-red-600/80 dark:text-red-300/80 mb-6">
                    Estas acciones son destructivas y no se pueden deshacer.
                </p>

                <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-red-100 dark:border-red-900/30">
                    <div>
                        <h4 className="font-medium text-foreground text-sm">Eliminar Proyecto</h4>
                        <p className="text-xs text-muted-foreground mt-1">Elimina permanentemente este proyecto y todos sus datos asociados.</p>
                    </div>
                    <DeleteProjectButton projectId={project.id} />
                </div>
            </div>
        </div>
    );
}

import { deleteProject } from "@/app/actions/projects";

function DeleteProjectButton({ projectId }: { projectId: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    async function handleDelete() {
        if (!confirm("¿ESTÁS SEGURO? Esta acción eliminará permanentemente el proyecto y todos sus datos. No se puede deshacer.")) return;

        // Double check
        const projectNameInput = prompt("Para confirmar, escribe 'ELIMINAR' en mayúsculas:");
        if (projectNameInput !== 'ELIMINAR') {
            toast({ type: 'error', message: "Confirmación fallida. Proyecto no eliminado." });
            return;
        }

        setIsDeleting(true);
        try {
            const result = await deleteProject(projectId);
            if (result.success) {
                toast({ type: 'success', message: "Proyecto eliminado exitosamente" });
                // Redirect client-side to avoid server component errors
                window.location.href = "/projects";
            } else {
                toast({ type: 'error', message: result.error || "Error al eliminar" });
                setIsDeleting(false);
            }
        } catch (error: any) {
            toast({ type: 'error', message: error.message || "Error al eliminar" });
            setIsDeleting(false);
        }
    }

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
        >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Eliminar Proyecto
        </button>
    );
}

import { Trash2 } from "lucide-react";
