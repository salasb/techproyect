'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const routeLabels: Record<string, string> = {
    'dashboard': 'Dashboard',
    'projects': 'Proyectos',
    'clients': 'Clientes',
    'settings': 'Configuración',
    'users': 'Usuarios',
    'new': 'Nuevo',
    'edit': 'Editar',
    'invoices': 'Facturas',
    'quotes': 'Presupuestos'
};

export function Breadcrumbs() {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
        return null; // Don't show on Dashboard home
    }

    return (
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm text-muted-foreground mb-4 md:mb-0 md:mr-4">
            <Link
                href="/dashboard"
                className="flex items-center hover:text-foreground transition-colors"
                title="Ir al inicio"
            >
                <Home className="w-4 h-4" />
            </Link>

            {segments.map((segment, index) => {
                const isLast = index === segments.length - 1;
                const href = `/${segments.slice(0, index + 1).join('/')}`;

                // Format label
                let label = routeLabels[segment] || segment;

                // Handle IDs (simple heuristic: if it contains numbers and is long, it's likely an ID)
                if (segment.length > 20 || (/\d/.test(segment) && segment.length > 8)) {
                    label = 'Detalle';
                }

                // If previous was 'projects' and this is 'Detalle', maybe we can do better? 
                // For now keep it simple.

                return (
                    <div key={href} className="flex items-center">
                        <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/50" />
                        {isLast ? (
                            <span className={cn("font-medium text-foreground", isLast && "pointer-events-none")}>
                                {label}
                            </span>
                        ) : (
                            <Link
                                href={href}
                                className="hover:text-foreground transition-colors"
                            >
                                {label}
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
