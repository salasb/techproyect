import React from "react";
import { Loader2 } from "lucide-react";

export default function StartLoading() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-slate-100">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <div className="text-center space-y-1">
                    <p className="font-black uppercase text-[10px] tracking-[0.2em] text-slate-400">Onboarding</p>
                    <p className="text-sm font-bold text-slate-600 italic">Preparando tu espacio de trabajo...</p>
                </div>
            </div>
        </div>
    );
}
