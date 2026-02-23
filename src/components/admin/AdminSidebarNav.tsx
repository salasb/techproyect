'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    LayoutDashboard, 
    Building2, 
    Users, 
    Settings, 
    CreditCard, 
    TrendingUp 
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    { 
        group: "Principal",
        items: [
            { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
            { href: "/admin/orgs", icon: Building2, label: "Organizaciones" },
            { href: "/admin/plans", icon: CreditCard, label: "Planes y Precios" },
            { href: "/admin/subscriptions", icon: TrendingUp, label: "Métricas" },
            { href: "/admin/users", icon: Users, label: "Usuarios Globales" },
        ]
    },
    {
        group: "Configuración",
        items: [
            { href: "/admin/settings", icon: Settings, label: "Ajustes Sistema" },
        ]
    }
];

export function AdminSidebarNav() {
    const pathname = usePathname();

    return (
        <nav className="flex-1 p-4 space-y-8">
            {NAV_ITEMS.map((group) => (
                <div key={group.group} className="space-y-2">
                    <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                        {group.group}
                    </h3>
                    <div className="space-y-1">
                        {group.items.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 group",
                                        isActive 
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "w-4 h-4 transition-colors",
                                        isActive ? "text-white" : "text-slate-500 group-hover:text-blue-400"
                                    )} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );
}
