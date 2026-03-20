import Link from "next/link";
import { LayoutDashboard, FolderOpen, FileText, Settings, BarChart, Users, Package, Receipt, MapPin, CreditCard, TrendingUp, Calendar, UserPlus, QrCode, MessageSquare, Zap, Shield } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { APP_VERSION, DEPLOY_DATE } from "@/lib/version";
import { isAdmin } from "@/lib/permissions";
import { Permission } from "@/lib/auth/rbac";
import { resolveEntitlements } from "@/lib/billing/entitlements";
import { useShellCommercialDisplay } from "./ShellCommercialDisplay";

interface NavItem {
    id?: string;
    name: string;
    href: string;
    icon: any;
    restrictedToPlans?: string[];
    permission?: Permission;
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
    workspace?: any;
}

export function SidebarContent({ onLinkClick, badges = {}, profile, settings }: SidebarContentProps) {
    const isSoloMode = settings?.isSoloMode || false;

    // CENTRALIZED DISPLAY RULES (Source of Truth for Shell)
    const display = useShellCommercialDisplay();

    const navGroups: NavGroup[] = [
        {
            label: 'Command Center',
            items: [
                { id: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            ]
        },
        {
            label: 'Vender',
            items: [
                { id: 'opportunities', name: 'Oportunidades', href: '/crm/pipeline', icon: TrendingUp, permission: 'CRM_MANAGE' },
                { id: 'quotes', name: 'Cotizaciones', href: '/quotes', icon: FileText, permission: 'QUOTES_MANAGE' },
                { id: 'clients', name: 'Clientes', href: '/clients', icon: Users, permission: 'CRM_MANAGE' },
            ]
        },
        {
            label: 'Ejecutar',
            items: [
                { id: 'projects', name: 'Proyectos', href: '/projects', icon: FolderOpen, permission: 'PROJECTS_MANAGE' },
                { id: 'calendar', name: 'Calendario', href: '/crm/calendar', icon: Calendar, permission: 'CRM_MANAGE' },
            ]
        },
        {
            label: 'Cobrar',
            items: [
                { id: 'invoices', name: 'Facturación', href: '/invoices', icon: Receipt, permission: 'FINANCE_VIEW' },
            ]
        },
        {
            label: 'Inventario',
            items: [
                { id: 'catalog', name: 'Catálogo', href: '/catalog', icon: Package, permission: 'INVENTORY_MANAGE' },
                { id: 'locations', name: 'Ubicaciones', href: '/inventory/locations', icon: MapPin, hideInSoloMode: true, permission: 'INVENTORY_MANAGE' },
                { id: 'qr', name: 'Escáner QR', href: '/inventory/scan', icon: QrCode, permission: 'INVENTORY_MANAGE' },
            ]
        },
        {
            label: 'Reportes',
            items: [
                { id: 'reports', name: 'Análisis', href: '/reports', icon: BarChart, permission: 'FINANCE_VIEW' },
            ]
        },
        {
            label: 'Configuración',
            items: [
                { id: 'settings', name: 'Ajustes', href: '/settings', icon: Settings, permission: 'ORG_MANAGE' },
                { id: 'support', name: 'Soporte', href: '/settings/support', icon: MessageSquare, permission: 'SUPPORT_MANAGE' },
                { id: 'integrations', name: 'Integraciones', href: '/settings/integrations', icon: Zap, permission: 'INTEGRATIONS_MANAGE' },
                { id: 'roles', name: 'Roles y Permisos', href: '/settings/organization/roles', icon: Shield, permission: 'ORG_MANAGE' },
                { id: 'team', name: 'Equipo', href: '/settings/team', icon: Users, permission: 'TEAM_MANAGE', hideInSoloMode: true },
            ]
        }
    ];

    const getBadgeCount = (href: string) => {
        if (href === '/projects') return badges.projects || 0;
        if (href === '/quotes') return badges.quotes || 0;
        return 0;
    };

    const userRole = profile?.role;
    const userPermissions = profile?.permissions || [];

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
                        // 0. Entitlements Based Access Control (EBAC)
                        // Use the centralized 'visibleModules' from commercial display context
                        if (item.id && !display.visibleModules.includes(item.id)) {
                            return false;
                        }

                        // 1. Superadmin bypass for permissions
                        if (userRole === 'SUPERADMIN') return true;

                        // 2. Permission check
                        if (item.permission && !userPermissions.includes(item.permission)) return false;

                        // 3. Legacy Role check
                        if (item.adminOnly && !isAdmin(userRole)) return false;

                        // 4. Other checks
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
                                                {count > 99 ? '99+' : count}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border bg-card/50">
                <UserMenu profile={profile} />
            </div>
        </div>
    );
}