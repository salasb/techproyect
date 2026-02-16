'use client';

import { Scanner } from '@yudiel/react-qr-scanner';
import { X, Camera, Zap } from "lucide-react";
import { useState } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onScan: (value: string) => void;
    title?: string;
}

export function CameraScanner({ isOpen, onClose, onScan, title = "Escanear Código" }: Props) {
    const [torch, setTorch] = useState(false);

    if (!isOpen) return null;

    const handleScan = (result: any) => {
        if (result && result[0]) {
            onScan(result[0].rawValue);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-white/10 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col relative aspect-[3/4]">

                {/* Header */}
                <div className="p-4 flex justify-between items-center bg-zinc-900/50">
                    <div className="flex items-center gap-2 text-white">
                        <Camera className="w-5 h-5 text-blue-400" />
                        <span className="font-bold text-sm tracking-tight">{title}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-zinc-400 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Viewfinder Area */}
                <div className="relative flex-1 bg-black overflow-hidden group">
                    <Scanner
                        onScan={handleScan}
                        constraints={{
                            facingMode: 'environment'
                        }}
                        allowMultiple={false}
                        components={{
                            torch: false, // We'll manage it if needed, or use default
                        }}
                    />

                    {/* Viewfinder UI Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-64 h-64 border-2 border-blue-500 rounded-2xl relative shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                            {/* Corner Accents */}
                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-xl shadow-lg"></div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-xl shadow-lg"></div>
                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-xl shadow-lg"></div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-xl shadow-lg"></div>

                            {/* Scanning Line Animation */}
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,1)] animate-scan"></div>
                        </div>
                    </div>

                    <div className="absolute bottom-6 left-0 right-0 text-center px-4">
                        <p className="text-white/60 text-xs font-medium tracking-wide uppercase">Apunta a un código QR o de barras</p>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-6 bg-zinc-900/80 flex justify-center items-center gap-6">
                    {/* Placeholder for future camera toggle or torch */}
                    <div className="text-[10px] text-zinc-500 font-mono">POWERED BY SCANNER PRO</div>
                </div>
            </div>

            <style jsx>{`
                @keyframes scan {
                    0% { top: 0; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan {
                    position: absolute;
                    animation: scan 2s linear infinite;
                }
            `}</style>
        </div>
    );
}
