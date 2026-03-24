'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, ExternalLink } from 'lucide-react'

export function DeploymentWarningBanner() {
    const [isVisible, setIsVisible] = useState(false)
    const [canonicalUrl, setCanonicalUrl] = useState('')

    useEffect(() => {
        // Only run on client
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname
            // Check if we're on a Vercel deployment URL (usually ends with .vercel.app)
            // But skip if it's the known production domain if it also used .vercel.app
            // In typical setups, production is a custom domain. For this code we assume
            // anything containing '-git-' or ending in '.vercel.app' that isn't the prod domain
            // is a preview.

            const isVercelPreview = hostname.endsWith('.vercel.app') && !hostname.includes('techproyect.vercel.app'); 

            if (isVercelPreview) {
                // Use robust canonical from utils
                import('@/lib/auth/utils').then(({ getURL }) => {
                    setCanonicalUrl(getURL('/'));
                    setIsVisible(true);
                });
            }
        }
    }, [])

    if (!isVisible) return null

    return (
        <div className="bg-amber-500 text-white px-4 py-2 sm:px-6 lg:px-8 text-sm flex items-center justify-between sticky top-0 z-50 shadow-md">
            <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>
                    <strong className="font-bold">Aviso de Dominio:</strong> Estás en una URL de despliegue. Tus cookies de organización pueden no existir aquí.
                </span>
            </div>
            <a
                href={canonicalUrl}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors whitespace-nowrap font-medium"
            >
                Ir al sitio principal
                <ExternalLink className="w-3.5 h-3.5" />
            </a>
        </div>
    )
}
