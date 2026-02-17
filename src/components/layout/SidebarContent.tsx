import Link from "next/link";
import { LayoutDashboard, FolderOpen, FileText, Settings, BarChart, Users, Package, Receipt, MapPin, CreditCard, TrendingUp, Calendar, UserPlus, QrCode } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { APP_VERSION, DEPLOY_DATE } from "@/lib/version";
import { isAdmin } from "@/lib/permissions";

interface NavItem {
    name: string;
    href: string;
    icon: any;
    restrictedToPlans?: string[];
    adminOnly?: boolean;
    hideInSoloMode?: boolean;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

interface SidebarContentProps {
    onLinkClick?: () => void;
    badges?: Record<string, number>;
    profile?: any;
    settings?: any;
}

export function SidebarContent({ onLinkClick, badges = {}, profile, settings }: SidebarContentProps) {
    const isSoloMode = settings?.isSoloMode || false;

    const navGroups: NavGroup[] = [
        {
            label: 'Command Center',
            items: [
                { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            ]
        },
        {
            label: 'Vender',
            items: [
                { name: 'Oportunidades', href: '/crm/pipeline', icon: TrendingUp },
                { name: 'Cotizaciones', href: '/quotes', icon: FileText },
                { name: 'Clientes', href: '/clients', icon: Users },
            ]
        },
        {
            label: 'Ejecutar',
            items: [
                { name: 'Proyectos', href: '/projects', icon: FolderOpen },
                { name: 'Calendario', href: '/calendar', icon: Calendar },
            ]
        },
        {
            label: 'Cobrar',
            items: [
                { name: 'Facturación', href: '/invoices', icon: Receipt },
                { name: 'Pagos', href: '/payments', icon: CreditCard, hideInSoloMode: true },
            ]
        },
        {
            label: 'Inventario',
            items: [
                { name: 'Catálogo', href: '/catalog', icon: Package },
                { name: 'Ubicaciones', href: '/inventory/locations', icon: MapPin, hideInSoloMode: true },
                { name: 'Escáner QR', href: '/inventory/scan', icon: QrCode },
            ]
        },
        {
            label: 'Reportes',
            items: [
                { name: 'Análisis', href: '/reports', icon: BarChart },
            ]
        },
        {
            label: 'Configuración',
            items: [
                { name: 'Ajustes', href: '/settings', icon: Settings, adminOnly: true },
                { name: 'Usuarios', href: '/settings/users', icon: UserPlus, adminOnly: true, hideInSoloMode: true },
            ]
        }
    ];
    // Map href to badge key for simpler lookup if needed, or just use hardcoded check
    const getBadgeCount = (href: string) => {
        if (href === '/projects') return badges.projects || 0;
        if (href === '/quotes') return badges.quotes || 0;
        return 0;
    };

    const userRole = profile?.role;
    const orgPlan = profile?.organization?.plan || 'FREE'; // Default to FREE if undefined

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

            <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
                {navGroups.map((group) => {
                    const filteredItems = group.items.filter(item => {
                        if (item.adminOnly && !isAdmin(userRole)) return false;
                        if (item.restrictedToPlans && !item.restrictedToPlans.includes(orgPlan)) return false;
                        if (item.hideInSoloMode && isSoloMode) return false;
                        return true;
                    });

                    if (filteredItems.length === 0) return null;

                    return (
                        <div key={group.label} className="space-y-1">
                            <h3 className="px-4 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-2">
                                {group.label}
                            </h3>
                            {filteredItems.map((item) => {
                                const count = getBadgeCount(item.href);
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={onLinkClick}
                                        aria-label={`Ir a ${item.name}`}
                                        className="flex items-center justify-between px-4 py-2.5 text-sm font-medium text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors group"
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
                        </div>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border mt-auto">
                <UserMenu profile={profile} />
            </div>
        </div>
    );
}
