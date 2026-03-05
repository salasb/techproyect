'use client'

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, ShieldAlert, Loader2, Search, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PurgeUsersTool() {
    const [pattern, setPattern] = useState('superadmin-*@test.com');
    const [limit, setLimit] = useState(20);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [confirm, setConfirm] = useState(false);

    const handleAction = async (dryRun: boolean) => {
        if (!dryRun && !confirm) {
            setConfirm(true);
            return;
        }

        setLoading(true);
        setResults(null);
        try {
            const res = await fetch('/api/admin/auth/purge-test-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pattern, dryRun, limit })
            });
            const data = await res.json();
            setResults(data);
            setConfirm(false);
        } catch (err) {
            console.error("Purge error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <Card className="rounded-[2.5rem] border-slate-100 shadow-xl overflow-hidden">
                <CardHeader className="p-10 pb-6 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-rose-100 rounded-2xl text-rose-600">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Limpieza de Identidades Test</CardTitle>
                            <CardDescription className="text-sm font-medium italic">Herramienta de purga profunda para usuarios de prueba y bots.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Patrón de Correo (Wildcard)</label>
                            <Input 
                                value={pattern} 
                                onChange={(e) => setPattern(e.target.value)}
                                className="h-12 rounded-xl border-slate-200 bg-slate-50 font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Límite por Lote</label>
                            <Input 
                                type="number"
                                value={limit} 
                                onChange={(e) => setLimit(parseInt(e.target.value))}
                                className="h-12 rounded-xl border-slate-200 bg-slate-50 font-bold"
                            />
                        </div>
                        <div className="flex items-end gap-3">
                            <Button 
                                onClick={() => handleAction(true)} 
                                disabled={loading}
                                variant="outline"
                                className="flex-1 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest border-slate-200"
                            >
                                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Search className="w-4 h-4 mr-2" />}
                                Previsualizar
                            </Button>
                            <Button 
                                onClick={() => handleAction(false)} 
                                disabled={loading}
                                className={cn(
                                    "flex-1 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all",
                                    confirm ? "bg-rose-600 hover:bg-rose-700 animate-pulse" : "bg-slate-900 hover:bg-rose-600"
                                )}
                            >
                                {confirm ? "Confirmar Purga" : "Ejecutar Purga"}
                            </Button>
                        </div>
                    </div>

                    {confirm && (
                        <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl flex items-start gap-4 animate-in slide-in-from-top-2">
                            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-1" />
                            <div className="space-y-1">
                                <p className="text-rose-900 font-black uppercase text-[10px] tracking-widest">Advertencia Crítica</p>
                                <p className="text-rose-700 text-xs font-medium leading-relaxed italic">
                                    Esta acción es **irreversible**. Se eliminarán perfiles, membresías y la cuenta de Supabase Auth para todos los usuarios que coincidan con el patrón.
                                </p>
                                <button onClick={() => setConfirm(false)} className="text-[9px] font-black uppercase text-rose-400 hover:underline">Cancelar Operación</button>
                            </div>
                        </div>
                    )}

                    {results && (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                            <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Detectados</p>
                                    <p className="text-3xl font-black italic">{results.summary.total}</p>
                                </div>
                                <div className="h-10 w-px bg-slate-200" />
                                <div className="text-center text-emerald-600">
                                    <p className="text-[10px] font-black uppercase opacity-60 mb-1">Éxito</p>
                                    <p className="text-3xl font-black italic">{results.summary.success}</p>
                                </div>
                                <div className="h-10 w-px bg-slate-200" />
                                <div className="text-center text-rose-600">
                                    <p className="text-[10px] font-black uppercase opacity-60 mb-1">Fallidos</p>
                                    <p className="text-3xl font-black italic">{results.summary.failed}</p>
                                </div>
                                <div className="ml-auto">
                                    <Badge variant="outline" className="rounded-lg uppercase text-[10px] font-black tracking-widest bg-white">
                                        {results.dryRun ? "Modo Simulación" : "Modo Real"}
                                    </Badge>
                                </div>
                            </div>

                            <div className="border border-slate-100 rounded-3xl overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Identidad</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Estado / Pasos</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Referencia</th>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.results.map((r: any) => (
                                            <TableRow key={r.userId} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="px-6 py-4 font-bold text-sm">{r.email}</TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                        {r.steps.map((s: string, idx: number) => (
                                                            <Badge key={idx} variant="secondary" className="text-[8px] font-medium bg-slate-100 text-slate-500 border-none px-1.5 py-0">
                                                                {s}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                    {r.error && <p className="text-[10px] text-rose-500 font-bold italic">{r.error}</p>}
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-right">
                                                    <code className="text-[9px] font-mono text-slate-400 uppercase">{r.traceId}</code>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
