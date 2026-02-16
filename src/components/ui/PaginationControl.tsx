'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlProps {
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export function PaginationControl({
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage
}: PaginationControlProps) {
    const searchParams = useSearchParams();

    function createPageUrl(newPage: number) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        return `?${params.toString()}`;
    }

    return (
        <div className="flex items-center justify-between px-2 py-4 border-t border-border mt-4">
            <div className="text-sm text-muted-foreground">
                Página <span className="font-medium text-foreground">{currentPage}</span> de <span className="font-medium text-foreground">{totalPages}</span>
            </div>
            <div className="flex items-center space-x-2">
                <Link
                    href={createPageUrl(currentPage - 1)}
                    className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 ${!hasPrevPage ? 'pointer-events-none opacity-50' : ''}`}
                    aria-disabled={!hasPrevPage}
                >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Anterior
                </Link>
                <Link
                    href={createPageUrl(currentPage + 1)}
                    className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 ${!hasNextPage ? 'pointer-events-none opacity-50' : ''}`}
                    aria-disabled={!hasNextPage}
                >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-2" />
                </Link>
            </div>
        </div>
    );
}
