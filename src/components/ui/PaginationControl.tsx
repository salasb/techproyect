import { useRouter, useSearchParams } from 'next/navigation';
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
    const router = useRouter();
    const searchParams = useSearchParams();

    function onPageChange(newPage: number) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`?${params.toString()}`);
    }

    return (
        <div className="flex items-center justify-between px-2 py-4 border-t border-border mt-4">
            <div className="text-sm text-muted-foreground">
                Página <span className="font-medium text-foreground">{currentPage}</span> de <span className="font-medium text-foreground">{totalPages}</span>
            </div>
            <div className="flex items-center space-x-2">
                <button
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!hasPrevPage}
                >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Anterior
                </button>
                <button
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!hasNextPage}
                >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-2" />
                </button>
            </div>
        </div>
    );
}
