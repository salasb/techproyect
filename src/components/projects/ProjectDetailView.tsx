'use client'

import { useState, useEffect, useRef } from "react";
import { Database } from "@/types/supabase";
import { addLog } from "@/actions/project-logs";
import { FinancialResult } from "@/services/financialCalculator";
import { getDollarRateAction, getUfRateAction } from "@/app/actions/currency";
import { updateProjectStatus } from "@/app/actions/projects";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import {
    Calendar,
    Clock,
    DollarSign,
    FileText,
    History,
    LayoutDashboard,
    PieChart,
    Settings,
    MoreVertical,
    CheckCircle2,
    AlertCircle,
    ArrowUpRight,
    TrendingUp,
    Info,
    Activity,
    Check,
    User,
    Wallet,
    X,
    Sparkles,
    RefreshCw,
    Lock
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, differenceInDays, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { usePathname, useRouter } from "next/navigation";

import { ProjectSettings } from "./ProjectSettings";
import { AuditLog } from "./AuditLog";
import { ProjectLogsManager } from "./ProjectLogsManager";
import ProjectFinancialAuditor from "./ProjectFinancialAuditor";
import { UnifiedTimeline } from "./UnifiedTimeline";
import { QuoteItemsManager } from "./QuoteItemsManager";
import { CostsManager } from "./CostsManager";
import { InvoicesManager } from "./InvoicesManager";
import { ProjectScope } from "./ProjectScope";
import { ExchangeRate } from "@/services/currency";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface ProjectDetailViewProps {
    project: any; // Using any for now to avoid strict type checks on complex joined data
    clients: any[];
    auditLogs: any[];
    financials: FinancialResult;
    settings: any;
    projectLogs: any[];
    risk: any;
    exchangeRate: ExchangeRate;
    ufRate: ExchangeRate;
}

export default function ProjectDetailView({ project, clients, auditLogs, financials, settings, projectLogs, risk, exchangeRate: initialExchangeRate, ufRate: initialUfRate }: ProjectDetailViewProps) {
    const [currency, setCurrency] = useState<'CLP' | 'USD' | 'UF'>(project.currency as 'CLP' | 'USD' | 'UF' || 'CLP');
    const [activeTab, setActiveTab] = useState('overview');
    const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
    const [isCostsModalOpen, setIsCostsModalOpen] = useState(false);
    const [exchangeRate, setExchangeRate] = useState<ExchangeRate>(initialExchangeRate);
    const [ufRate, setUfRate] = useState<ExchangeRate>(initialUfRate);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        confirmText?: string;
        cancelText?: string;
        variant?: 'danger' | 'warning' | 'info' | 'success';
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: () => { },
    });

    const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

    // Optimistic UI State
    const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);

    // Derived project state
    const displayProject = {
        ...project,
        status: optimisticStatus || project.status
    };

    async function executeQuoteAction(action: 'SEND' | 'ACCEPT' | 'REJECT' | 'REOPEN') {
        const previousStatus = displayProject.status;
        let newStatus = previousStatus;

        // Optimistic Update
        if (action === 'SEND') newStatus = 'EN_ESPERA';
        else if (action === 'ACCEPT') newStatus = 'EN_CURSO';
        else if (action === 'REJECT') newStatus = 'CANCELADO';
        else if (action === 'REOPEN') newStatus = 'EN_ESPERA';

        setOptimisticStatus(newStatus);
        setIsUpdatingStatus(true);
        closeConfirm(); // Close immediately for better UX

        try {
            if (action === 'SEND') {
                await updateProjectStatus(project.id, 'EN_ESPERA', 'COTIZACION', 'Seguimiento Cotización');
                // Open Mailto
                const subject = `Cotización ${project.name} - TechWise SpA`;
                const body = `Estimado cliente,\n\nAdjunto encontrará la cotización para el proyecto reference.\n\nQuedamos atentos.\n\nSaludos,\nChristian Salas\nTechWise SpA`;
                window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                toast({ type: 'success', message: "Estado actualizado a En Espera" });
            } else if (action === 'ACCEPT') {
                await updateProjectStatus(project.id, 'EN_CURSO', 'DISENO', 'Iniciar Desarrollo');
                toast({ type: 'success', message: "¡Proyecto Aceptado! Estado: En Curso" });
            } else if (action === 'REJECT') {
                await updateProjectStatus(project.id, 'CANCELADO');
                toast({ type: 'info', message: "Proyecto marcado como Cancelado" });
            } else if (action === 'REOPEN') {
                await updateProjectStatus(project.id, 'EN_ESPERA', project.stage || 'LEVANTAMIENTO', 'Reevaluar Proyecto');
                toast({ type: 'success', message: "Proyecto reabierto exitosamente" });
            }
            router.refresh();
        } catch (error) {
            console.error(error);
            toast({ type: 'error', message: "Error al actualizar estado" });
            setOptimisticStatus(null); // Revert logic handled by useEffect sync, but explicit null here safegaurds
        } finally {
            setIsUpdatingStatus(false);
            // We don't clear optimistic status here immediately to prevent flicker before router.refresh() takes over
            // The useEffect below will handle sync when new project prop arrives
        }
    }

    // Sync optimistic state when prop updates (router.refresh completes)
    useEffect(() => {
        setOptimisticStatus(null);
    }, [project.status]);

    const requestQuoteAction = (action: 'SEND' | 'ACCEPT' | 'REJECT' | 'REOPEN') => {
        const config: {
            isOpen: boolean;
            title: string;
            description: string;
            confirmText?: string;
            cancelText?: string;
            variant?: 'danger' | 'warning' | 'info' | 'success';
            onConfirm: () => void;
        } = {
            isOpen: true,
            onConfirm: () => executeQuoteAction(action),
            title: '',
            description: '',
            confirmText: 'Confirmar',
            variant: 'info'
        };

        if (action === 'SEND') {
            config.title = '¿Enviar Cotización?';
            config.description = 'Esto cambiará el estado a EN ESPERA y abrirá su cliente de correo. Asegúrese de adjuntar el PDF.';
            config.confirmText = 'Enviar y Actualizar';
            config.variant = 'info';
        } else if (action === 'ACCEPT') {
            config.title = '¿Aceptar Propuesta?';
            config.description = 'El proyecto pasará a estado EN CURSO. ¡Felicitaciones!';
            config.confirmText = '¡Aceptar!';
            config.variant = 'success';
        } else if (action === 'REJECT') {
            config.title = '¿Rechazar Proyecto?';
            config.description = 'El proyecto será CANCELADO. Esta acción puede revertirse reabriendo el proyecto después.';
            config.confirmText = 'Rechazar';
            config.variant = 'danger';
        } else if (action === 'REOPEN') {
            config.title = '¿Reabrir Proyecto?';
            config.description = 'El proyecto volverá a estado EN ESPERA para ser reevaluado.';
            config.variant = 'warning';
        }

        setConfirmConfig(config as any); // Cast to fix potential type mismatches with state
    };

    async function handleManualQuoteSent() {
        setConfirmConfig({
            isOpen: true,
            title: '¿Confirmar Envío Manual?',
            description: 'Se registrará que la cotización fue enviada hoy y el estado cambiará a EN ESPERA.',
            confirmText: 'Registrar Envío',
            variant: 'info',
            onConfirm: async () => {
                setIsUpdatingStatus(true);
                try {
                    await updateProjectStatus(project.id, 'EN_ESPERA', 'COTIZACION', 'Seguimiento Cotización');
                    toast({ type: 'success', message: "Envío registrado exitosamente" });
                    router.refresh();
                } catch (error) {
                    console.error(error);
                    toast({ type: 'error', message: "Error al registrar envío" });
                } finally {
                    setIsUpdatingStatus(false);
                    closeConfirm();
                }
            }
        });
    }

    // Alerts logic
    const alerts: { type: 'success' | 'warning' | 'danger' | 'info', msg: string }[] = [];

    // Financial Alerts
    const marginPct = financials.priceNet > 0 ? (financials.marginAmountNet / financials.priceNet) : 0;
    if (marginPct <= 0.05) alerts.push({ type: 'danger', msg: 'Margen crítico (0-5%)' });
    else if (marginPct <= 0.15) alerts.push({ type: 'warning', msg: 'Margen bajo (6-15%)' });

    // Date Alerts
    if (financials.trafficLightTime === 'RED') {
        alerts.push({ type: 'danger', msg: 'Proyecto atrasado en fecha de término' });
    }

    // Collection Alerts
    if (financials.trafficLightCollection === 'RED') {
        alerts.push({ type: 'danger', msg: 'Facturas Vencidas - Gestionar Cobranza' });
    }

    // Fully Invoiced but Pending Payment
    if (financials.totalInvoicedGross >= financials.priceGross && financials.receivableGross > 0) {
        alerts.push({ type: 'info', msg: '100% Facturado - Esperando Pago Final' });
    }

    // AUTO-LOGGING: 100% Invoiced
    const hasLoggedFullInvoice = projectLogs.some(log =>
        log.type === 'MILESTONE' && log.content.includes('100% Facturado')
    );

    // Use a ref to prevent double-firing in strict mode or rapid re-renders
    const isLoggingRef = useRef(false);

    useEffect(() => {
        const checkAndLog = async () => {
            if (
                financials.totalInvoicedGross >= financials.priceGross &&
                financials.priceGross > 0 &&
                !hasLoggedFullInvoice &&
                !isLoggingRef.current
            ) {
                isLoggingRef.current = true;
                try {
                    await addLog(project.id, "Hito alcanzado: Proyecto 100% Facturado. Esperando pago.", "MILESTONE");
                } catch (e) {
                    console.error("Auto-log failed", e);
                } finally {
                    isLoggingRef.current = false;
                }
            }
        };
        checkAndLog();
    }, [financials.totalInvoicedGross, financials.priceGross, hasLoggedFullInvoice, project.id]);

    useEffect(() => {
        if (project.currency) setCurrency(project.currency as 'CLP' | 'USD' | 'UF');
    }, [project.currency]);

    const formatMoney = (amount: number) => {
        const baseCurrency = project.currency || 'CLP';
        let value = amount;
        let targetCurrency = currency;

        // 1. Calculate Value in Target Currency
        if (baseCurrency !== targetCurrency) {
            // Conversion Logic
            // Case A: Base is CLP
            if (baseCurrency === 'CLP') {
                if (targetCurrency === 'USD') value = amount / (exchangeRate?.value || 1);
                if (targetCurrency === 'UF') value = amount / (ufRate?.value || 1);
            }
            // Case B: Base is USD
            else if (baseCurrency === 'USD') {
                if (targetCurrency === 'CLP') value = amount * (exchangeRate?.value || 1);
                if (targetCurrency === 'UF') {
                    // USD -> CLP -> UF
                    const clp = amount * (exchangeRate?.value || 1);
                    value = clp / (ufRate?.value || 1);
                }
            }
            // Case C: Base is UF
            else if (baseCurrency === 'UF') {
                if (targetCurrency === 'CLP') value = amount * (ufRate?.value || 1);
                if (targetCurrency === 'USD') {
                    // UF -> CLP -> USD
                    const clp = amount * (ufRate?.value || 1);
                    value = clp / (exchangeRate?.value || 1);
                }
            }
        }

        // 2. Format
        if (targetCurrency === 'CLP') return `$${Math.round(value).toLocaleString('es-CL')}`;
        if (targetCurrency === 'USD') return `US$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        if (targetCurrency === 'UF') return `UF ${value.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        return `$${Math.round(value).toLocaleString('es-CL')}`;
    };

    // Last Activity Logic
    const lastActivity = auditLogs && auditLogs.length > 0 ? auditLogs[0] : null;

    // Digital Acceptance Logic
    const acceptanceLog = auditLogs?.find((log: any) =>
        log.type === 'STATUS_CHANGE' &&
        (log.content.includes('En Curso') || log.content.includes('Aceptado'))
    );

    // Next Action Status Logic
    const getNextActionStatus = () => {
        if (!project.nextActionDate) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const actionDate = new Date(project.nextActionDate);
        actionDate.setHours(0, 0, 0, 0);

        const diff = differenceInDays(actionDate, today);

        if (diff < 0) return { label: 'Atrasado', color: 'text-red-600 bg-red-50 border-red-200', iconColor: 'text-red-500' };
        if (diff === 0) return { label: 'Para Hoy', color: 'text-amber-600 bg-amber-50 border-amber-200', iconColor: 'text-amber-500' };
        return { label: 'Pendiente', color: 'text-blue-600 bg-blue-50 border-blue-200', iconColor: 'text-blue-500' };
    };

    const actionStatus = getNextActionStatus();

    // Lock Logic
    const isLocked = displayProject.status === 'FINALIZADO' || (financials.totalInvoicedGross >= financials.priceGross && financials.priceGross > 0);

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {displayProject.status === 'FINALIZADO' && (
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-full text-emerald-600 dark:text-emerald-400">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">¡Proyecto Finalizado Exitosamente!</h3>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                                Este proyecto ha sido completado y pagado en su totalidad.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 bg-white dark:bg-zinc-900/50 px-6 py-3 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
                        <div>
                            <span className="block text-xs uppercase text-emerald-600/70 font-bold tracking-wider">Total Facturado</span>
                            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                                {formatMoney(financials.totalInvoicedGross)}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-emerald-200 dark:bg-emerald-800" />
                        <div>
                            <span className="block text-xs uppercase text-emerald-600/70 font-bold tracking-wider">Margen Final</span>
                            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                                {financials.priceNet > 0 ? ((financials.marginAmountNet / financials.priceNet) * 100).toFixed(0) : 0}%
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                    {project.name}
                    <StatusBadge status={displayProject.status} type="PROJECT" />
                    {isLocked && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium rounded-full border border-zinc-200 dark:border-zinc-700" title="Proyecto bloqueado - Facturación completa o finalizado">
                            <Lock className="w-3 h-3" />
                            <span>Contenido Sellado</span>
                        </div>
                    )}
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">{project.company?.name || 'Cliente Sin Nombre'}</p>
            </div>

            <div className="flex gap-2 justify-end -mt-4 mb-4">
                <Link href={`/projects/${project.id}/quote`}>
                    <button className="text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-lg font-medium transition-colors shadow-sm flex items-center">
                        <FileText className="w-3 h-3 mr-1.5" />
                        Ver Cotización
                    </button>
                </Link>

                {/* CANCELLED STATE ACTIONS */}
                {project.status === 'CANCELADO' && (
                    <button
                        onClick={() => requestQuoteAction('REOPEN')}
                        disabled={isUpdatingStatus}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors shadow-sm flex items-center"
                    >
                        <RefreshCw className="w-3 h-3 mr-1.5" />
                        Reabrir Proyecto
                    </button>
                )}

                {/* ACTIVE STATE ACTIONS */}
                {project.status !== 'FINALIZADO' && project.status !== 'CANCELADO' && (
                    <>
                        {/* Show Send Options if Quote NOT Sent and Stage is LEVANTAMIENTO (or undefined) and not Started/Cancelled */}
                        {!project.quoteSentDate && (project.stage === 'LEVANTAMIENTO' || !project.stage) && project.status !== 'EN_CURSO' && (
                            <>
                                <button
                                    onClick={() => requestQuoteAction('SEND')}
                                    disabled={isUpdatingStatus}
                                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors shadow-sm flex items-center"
                                >
                                    <Sparkles className="w-3 h-3 mr-1.5" />
                                    Enviar Cotización
                                </button>

                                <button
                                    onClick={handleManualQuoteSent}
                                    disabled={isUpdatingStatus}
                                    className="text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-lg font-medium transition-colors shadow-sm flex items-center"
                                    title="Registrar envío sin abrir correo"
                                >
                                    <CheckCircle2 className="w-3 h-3 mr-1.5" />
                                    Registrar Envío
                                </button>
                            </>
                        )}

                        {/* Show Response Options if Quote HAS BEEN SENT */}
                        {project.quoteSentDate && project.status === 'EN_ESPERA' && (
                            <>
                                <button
                                    onClick={() => requestQuoteAction('ACCEPT')}
                                    disabled={isUpdatingStatus}
                                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors shadow-sm flex items-center"
                                >
                                    <CheckCircle2 className="w-3 h-3 mr-1.5" />
                                    Registrar Aceptación
                                </button>
                                <button
                                    onClick={() => requestQuoteAction('REJECT')}
                                    disabled={isUpdatingStatus}
                                    className="text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3 py-1.5 rounded-lg font-medium transition-colors shadow-sm flex items-center"
                                >
                                    <X className="w-3 h-3 mr-1.5" />
                                    Rechazar
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Header / Navigation Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-2 rounded-xl shadow-sm sticky top-4 z-30 backdrop-blur-md bg-opacity-90">
                <div className="flex p-1 bg-muted/50 rounded-lg w-full sm:w-auto">
                    {[
                        { id: 'overview', label: 'Visión General', icon: LayoutDashboard },
                        { id: 'items', label: 'Ítems', icon: FileText },
                        { id: 'financials', label: 'Finanzas', icon: DollarSign },
                        { id: 'logs', label: 'Bitácora', icon: History },
                        { id: 'settings', label: 'Configuración', icon: Settings },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-1 sm:flex-none justify-center border group
                                ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/20'
                                    : 'bg-transparent text-zinc-600 border-transparent hover:bg-blue-50 hover:text-blue-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-blue-400'
                                }`}
                        >
                            <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-blue-100' : 'text-zinc-400 group-hover:text-blue-500'}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1 w-full sm:w-auto p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <span className="text-[10px] font-semibold text-muted-foreground px-2 uppercase tracking-wider hidden sm:block">Visualizar en:</span>
                    {['CLP', 'USD'].map((c) => (
                        <button
                            key={c}
                            onClick={() => setCurrency(c as 'CLP' | 'UF' | 'USD')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all min-w-[3.5rem] text-center
                                        ${currency === c
                                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700'
                                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 dark:text-zinc-400'}`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div >

            {
                activeTab === 'overview' && (
                    <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Left Column: Status & Key Info */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* ALERTS & PENDING ACTIONS CARD */}
                            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center">
                                    <Activity className="w-4 h-4 mr-2 text-primary" />
                                    Estado y Alertas
                                </h3>

                                {/* Alert Logic Display */}
                                {alerts.length > 0 ? (
                                    <div className="space-y-2 mb-4">
                                        {alerts.map((alert, idx) => (
                                            <div key={idx} className={`p-3 rounded-lg border text-sm flex items-center ${alert.type === 'danger' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/10' :
                                                alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/10' :
                                                    'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/10'
                                                }`}>
                                                <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                                                {alert.msg}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={`p-4 border rounded-lg text-sm mb-4 ${project.status === 'EN_ESPERA' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/10 dark:border-green-900/30'}`}>
                                        <div className="flex items-center font-medium mb-1">
                                            <Check className="w-4 h-4 mr-2" />
                                            {project.status === 'EN_ESPERA' ? 'Sin Alertas (En Espera)' : 'Todo en orden'}
                                        </div>
                                        <div className="text-xs opacity-90 leading-relaxed">
                                            {project.status === 'EN_ESPERA'
                                                ? (
                                                    <div>
                                                        El proyecto está detenido. No se esperan avances ni movimientos financieros.
                                                        {project.quoteSentDate && (
                                                            <div className="mt-2 text-yellow-700 bg-yellow-100/50 p-2 rounded-md flex items-center">
                                                                <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                                                                <span>Cotización enviada el <strong>{format(new Date(project.quoteSentDate), "d 'de' MMMM", { locale: es })}</strong></span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                                : (
                                                    <div>
                                                        <span>El proyecto avanza según lo planificado.</span>
                                                        {acceptanceLog && (
                                                            <div className="mt-2 text-emerald-700 bg-emerald-100/50 p-2 rounded-md flex items-center border border-emerald-200/50">
                                                                <CheckCircle2 className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                                                                <span>
                                                                    Aceptación Digital registrada el <strong>{format(new Date(acceptanceLog.createdAt), "d 'de' MMMM", { locale: es })}</strong>
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            {project.status === 'EN_CURSO' && (
                                                <ul className="list-disc list-inside mt-1 space-y-0.5 ml-1">
                                                    <li>Presupuesto ejecutado al <strong>{financials.calculatedProgress.toFixed(0)}%</strong> (Dentro de lo esperado).</li>
                                                    <li>Margen actual del <strong>{(financials.priceNet > 0 ? (financials.marginAmountNet / financials.priceNet) * 100 : 0).toFixed(1)}%</strong> considerado saludable.</li>
                                                    {project.nextActionDate && <li>Próxima acción programada para el <strong>{format(new Date(project.nextActionDate), 'dd MMM', { locale: es })}</strong>.</li>}
                                                    {project.quoteSentDate && <li>Cotización enviada el <strong>{format(new Date(project.quoteSentDate), "d 'de' MMMM", { locale: es })}</strong>.</li>}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* NEXT ACTION - IMPROVED */}
                                    <div className={`p-3 rounded-lg border ${actionStatus ? actionStatus.color.replace('text-', 'border-').replace('bg-', 'bg-opacity-10 ') : 'bg-zinc-50 border-zinc-100'} relative overflow-hidden`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Siguiente Gestión</span>
                                            {actionStatus && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${actionStatus.color}`}>
                                                    {actionStatus.label}
                                                </span>
                                            )}
                                        </div>

                                        <div className="font-medium text-sm flex items-start mt-2">
                                            <Calendar className={`w-4 h-4 mr-2 mt-0.5 shrink-0 ${actionStatus ? actionStatus.iconColor : 'text-zinc-400'}`} />
                                            <span className="line-clamp-2">{project.nextAction || "Sin gestión pendiente"}</span>
                                        </div>

                                        <div className="text-xs text-zinc-500 mt-2 pl-6">
                                            {project.nextActionDate ? (
                                                <span>
                                                    {format(new Date(project.nextActionDate), "d 'de' MMMM", { locale: es })}
                                                    {actionStatus?.label === 'Atrasado' && <span className="text-red-600 font-medium ml-1">(Vencido)</span>}
                                                </span>
                                            ) : '-'}
                                        </div>
                                    </div>

                                    {/* RESPONSIBLE & LAST ACTIVITY - IMPROVED */}
                                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between">
                                        <div>
                                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-2">Responsable</span>
                                            <div className="font-medium text-sm flex items-center mb-3">
                                                <User className="w-4 h-4 mr-2 text-primary/70" />
                                                {project.responsible || "Sin asignar"}
                                            </div>
                                        </div>

                                        {lastActivity && (
                                            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 mt-auto">
                                                <div className="flex items-center text-xs text-muted-foreground mb-0.5">
                                                    <History className="w-3 h-3 mr-1" />
                                                    última actividad:
                                                </div>
                                                <div className="text-xs font-medium text-foreground truncate" title={`${lastActivity.userName || 'Usuario'} - ${lastActivity.details || ''}`}>
                                                    {lastActivity.userName || 'Usuario'}
                                                </div>
                                                <div className="text-[10px] text-zinc-500">
                                                    hace {formatDistanceToNow(new Date(lastActivity.createdAt!), { locale: es })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RECENT ACTIVITY / MILESTONES */}
                            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-semibold text-foreground flex items-center">
                                        <History className="w-4 h-4 mr-2 text-primary" />
                                        Hitos Recientes
                                    </h3>
                                    <button
                                        onClick={() => setActiveTab('logs')}
                                        className="text-xs text-blue-600 hover:underline"
                                    >
                                        Ver Bitácora Completa
                                    </button>
                                </div>
                                {projectLogs && projectLogs.length > 0 ? (
                                    <div className="space-y-3">
                                        {projectLogs.slice(0, 3).map((log: any) => (
                                            <div key={log.id} className="flex gap-3 text-sm p-2 hover:bg-muted/50 rounded-lg transition-colors">
                                                <div className="flex-none w-16 text-xs text-muted-foreground pt-0.5">
                                                    {format(new Date(log.createdAt), 'dd MMM')}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium
                                                            ${log.type === 'MILESTONE' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300' :
                                                                log.type === 'BLOCKER' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300' :
                                                                    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300'}`}>
                                                            {log.type === 'MILESTONE' ? 'HITO' : log.type === 'BLOCKER' ? 'BLOQUEO' : 'NOTA'}
                                                        </span>
                                                        <span className="font-medium text-foreground line-clamp-1">{log.content}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-xs text-muted-foreground italic">
                                        No hay registros en la bitácora aún.
                                    </div>
                                )}
                            </div>

                            {/* DEADLINES & STATUS CARD (Simplified) */}
                            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-sm font-semibold text-foreground flex items-center">
                                        <Calendar className="w-4 h-4 mr-2 text-primary" />
                                        Plazos del Proyecto
                                    </h3>
                                    {/* Optional: Add a simple status badge here if needed, or keep clean */}
                                </div>

                                <div className="grid grid-cols-3 gap-4 text-center divide-x divide-border">
                                    <div>
                                        <div className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">Inicio</div>
                                        <div className="font-medium text-sm text-foreground">
                                            {project.startDate ? format(new Date(project.startDate), 'dd MMM yy') : '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">Término</div>
                                        <div className="font-medium text-sm text-foreground">
                                            {project.plannedEndDate ? format(new Date(project.plannedEndDate), 'dd MMM yy') : '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">Tiempo Restante</div>
                                        <div className={`font-bold text-sm ${financials.trafficLightTime === 'RED' ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                                            {project.plannedEndDate ? (
                                                (() => {
                                                    const days = differenceInDays(new Date(project.plannedEndDate), new Date());
                                                    if (days < 0) return `Vencido hace ${Math.abs(days)} días`;
                                                    if (days === 0) return 'Vence hoy';
                                                    return `${days} días`;
                                                })()
                                            ) : '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <ProjectScope project={project} />
                        </div>

                        {/* Right Column: Financial Summary */}
                        <div className="space-y-6">
                            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-border bg-muted/20">
                                    <h3 className="font-semibold text-foreground flex items-center">
                                        <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                                        Finanzas
                                        <div className="ml-auto flex items-center gap-2">
                                            {project.currency === 'USD' && exchangeRate && (
                                                <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100 flex items-center" title={`Fuente: ${exchangeRate.source} (${new Date(exchangeRate.date).toLocaleDateString()})`}>
                                                    <RefreshCw className="w-3 h-3 mr-1" />
                                                    Hoy: ${exchangeRate.value.toLocaleString('es-CL', { maximumFractionDigits: 1 })} ({exchangeRate.date ? format(new Date(exchangeRate.date), "dd/MM/yy") : ''}) • {exchangeRate.source}
                                                </span>
                                            )}
                                        </div>
                                    </h3>
                                </div>
                                <div className="p-6 space-y-8">
                                    {/* AI Auditor */}
                                    <ProjectFinancialAuditor projectId={project.id} />

                                    {/* Cost Analysis */}
                                    {/* Financial Plan vs Actual */}
                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6 border-b border-border pb-2">Plan vs Ejecución</h4>
                                        <div className="flex flex-col gap-8">
                                            {/* Plan (Business Case) */}
                                            <div className="relative pl-4 border-l-2 border-zinc-200 dark:border-zinc-700">
                                                <h5 className="text-sm font-bold text-foreground mb-3 flex items-center justify-between">
                                                    <span>Planificado (Base)</span>
                                                    <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-medium">Presupuesto</span>
                                                </h5>

                                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                                    <div className="text-muted-foreground">Venta Neta</div>
                                                    <div className="text-right font-medium">{formatMoney(financials.priceNet)}</div>

                                                    <div className="text-muted-foreground">Costo Base</div>
                                                    <div className="text-right text-zinc-500">-{formatMoney(financials.baseCostNet)}</div>

                                                    <div className="col-span-2 my-1 border-t border-border"></div>

                                                    <div className="col-span-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50 rounded-lg p-3 mt-1">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-tight">Utilidad Proy.</span>
                                                            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                                                                {formatMoney(financials.marginAmountNet)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-emerald-600 dark:text-emerald-500 font-medium">Margen %</span>
                                                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                                                {financials.priceNet > 0 ? ((financials.marginAmountNet / financials.priceNet) * 100).toFixed(1) : '0.0'}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actual (Reality) */}
                                            <div className="relative pl-4 border-l-2 border-amber-400 dark:border-amber-600/50">
                                                <h5 className="text-sm font-bold text-foreground mb-3 flex items-center justify-between">
                                                    <span>Gastos Ejecutados</span>
                                                </h5>

                                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                                    <div className="text-muted-foreground">Total Gastos</div>
                                                    <div className="text-right font-medium text-amber-700 dark:text-amber-500">
                                                        -{formatMoney(financials.totalExecutedCostNet)}
                                                    </div>

                                                    <div className="col-span-2 my-1 border-t border-border border-dashed"></div>

                                                    <div className="font-medium text-foreground">Saldo (Venta - Gasto)</div>
                                                    <div className="text-right">
                                                        {(() => {
                                                            const balance = financials.priceNet - financials.totalExecutedCostNet;
                                                            return (
                                                                <span className={`font-bold ${balance < 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                                                                    {formatMoney(balance)}
                                                                </span>
                                                            )
                                                        })()}
                                                    </div>

                                                    <div className="col-span-2 mt-1">
                                                        <p className="text-[10px] text-muted-foreground italic leading-tight">
                                                            * Saldo disponible para cubrir gastos restantes y utilidad.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grand Total */}
                                    <div className="mt-6 pt-4 border-t border-border">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                                <span>Neto</span>
                                                <span className="font-mono">{formatMoney(financials.priceNet)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                                <span>IVA</span>
                                                <span className="font-mono">{formatMoney(financials.vatAmount)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-dashed border-border mt-1">
                                                <span className="font-bold text-foreground text-base">Total a Facturar</span>
                                                <span className="text-xl font-bold text-primary font-mono">{formatMoney(financials.priceGross)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                activeTab === 'logs' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <ProjectLogsManager projectId={project.id} logs={projectLogs} />
                    </div>
                )
            }

            {
                activeTab === 'items' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <QuoteItemsManager
                            projectId={project.id}
                            items={project.quoteItems || []}
                            defaultMargin={project.marginPct ? project.marginPct * 100 : 30}
                            baseCurrency={project.currency || 'CLP'}
                            displayCurrency={currency}
                            exchangeRate={exchangeRate}
                            ufRate={ufRate}
                            isLocked={isLocked}
                        />
                    </div>
                )
            }

            {
                activeTab === 'financials' && (
                    <div className="grid gap-8 grid-cols-1 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Left Column: Management */}
                        <div className="lg:col-span-2 space-y-8">
                            <section>
                                <CostsManager
                                    projectId={project.id}
                                    costs={project.costEntries}
                                    baseCurrency={project.currency || 'CLP'}
                                    displayCurrency={currency}
                                    exchangeRate={exchangeRate}
                                    ufRate={ufRate}
                                    isLocked={isLocked}
                                />
                            </section>
                            <section>
                                <InvoicesManager
                                    projectId={project.id}
                                    invoices={project.invoices}
                                    baseCurrency={project.currency || 'CLP'}
                                    displayCurrency={currency}
                                    exchangeRate={exchangeRate}
                                    ufRate={ufRate}
                                    totalAmount={financials.priceGross}
                                />
                            </section>
                            <div className="p-5">
                                {(() => {
                                    const marginPct = financials.priceNet > 0 ? (financials.marginAmountNet / financials.priceNet) * 100 : 0;
                                    const isProfitable = marginPct > 10;
                                    const isHighProfit = marginPct > 30;
                                    const hasBalance = (financials.priceNet - financials.totalExecutedCostNet) > 0;

                                    let verdict = "El proyecto presenta indicadores positivos.";
                                    let statusColor = "text-green-600";

                                    if (isHighProfit) {
                                        verdict = "Este proyecto es altamente rentable con un margen superior al 30%.";
                                    } else if (isProfitable) {
                                        verdict = "El proyecto es rentable y se mantiene dentro de los márgenes esperados.";
                                    } else {
                                        verdict = "La rentabilidad es baja. Se recomienda revisar la estructura de costos.";
                                        statusColor = "text-amber-600";
                                    }

                                    if (!hasBalance) {
                                        verdict = "ALERTA: El proyecto presenta déficit (gastos superan venta).";
                                        statusColor = "text-red-600";
                                    }

                                    return (
                                        <div className="space-y-4">
                                            <div className={`text-sm font-medium ${statusColor}`}>
                                                {verdict}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded border border-zinc-100 dark:border-zinc-800">
                                                    <span className="text-[10px] uppercase text-muted-foreground block">Rentabilidad</span>
                                                    <span className={`text-sm font-bold ${marginPct < 10 ? 'text-amber-600' : 'text-green-600'}`}>
                                                        {marginPct < 10 ? 'BAJA' : marginPct > 30 ? 'ALTA' : 'NORMAL'} ({marginPct.toFixed(1)}%)
                                                    </span>
                                                </div>
                                                <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded border border-zinc-100 dark:border-zinc-800">
                                                    <span className="text-[10px] uppercase text-muted-foreground block">Flujo de Caja</span>
                                                    <span className={`text-sm font-bold ${hasBalance ? 'text-blue-600' : 'text-red-600'}`}>
                                                        {hasBalance ? 'POSITIVO' : 'DÉFICIT'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="bg-card rounded-xl border border-border sticky top-6 overflow-hidden">
                            {/* Header */}
                            <div className="p-6 border-b border-border bg-muted/30">
                                <h3 className="text-base font-semibold text-foreground flex items-center flex-wrap gap-2">
                                    <Wallet className="w-5 h-5 mr-2 text-primary" />
                                    Desglose Financiero
                                    <div className="ml-auto flex items-center gap-2">
                                        {project.currency === 'USD' && (
                                            <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100 flex items-center" title={`Cotización oficial ${exchangeRate?.source}`}>
                                                <RefreshCw className="w-3 h-3 mr-1" />
                                                {exchangeRate ? `USD/CLP: $${exchangeRate.value.toLocaleString('es-CL', { maximumFractionDigits: 0 })} (${exchangeRate.date ? format(new Date(exchangeRate.date), "dd/MM/yy") : ''})` : 'Cargando tasa...'}
                                            </span>
                                        )}
                                        <span className="text-xs font-mono bg-background px-2 py-1 rounded border border-border text-muted-foreground">
                                            {currency}
                                        </span>
                                    </div>
                                </h3>
                            </div>

                            <div className="p-6 space-y-8">
                                {/* Cost Analysis */}
                                {/* Financial Breakdown Table */}
                                <div className="space-y-4">

                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-2">Estado de Resultados</h4>

                                    <div className="space-y-2 text-sm">
                                        {/* Real P&L */}
                                        <div className="grid grid-cols-2 py-1">
                                            <span className="text-muted-foreground">Venta Neta</span>
                                            <div className="text-right font-mono text-zinc-700 dark:text-zinc-300">
                                                {formatMoney(financials.priceNet)}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 py-1">
                                            <span className="text-muted-foreground">Gastos Ejecutados</span>
                                            <div className={`text-right font-mono font-medium ${financials.totalExecutedCostNet > financials.priceNet ? 'text-red-600 font-bold' : 'text-amber-600 dark:text-amber-500'}`}>
                                                -{formatMoney(financials.totalExecutedCostNet)}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 py-1 border-t border-dashed border-border">
                                            <div className="flex items-center gap-1.5 pt-1">
                                                <span className="text-muted-foreground font-medium text-foreground">Saldo Disponible</span>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right">
                                                            <p className="font-semibold">Venta Total - Gastos</p>
                                                            <p className="text-xs">No es utilidad final hasta cerrar el proyecto.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                            <div className="text-right pt-1">
                                                {(() => {
                                                    const balance = financials.priceNet - financials.totalExecutedCostNet;
                                                    return (
                                                        <span className={`font-mono font-bold block ${balance < 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                                                            {formatMoney(balance)}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Projected Reference */}
                                        {/* Projected Reference (Highlighted) */}
                                        {/* Projected vs Earned Margin */}
                                        <div className={`grid grid-cols-2 py-2 px-3 mt-4 border rounded-lg ${(project.status === 'EN_CURSO' || project.status === 'FINALIZADO')
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/50'
                                            : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50'
                                            }`}>
                                            <div className="flex flex-col justify-center">
                                                <span className={`text-xs font-bold uppercase tracking-tight ${(project.status === 'EN_CURSO' || project.status === 'FINALIZADO')
                                                    ? 'text-blue-800 dark:text-blue-400'
                                                    : 'text-emerald-800 dark:text-emerald-400'
                                                    }`}>
                                                    {(project.status === 'EN_CURSO' || project.status === 'FINALIZADO') ? 'Utilidad Ganada' : 'Utilidad Proyectada'}
                                                </span>
                                                <span className={`text-[10px] font-medium mt-0.5 ${(project.status === 'EN_CURSO' || project.status === 'FINALIZADO')
                                                    ? 'text-blue-600 dark:text-blue-500'
                                                    : 'text-emerald-600 dark:text-emerald-500'
                                                    }`}>
                                                    Margen {(project.status === 'EN_CURSO' || project.status === 'FINALIZADO') ? 'Real' : 'Objetivo'}: {financials.priceNet > 0 ? ((financials.marginAmountNet / financials.priceNet) * 100).toFixed(1) : '0.0'}%
                                                </span>
                                            </div>
                                            <div className="text-right flex items-center justify-end">
                                                <span className={`text-sm font-mono font-bold block ${(project.status === 'EN_CURSO' || project.status === 'FINALIZADO')
                                                    ? 'text-blue-700 dark:text-blue-400'
                                                    : 'text-emerald-700 dark:text-emerald-400'
                                                    }`}>
                                                    {formatMoney(financials.marginAmountNet)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6 border-b border-border pb-2">Resumen Venta</h4>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Neto</span>
                                            <span className="font-mono font-medium">{formatMoney(financials.priceNet)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">IVA ({(settings?.vatRate || 0.19) * 100}%)</span>
                                            <span className="font-mono font-medium text-muted-foreground">+{formatMoney(financials.vatAmount)}</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-border mt-2">
                                            <span className="font-bold text-foreground">Total Bruto</span>
                                            <span className="font-mono font-bold text-lg text-primary">{formatMoney(financials.priceGross)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Collections Status */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cobranza</h4>
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {((financials.totalInvoicedGross / financials.priceGross) * 100).toFixed(0)}% Facturado
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-primary h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                                style={{ width: `${Math.min((financials.totalInvoicedGross / financials.priceGross) * 100, 100)}%` }}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 bg-card border border-border rounded-lg shadow-sm">
                                                <span className="block text-[10px] uppercase text-muted-foreground mb-1 font-semibold">Facturado</span>
                                                <span className="font-mono text-lg font-semibold text-foreground block">
                                                    {formatMoney(financials.totalInvoicedGross)}
                                                </span>
                                            </div>
                                            <div className="p-3 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-lg shadow-sm">
                                                <span className="block text-[10px] uppercase text-orange-600 dark:text-orange-400 mb-1 font-semibold">Por Facturar</span>
                                                <span className="font-mono text-lg font-semibold text-orange-700 dark:text-orange-300 block">
                                                    {formatMoney(financials.pendingToInvoiceGross)}
                                                </span>
                                            </div>
                                        </div>

                                        {financials.receivableGross > 0 && (
                                            <div className="p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg flex justify-between items-center animate-pulse">
                                                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase flex items-center">
                                                    <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                                                    Pendiente de Pago
                                                </span>
                                                <span className="font-mono font-bold text-red-700 dark:text-red-300">
                                                    {formatMoney(financials.receivableGross)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                activeTab === 'logs' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <UnifiedTimeline projectId={project.id} />
                    </div>
                )
            }

            {
                activeTab === 'settings' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <ProjectSettings key={project.clientId ? `${project.clientId}-${project.updatedAt}` : `no-client-${project.updatedAt}`} project={project} clients={clients} />

                        <div>
                            <h3 className="text-lg font-medium text-foreground mb-4">Registro de Actividad</h3>
                            <div className="bg-card rounded-xl border border-border p-6">
                                <AuditLog logs={auditLogs} />
                            </div>
                        </div>
                    </div>
                )
            }
            <ConfirmDialog {...confirmConfig} onCancel={closeConfirm} isLoading={isUpdatingStatus} />
        </div >
    );
}

function MetricCard({ title, value, icon: Icon, trend, trendColor = "text-muted-foreground" }: any) {
    return (
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="w-5 h-5 text-primary" />
                </div>
            </div>
            <div className="mt-4">
                <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                {trend && <p className={`text-xs mt-1 ${trendColor} font-medium`}>{trend}</p>}
            </div>
        </div>
    )
}
