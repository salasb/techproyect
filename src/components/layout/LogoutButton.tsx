'use client'

import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function LogoutButton() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleLogout = async () => {
        try {
            setLoading(true)
            const supabase = createClient()
            await supabase.auth.signOut()
            router.push('/login')
            router.refresh()
        } catch (error) {
            console.error('Error logging out:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleLogout}
            disabled={loading}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
        >
            <LogOut className="w-5 h-5 mr-3" />
            {loading ? 'Cerrando...' : 'Cerrar Sesión'}
        </button>
    )
}
