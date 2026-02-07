import Link from 'next/link'
import { AlertTriangle, Home } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
            <div className="bg-card p-8 rounded-xl border border-border shadow-lg text-center max-w-md w-full animate-in fade-in zoom-in duration-300">
                <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Página no encontrada</h2>
                <p className="text-muted-foreground mb-6">
                    La ruta que intentas acceder no existe o no tienes permisos para verla.
                </p>
                <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center w-full px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Home className="w-4 h-4 mr-2" />
                    Volver al Inicio
                </Link>
            </div>
        </div>
    )
}
