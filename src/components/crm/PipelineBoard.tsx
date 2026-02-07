'use client'

import { Database } from "@/types/supabase";
import { updateProjectStage } from "@/actions/crm";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MoreHorizontal, Calendar, DollarSign, User } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

type Project = Database['public']['Tables']['Project']['Row'] & {
    client?: { name: string } | null;
};
type ProjectStage = Database['public']['Enums']['ProjectStage'];

const STAGES: ProjectStage[] = [
    "LEVANTAMIENTO",
    "DISENO",
    "DESARROLLO",
    "QA",
    "IMPLEMENTACION",
    "SOPORTE"
];

const STAGE_LABELS: Record<ProjectStage, string> = {
    "LEVANTAMIENTO": "Levantamiento",
    "DISENO": "Diseño",
    "DESARROLLO": "Desarrollo",
    "QA": "QA / Testing",
    "IMPLEMENTACION": "Implementación",
    "SOPORTE": "Soporte"
};

const STAGE_COLORS: Record<ProjectStage, string> = {
    "LEVANTAMIENTO": "border-t-4 border-t-purple-500",
    "DISENO": "border-t-4 border-t-blue-500",
    "DESARROLLO": "border-t-4 border-t-indigo-500",
    "QA": "border-t-4 border-t-orange-500",
    "IMPLEMENTACION": "border-t-4 border-t-green-500",
    "SOPORTE": "border-t-4 border-t-teal-500"
};

export function PipelineBoard({ initialProjects }: { initialProjects: Project[] }) {
    // Group projects by stage
    const projectsByStage = STAGES.reduce((acc, stage) => {
        acc[stage] = initialProjects.filter(p => p.stage === stage);
        return acc;
    }, {} as Record<ProjectStage, Project[]>);

    return (
        <div className="flex h-full overflow-x-auto gap-4 py-4 min-h-[calc(100vh-200px)]">
            {STAGES.map(stage => (
                <PipelineColumn
                    key={stage}
                    stage={stage}
                    projects={projectsByStage[stage]}
                />
            ))}
        </div>
    );
}

function PipelineColumn({ stage, projects }: { stage: ProjectStage, projects: Project[] }) {
    return (
        <div className="flex-shrink-0 w-80 flex flex-col bg-zinc-50 dark:bg-zinc-900/50 rounded-xl rounded-t-lg border border-zinc-200 dark:border-zinc-800 h-full max-h-full">
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-inherit rounded-t-lg z-10">
                <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-200">
                    {STAGE_LABELS[stage]}
                </h3>
                <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs px-2 py-0.5 rounded-full font-medium">
                    {projects.length}
                </span>
            </div>
            <div className="p-2 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {projects.map(project => (
                    <PipelineCard key={project.id} project={project} />
                ))}
            </div>
        </div>
    );
}

function PipelineCard({ project }: { project: Project }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleStageChange = async (newStage: ProjectStage) => {
        setIsLoading(true);
        try {
            await updateProjectStage(project.id, newStage);
            toast({ type: 'success', message: 'Etapa actualizada' });
            // Optimistic update handled by simple refresh or state if we wanted deeper complexity
            router.refresh();
        } catch (error) {
            toast({ type: 'error', message: 'Error al cambiar etapa' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`bg-white dark:bg-zinc-900 p-3 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-all ${STAGE_COLORS[project.stage]} ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-start mb-2">
                <Link href={`/projects/${project.id}`} className="font-medium text-sm text-zinc-900 dark:text-zinc-100 hover:text-blue-600 line-clamp-2 leading-tight">
                    {project.name}
                </Link>
                <div className="group relative">
                    <button className="text-zinc-400 hover:text-zinc-600 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {/* Simple Dropdown for Stage Change */}
                    <div className="absolute right-0 top-6 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl rounded-lg p-1 z-50 hidden group-hover:block">
                        <p className="text-[10px] text-zinc-400 px-2 py-1 uppercase font-bold">Mover a:</p>
                        {STAGES.filter(s => s !== project.stage).map(s => (
                            <button
                                key={s}
                                onClick={() => handleStageChange(s)}
                                className="w-full text-left px-2 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300"
                            >
                                {STAGE_LABELS[s]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {project.client && (
                <div className="flex items-center text-xs text-zinc-500 mb-2">
                    <User className="w-3 h-3 mr-1" />
                    <span className="truncate">{project.client.name}</span>
                </div>
            )}

            <div className="flex items-center justify-between mt-3 text-xs text-zinc-500 border-t border-zinc-50 dark:border-zinc-800 pt-2">
                <div className="flex items-center" title="Presupuesto">
                    <DollarSign className="w-3 h-3 mr-0.5 text-green-600" />
                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: project.currency || 'CLP', maximumFractionDigits: 0 }).format(project.budgetNet)}
                </div>
                <div className="flex items-center" title="Fecha fin planificada">
                    <Calendar className="w-3 h-3 mr-0.5" />
                    {format(new Date(project.plannedEndDate), 'd MMM', { locale: es })}
                </div>
            </div>
        </div>
    );
}
