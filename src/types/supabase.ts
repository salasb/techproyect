export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            AuditLog: {
                Row: {
                    id: string
                    projectId: string
                    action: string
                    details: string | null
                    userName: string | null
                    createdAt: string
                }
                Insert: {
                    id?: string
                    projectId: string
                    action: string
                    details?: string | null
                    userName?: string | null
                    createdAt?: string
                }
                Update: {
                    id?: string
                    projectId?: string
                    action?: string
                    details?: string | null
                    userName?: string | null
                    createdAt?: string
                }
            }
            Company: {
                Row: {
                    id: string
                    name: string
                    taxId: string | null
                    address: string | null
                    phone: string | null
                    email: string | null
                    contactName: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    taxId?: string | null
                    address?: string | null
                    phone?: string | null
                    email?: string | null
                    contactName?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    taxId?: string | null
                    address?: string | null
                    phone?: string | null
                    email?: string | null
                    contactName?: string | null
                }
                Relationships: []
            }
            Project: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    status: "EN_ESPERA" | "EN_CURSO" | "BLOQUEADO" | "CERRADO" | "CANCELADO"
                    stage: "LEVANTAMIENTO" | "COTIZACION" | "NEGOCIACION" | "DESARROLLO" | "QA" | "ENTREGA" | "SOPORTE"
                    priority: "BAJA" | "MEDIA" | "ALTA" | "CRITICA"
                    startDate: string
                    plannedEndDate: string | null
                    realEndDate: string | null
                    budgetNet: number
                    marginPct: number
                    progress: number
                    responsible: string
                    companyId: string
                    blockingReason: string | null
                    nextAction: string | null
                    nextActionDate: string | null
                    currency: string
                    scopeDetails: string | null
                    createdAt: string
                    updatedAt: string
                }
                Insert: {
                    id: string
                    name: string
                    description?: string | null
                    status?: "EN_ESPERA" | "EN_CURSO" | "BLOQUEADO" | "CERRADO" | "CANCELADO"
                    stage?: "LEVANTAMIENTO" | "COTIZACION" | "NEGOCIACION" | "DESARROLLO" | "QA" | "ENTREGA" | "SOPORTE"
                    priority?: "BAJA" | "MEDIA" | "ALTA" | "CRITICA"
                    startDate: string
                    plannedEndDate?: string | null
                    realEndDate?: string | null
                    budgetNet?: number
                    marginPct?: number
                    progress?: number
                    responsible: string
                    companyId: string
                    blockingReason?: string | null
                    nextAction?: string | null
                    nextActionDate?: string | null
                    currency?: string
                    scopeDetails?: string | null
                    createdAt?: string
                    updatedAt?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    status?: "EN_ESPERA" | "EN_CURSO" | "BLOQUEADO" | "CERRADO" | "CANCELADO"
                    stage?: "LEVANTAMIENTO" | "COTIZACION" | "NEGOCIACION" | "DESARROLLO" | "QA" | "ENTREGA" | "SOPORTE"
                    priority?: "BAJA" | "MEDIA" | "ALTA" | "CRITICA"
                    startDate?: string
                    plannedEndDate?: string | null
                    realEndDate?: string | null
                    budgetNet?: number
                    marginPct?: number
                    progress?: number
                    responsible?: string
                    companyId?: string
                    blockingReason?: string | null
                    nextAction?: string | null
                    nextActionDate?: string | null
                    currency?: string
                    scopeDetails?: string | null
                    createdAt?: string
                    updatedAt?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "Project_companyId_fkey"
                        columns: ["companyId"]
                        referencedRelation: "Company"
                        referencedColumns: ["id"]
                    }
                ]
            }
            CostEntry: {
                Row: {
                    id: string
                    projectId: string
                    date: string
                    category: "SERVICIOS" | "HARDWARE" | "SOFTWARE" | "LOGISTICA" | "OTROS"
                    description: string
                    amountNet: number
                }
                Insert: {
                    id?: string
                    projectId: string
                    date: string
                    category: "SERVICIOS" | "HARDWARE" | "SOFTWARE" | "LOGISTICA" | "OTROS"
                    description: string
                    amountNet: number
                }
                Update: {
                    id?: string
                    projectId?: string
                    date?: string
                    category?: "SERVICIOS" | "HARDWARE" | "SOFTWARE" | "LOGISTICA" | "OTROS"
                    description?: string
                    amountNet?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "CostEntry_projectId_fkey"
                        columns: ["projectId"]
                        referencedRelation: "Project"
                        referencedColumns: ["id"]
                    }
                ]
            }
            Invoice: {
                Row: {
                    id: string
                    projectId: string
                    sent: boolean
                    sentDate: string | null
                    paymentTermsDays: number | null
                    dueDate: string | null
                    amountInvoicedGross: number
                    amountPaidGross: number
                    updatedAt: string
                }
                Insert: {
                    id?: string
                    projectId: string
                    sent?: boolean
                    sentDate?: string | null
                    paymentTermsDays?: number | null
                    dueDate?: string | null
                    amountInvoicedGross?: number
                    amountPaidGross?: number
                    updatedAt?: string
                }
                Update: {
                    id?: string
                    projectId?: string
                    sent?: boolean
                    sentDate?: string | null
                    paymentTermsDays?: number | null
                    dueDate?: string | null
                    amountInvoicedGross?: number
                    amountPaidGross?: number
                    updatedAt?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "Invoice_projectId_fkey"
                        columns: ["projectId"]
                        referencedRelation: "Project"
                        referencedColumns: ["id"]
                    }
                ]
            }
            Settings: {
                Row: {
                    id: number
                    currency: string
                    vatRate: number
                    defaultPaymentTermsDays: number
                    yellowThresholdDays: number
                }
                Insert: {
                    id?: number
                    currency?: string
                    vatRate?: number
                    defaultPaymentTermsDays?: number
                    yellowThresholdDays?: number
                }
                Update: {
                    id?: number
                    currency?: string
                    vatRate?: number
                    defaultPaymentTermsDays?: number
                    yellowThresholdDays?: number
                }
                Relationships: []
            }
            Product: {
                Row: {
                    id: string
                    sku: string
                    name: string
                    description: string | null
                    unit: string
                    priceNet: number
                    costNet: number
                    createdAt: string
                    updatedAt: string
                }
                Insert: {
                    id?: string
                    sku: string
                    name: string
                    description?: string | null
                    unit?: string
                    priceNet?: number
                    costNet?: number
                    createdAt?: string
                    updatedAt?: string
                }
                Update: {
                    id?: string
                    sku?: string
                    name?: string
                    description?: string | null
                    unit?: string
                    priceNet?: number
                    costNet?: number
                    createdAt?: string
                    updatedAt?: string
                }
                Relationships: []
            }
            ProjectLog: {
                Row: {
                    id: string
                    projectId: string
                    content: string
                    type: string
                    createdAt: string
                }
                Insert: {
                    id?: string
                    projectId: string
                    content: string
                    type?: string
                    createdAt?: string
                }
                Update: {
                    id?: string
                    projectId?: string
                    content?: string
                    type?: string
                    createdAt?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "ProjectLog_projectId_fkey"
                        columns: ["projectId"]
                        referencedRelation: "Project"
                        referencedColumns: ["id"]
                    }
                ]
            }
            QuoteItem: {
                Row: {
                    id: string
                    projectId: string
                    sku: string | null
                    detail: string
                    quantity: number
                    unit: string
                    priceNet: number
                    costNet: number
                }
                Insert: {
                    id?: string
                    projectId: string
                    sku?: string | null
                    detail: string
                    quantity?: number
                    unit?: string
                    priceNet?: number
                    costNet?: number
                }
                Update: {
                    id?: string
                    projectId?: string
                    sku?: string | null
                    detail?: string
                    quantity?: number
                    unit?: string
                    priceNet?: number
                    costNet?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "QuoteItem_projectId_fkey"
                        columns: ["projectId"]
                        referencedRelation: "Project"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            ProjectStatus: "EN_ESPERA" | "EN_CURSO" | "BLOQUEADO" | "CERRADO" | "CANCELADO"
            ProjectStage: "LEVANTAMIENTO" | "COTIZACION" | "NEGOCIACION" | "DESARROLLO" | "QA" | "ENTREGA" | "SOPORTE"
            ProjectPriority: "BAJA" | "MEDIA" | "ALTA" | "CRITICA"
            CostCategory: "SERVICIOS" | "HARDWARE" | "SOFTWARE" | "LOGISTICA" | "OTROS"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
