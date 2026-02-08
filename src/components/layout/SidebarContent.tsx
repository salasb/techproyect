import Link from "next/link";
import { LayoutDashboard, FolderOpen, FileText, Settings, BarChart, Users } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { APP_VERSION, DEPLOY_DATE } from "@/lib/version";

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Proyectos', href: '/projects', icon: FolderOpen },
    { name: 'Cotizaciones', href: '/quotes', icon: FileText },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Reportes', href: '/reports', icon: BarChart },
    { name: 'Configuración', href: '/settings', icon: Settings },
];

interface SidebarContentProps {
    onLinkClick?: () => void;
    badges?: Record<string, number>;
}

export function SidebarContent({ onLinkClick, badges = {} }: SidebarContentProps) {
    // Map href to badge key for simpler lookup if needed, or just use hardcoded check
    const getBadgeCount = (href: string) => {
        if (href === '/projects') return badges.projects || 0;
        if (href === '/quotes') return badges.quotes || 0;
        return 0;
    };
    return (
        <div className="flex flex-col h-full bg-card text-foreground">
            <div className="p-6">
                <img src="/techwise logo negro.png" alt="TechWise" className="h-10 w-auto object-contain" />
                <div className="mt-2 px-2 inline-flex flex-col items-start">
                    <div className="rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5">
                        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{APP_VERSION}</span>
                    </div>
                    <span className="text-[9px] text-zinc-400 mt-0.5 ml-1">Updated: {DEPLOY_DATE}</span>
                </div>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                    const count = getBadgeCount(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={onLinkClick}
                            className="flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors group"
                        >
                            <div className="flex items-center">
                                <item.icon className="w-5 h-5 mr-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                {item.name}
                            </div>
                            {count > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center shadow-sm animate-in zoom-in">
                                    {count}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border mt-auto">
                <LogoutButton />
            </div>
        </div>
    );
}
