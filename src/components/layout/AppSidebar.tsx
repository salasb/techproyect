import Link from "next/link";
import { LayoutDashboard, FolderKanban, Receipt, Settings, Package } from "lucide-react";
import { LogoutButton } from "./LogoutButton";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Proyectos", href: "/projects", icon: FolderKanban },
    { name: "Catálogo", href: "/catalog", icon: Package },
    { name: "Facturación", href: "/invoices", icon: Receipt },
    { name: "Configuración", href: "/settings", icon: Settings },
];

export function AppSidebar() {
    return (
        <aside className="w-64 bg-card border-r border-border flex flex-col h-screen fixed left-0 top-0 text-foreground transition-all duration-300 z-50">
            <div className="p-6">
                <img src="/techwise logo negro.png" alt="TechWise" className="h-10 w-auto object-contain" />
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1">
                {navigation.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className="flex items-center px-4 py-3 text-sm font-medium text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors group"
                    >
                        <item.icon className="w-5 h-5 mr-3 text-muted-foreground group-hover:text-primary transition-colors" />
                        {item.name}
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-border">
                <LogoutButton />
            </div>
        </aside>
    );
}
