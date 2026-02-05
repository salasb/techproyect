'use client'

import { useState } from "react";
import { addLog } from "@/actions/project-logs";
import { useToast } from "@/components/ui/Toast";
import { Send, AlertOctagon, Info, Flag, Pin } from "lucide-react";

interface Props {
    projectId: string;
    logs: any[];
}

export function ProjectLogsManager({ projectId, logs }: Props) {
    const [content, setContent] = useState("");
    const [type, setType] = useState<"INFO" | "BLOCKER" | "MILESTONE">("INFO");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { toast } = useToast();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!content.trim()) return;

        setIsSubmitting(true);
        try {
            const result = await addLog(projectId, content, type);
            if (!result.success) {
                toast({ type: 'error', message: `Error: ${result.error}` });
                return;
            }
            toast({ type: 'success', message: "Nota guardada correctamente" });
            setContent("");
            setType("INFO");
        } catch (error) {
            toast({ type: 'error', message: "Error desconocido al guardar nota" });
        } finally {
            setIsSubmitting(false);
        }
    }

    const typeConfig = {
        INFO: { icon: Info, color: "text-blue-500", bg: "bg-blue-50", label: "Nota" },
        BLOCKER: { icon: AlertOctagon, color: "text-red-500", bg: "bg-red-50", label: "Bloqueo" },
        MILESTONE: { icon: Flag, color: "text-green-500", bg: "bg-green-50", label: "Hito" },
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Section */}
            <div className="lg:col-span-1">
                <div className="bg-card border border-border rounded-xl p-6 sticky top-6 shadow-sm">
                    <h3 className="font-semibold mb-4 flex items-center">
                        <Pin className="w-4 h-4 mr-2 text-primary" />
                        Nueva Entrada
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex gap-2">
                            {(Object.keys(typeConfig) as Array<keyof typeof typeConfig>).map((t) => {
                                const Icon = typeConfig[t].icon;
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setType(t)}
                                        className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${type === t
                                            ? `border-${typeConfig[t].color.split('-')[1]}-500 ${typeConfig[t].bg} ring-2 ring-${typeConfig[t].color.split('-')[1]}-200`
                                            : "border-border hover:bg-muted"
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 mb-1 ${type === t ? typeConfig[t].color : "text-muted-foreground"}`} />
                                        <span className={`text-xs font-medium ${type === t ? "text-foreground" : "text-muted-foreground"}`}>
                                            {typeConfig[t].label}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>

                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={type === 'BLOCKER' ? "¿Qué está impidiendo el avance?" : "Escribe una actualización..."}
                            className="w-full h-32 p-3 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            required
                        />

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {isSubmitting ? "Guardando..." : "Publicar Nota"}
                        </button>
                    </form>
                </div>
            </div>

            {/* Timeline Section */}
            <div className="lg:col-span-2">
                <div className="space-y-6">
                    {logs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
                            No hay registros en la bitácora aún.
                        </div>
                    ) : (
                        logs.map((log) => {
                            const config = typeConfig[log.type as keyof typeof typeConfig] || typeConfig.INFO;
                            const Icon = config.icon;
                            return (
                                <div key={log.id} className="flex gap-4 group">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bg} border border-border shadow-sm shrink-0`}>
                                            <Icon className={`w-5 h-5 ${config.color}`} />
                                        </div>
                                        <div className="w-0.5 grow bg-border my-2 group-last:hidden"></div>
                                    </div>
                                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex-1 mb-2 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${config.bg} ${config.color}`}>
                                                {config.label}
                                            </span>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                                {new Date(log.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-foreground text-sm whitespace-pre-wrap">{log.content}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
