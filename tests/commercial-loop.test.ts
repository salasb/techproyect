import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuoteService } from '@/services/quoteService';
import { InvoiceService } from '@/services/invoiceService';
import prisma from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
    default: {
        quote: {
            findUnique: vi.fn(),
            update: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
        },
        invoice: {
            findFirst: vi.fn(),
            create: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        paymentRecord: {
            create: vi.fn(),
        },
        auditLog: {
            create: vi.fn(),
        },
        project: {
            findUnique: vi.fn(),
        },
        quoteItem: {
            createMany: vi.fn(),
        }
    },
}));

// Mock Audit Service
vi.mock('@/services/auditService', () => ({
    AuditService: {
        logAction: vi.fn().mockResolvedValue({}),
    },
}));

describe('Commercial Loop v1.0 - Sprint 1', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Quote Service', () => {
        it('should transition quote to ACCEPTED status idempotently', async () => {
            const mockQuote = { id: 'q1', status: 'SENT', version: 1, projectId: 'p1' };
            (prisma.quote.findUnique as any).mockResolvedValue(mockQuote);
            (prisma.quote.update as any).mockResolvedValue({ ...mockQuote, status: 'ACCEPTED' });

            const result = await QuoteService.acceptQuote('q1', 'u1', 'o1');
            
            expect(result.status).toBe('ACCEPTED');
            expect(prisma.quote.update).toHaveBeenCalledWith({
                where: { id: 'q1' },
                data: expect.objectContaining({ status: 'ACCEPTED' })
            });
        });

        it('should return already accepted quote without double updating', async () => {
            const mockQuote = { id: 'q1', status: 'ACCEPTED', version: 1, projectId: 'p1' };
            (prisma.quote.findUnique as any).mockResolvedValue(mockQuote);

            const result = await QuoteService.acceptQuote('q1', 'u1', 'o1');
            
            expect(result.status).toBe('ACCEPTED');
            expect(prisma.quote.update).not.toHaveBeenCalled();
        });
    });

    describe('Invoice Service', () => {
        it('should generate invoice from an accepted quote', async () => {
            const mockQuote = { id: 'q1', status: 'ACCEPTED', totalNet: 1000, totalTax: 190, projectId: 'p1' };
            (prisma.quote.findUnique as any).mockResolvedValue(mockQuote);
            (prisma.invoice.findFirst as any).mockResolvedValue(null);
            (prisma.invoice.create as any).mockResolvedValue({ id: 'i1', amountInvoicedGross: 1190 });

            const result = await InvoiceService.generateFromQuote('q1', 'u1', 'o1');
            
            expect(result.amountInvoicedGross).toBe(1190);
            expect(prisma.invoice.create).toHaveBeenCalled();
        });

        it('should register a payment and update status to PAID if total reached', async () => {
            const mockInvoice = { id: 'i1', amountInvoicedGross: 1000, amountPaidGross: 0, status: 'ISSUED', projectId: 'p1', currency: 'CLP' };
            (prisma.invoice.findUnique as any).mockResolvedValue(mockInvoice);
            
            await InvoiceService.registerPayment('i1', 1000, 'STRIPE', 'ref1', 'u1', 'o1');

            expect(prisma.invoice.update).toHaveBeenCalledWith({
                where: { id: 'i1' },
                data: expect.objectContaining({
                    status: 'PAID',
                    amountPaidGross: 1000
                })
            });
        });
    });
});
