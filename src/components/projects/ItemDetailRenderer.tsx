import { useState } from "react";
import { Copy, ChevronDown, ChevronUp } from "lucide-react";

export function ItemDetailRenderer({ text, unit }: { text: string, unit: string }) {
    const [expanded, setExpanded] = useState(false);

    // 1. Check for explicit newlines (User entered list)
    const hasNewlines = text.includes('\n');

    // 2. Check for "Comma List" (Legacy long text with commas)
    // Only trigger if text is relatively long (>60 chars) and has multiple commas
    const isCommaList = !hasNewlines && text.length > 60 && (text.match(/,/g) || []).length >= 2;

    const shouldFormatAsList = hasNewlines || isCommaList;
    const items = hasNewlines
        ? text.split('\n').filter(line => line.trim().length > 0)
        : text.split(',').map(s => s.trim()).filter(s => s.length > 0);

    // Simple display for short/normal text
    if (!shouldFormatAsList) {
        return (
            <div className="relative">
                <span className="text-foreground font-medium">{text}</span>
                <span className="text-xs text-muted-foreground ml-2">({unit})</span>
            </div>
        );
    }

    // List Display
    const displayedItems = expanded ? items : items.slice(0, 2);
    const remainingCount = items.length - 2;

    return (
        <div className="relative">
            {/* Header / First Item acts as title if it's the only one showing, usually not the case with slice(0,2) */}
            <ul className="space-y-1 mt-1">
                {displayedItems.map((line, i) => (
                    <li key={i} className="text-xs text-zinc-600 dark:text-zinc-300 flex items-start">
                        <span className="mr-1.5 mt-1 block w-1 h-1 rounded-full bg-blue-400 shrink-0"></span>
                        <span className="leading-snug">{line}</span>
                    </li>
                ))}
            </ul>

            {/* Expand Toggle */}
            {items.length > 2 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="w-3 h-3 mr-1" /> Ver menos
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3 h-3 mr-1" /> Ver {remainingCount} más...
                        </>
                    )}
                </button>
            )}

            {/* Unit Badge (Always visible but unobtrusive) */}
            <div className="absolute top-0 right-0 -mt-2 -mr-2">
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                    {unit}
                </span>
            </div>
        </div>
    )
}
