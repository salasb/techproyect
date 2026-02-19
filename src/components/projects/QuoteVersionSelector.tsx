'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface QuoteVersion {
    id: string
    version: number
    status: string
    createdAt: string
    totalNet: number
}

interface Props {
    quotes: QuoteVersion[]
    currentQuoteId: string
}

export function QuoteVersionSelector({ quotes, currentQuoteId }: Props) {
    const router = useRouter()

    // Sort by version desc
    const sortedQuotes = [...quotes].sort((a, b) => b.version - a.version)

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value
        const params = new URLSearchParams(window.location.search)
        params.set('v', id)
        router.push(`?${params.toString()}`)
    }

    if (quotes.length === 0) return null

    return (
        <div className="flex items-center gap-2 mb-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm w-fit">
            <span className="text-sm font-medium text-gray-500">Versión:</span>
            <select
                value={currentQuoteId}
                onChange={handleChange}
                className="text-sm font-medium text-gray-900 border-none focus:ring-0 bg-transparent cursor-pointer outline-none"
            >
                {sortedQuotes.map((q) => (
                    <option key={q.id} value={q.id}>
                        v{q.version} - {q.status} ({format(new Date(q.createdAt), 'dd MMM', { locale: es })}) - ${q.totalNet.toLocaleString('es-CL')}
                    </option>
                ))}
            </select>
            {sortedQuotes[0].id === currentQuoteId && (
                <span className="ml-2 px-2 py-0.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-full">
                    Actual
                </span>
            )}
        </div>
    )
}
