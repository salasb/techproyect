import { Building2, Clock, Mail } from "lucide-react";
import Link from "next/link";

export default function PendingActivationPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-10 h-10 animate-pulse" />
                </div>

                <h1 className="text-2xl font-bold text-slate-900">Cuenta en Revisión</h1>

                <p className="text-slate-600">
                    Tu organización ha sido registrada exitosamente. Un administrador de <strong>Geocom</strong> está revisando tu solicitud para habilitar el servicio.
                </p>

                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-500 flex gap-3 items-start text-left text-pretty">
                    <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
                    <span>Una vez confirmada la suscripción, recibirás un correo de notificación y podrás acceder a todas las funciones.</span>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <a
                        href="mailto:soporte@geocom.cl"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                        <Mail className="w-4 h-4" />
                        Contactar Soporte
                    </a>
                    <Link
                        href="/login"
                        className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        Cerrar Sesión
                    </Link>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-center gap-4 grayscale opacity-50">
                    <img src="/logo-geocom.png" alt="Geocom" className="h-6 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
            </div>
        </div>
    );
}
