export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    graphql_public: {
        Tables: {
            [_ in never]: never
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            graphql: {
                Args: {
                    operationName?: string
                    query?: string
                    variables?: Json
                    extensions?: Json
                }
                Returns: Json
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
    public: {
        Tables: {
            AuditLog: {
                Row: {
                    action: string
                    createdAt: string | null
                    details: string | null
                    id: string
                    organizationId: string
                    projectId: string
                    userId: string | null
                    userName: string | null
                }
                Insert: {
                    action: string
                    createdAt?: string | null
                    details?: string | null
                    id?: string
                    organizationId: string
                    projectId: string
                    userId?: string | null
                    userName?: string | null
                }
                Update: {
                    action?: string
                    createdAt?: string | null
                    details?: string | null
                    id?: string
                    organizationId?: string
                    projectId?: string
                    userId?: string | null
                    userName?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "AuditLog_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "AuditLog_projectId_fkey"
                        columns: ["projectId"]
                        isOneToOne: false
                        referencedRelation: "Project"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "AuditLog_userId_fkey"
                        columns: ["userId"]
                        isOneToOne: false
                        referencedRelation: "Profile"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Client: {
                Row: {
                    address: string | null
                    contactName: string | null
                    createdAt: string
                    email: string | null
                    id: string
                    name: string
                    organizationId: string
                    phone: string | null
                    status: Database["public"]["Enums"]["ClientStatus"]
                    taxId: string | null
                    updatedAt: string
                }
                Insert: {
                    address?: string | null
                    contactName?: string | null
                    createdAt?: string
                    email?: string | null
                    id?: string
                    name: string
                    organizationId: string
                    phone?: string | null
                    status?: Database["public"]["Enums"]["ClientStatus"]
                    taxId?: string | null
                    updatedAt?: string
                }
                Update: {
                    address?: string | null
                    contactName?: string | null
                    createdAt?: string
                    email?: string | null
                    id?: string
                    name?: string
                    organizationId?: string
                    phone?: string | null
                    status?: Database["public"]["Enums"]["ClientStatus"]
                    taxId?: string | null
                    updatedAt?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "Client_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Company: {
                Row: {
                    address: string | null
                    contactName: string | null
                    email: string | null
                    id: string
                    name: string
                    organizationId: string
                    phone: string | null
                    taxId: string | null
                }
                Insert: {
                    address?: string | null
                    contactName?: string | null
                    email?: string | null
                    id: string
                    name: string
                    organizationId: string
                    phone?: string | null
                    taxId?: string | null
                }
                Update: {
                    address?: string | null
                    contactName?: string | null
                    email?: string | null
                    id?: string
                    name?: string
                    organizationId?: string
                    phone?: string | null
                    taxId?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "Company_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Contact: {
                Row: {
                    clientId: string
                    createdAt: string
                    email: string | null
                    id: string
                    name: string
                    organizationId: string
                    phone: string | null
                    role: string | null
                    updatedAt: string
                }
                Insert: {
                    clientId: string
                    createdAt?: string
                    email?: string | null
                    id?: string
                    name: string
                    organizationId: string
                    phone?: string | null
                    role?: string | null
                    updatedAt?: string
                }
                Update: {
                    clientId?: string
                    createdAt?: string
                    email?: string | null
                    id?: string
                    name?: string
                    organizationId?: string
                    phone?: string | null
                    role?: string | null
                    updatedAt?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "Contact_clientId_fkey"
                        columns: ["clientId"]
                        isOneToOne: false
                        referencedRelation: "Client"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "Contact_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                ]
            }
            CostEntry: {
                Row: {
                    amountNet: number
                    category: Database["public"]["Enums"]["CostCategory"]
                    date: string
                    description: string
                    id: string
                    organizationId: string
                    projectId: string
                }
                Insert: {
                    amountNet: number
                    category: Database["public"]["Enums"]["CostCategory"]
                    date: string
                    description: string
                    id: string
                    organizationId: string
                    projectId: string
                }
                Update: {
                    amountNet?: number
                    category?: Database["public"]["Enums"]["CostCategory"]
                    date?: string
                    description?: string
                    id?: string
                    organizationId?: string
                    projectId?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "CostEntry_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "CostEntry_projectId_fkey"
                        columns: ["projectId"]
                        isOneToOne: false
                        referencedRelation: "Project"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Interaction: {
                Row: {
                    clientId: string
                    createdAt: string
                    date: string
                    id: string
                    notes: string
                    organizationId: string
                    projectId: string | null
                    type: Database["public"]["Enums"]["InteractionType"]
                }
                Insert: {
                    clientId: string
                    createdAt?: string
                    date?: string
                    id?: string
                    notes: string
                    organizationId: string
                    projectId?: string | null
                    type: Database["public"]["Enums"]["InteractionType"]
                }
                Update: {
                    clientId?: string
                    createdAt?: string
                    date?: string
                    id?: string
                    notes?: string
                    organizationId?: string
                    projectId?: string | null
                    type?: Database["public"]["Enums"]["InteractionType"]
                }
                Relationships: [
                    {
                        foreignKeyName: "Interaction_clientId_fkey"
                        columns: ["clientId"]
                        isOneToOne: false
                        referencedRelation: "Client"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "Interaction_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "Interaction_projectId_fkey"
                        columns: ["projectId"]
                        isOneToOne: false
                        referencedRelation: "Project"
                        referencedColumns: ["id"]
                    },
                ]
            }
            InventoryMovement: {
                Row: {
                    createdAt: string | null
                    createdBy: string | null
                    id: string
                    organizationId: string
                    productId: string
                    quantity: number
                    reason: string | null
                    referenceId: string | null
                    type: string
                }
                Insert: {
                    createdAt?: string | null
                    createdBy?: string | null
                    id?: string
                    organizationId: string
                    productId: string
                    quantity: number
                    reason?: string | null
                    referenceId?: string | null
                    type: string
                }
                Update: {
                    createdAt?: string | null
                    createdBy?: string | null
                    id?: string
                    organizationId?: string
                    productId?: string
                    quantity?: number
                    reason?: string | null
                    referenceId?: string | null
                    type?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "InventoryMovement_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "InventoryMovement_productId_fkey"
                        columns: ["productId"]
                        isOneToOne: false
                        referencedRelation: "Product"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Invoice: {
                Row: {
                    amountInvoicedGross: number
                    amountPaidGross: number
                    dueDate: string | null
                    id: string
                    organizationId: string
                    paymentTermsDays: number | null
                    projectId: string
                    sent: boolean
                    sentDate: string | null
                    updatedAt: string
                }
                Insert: {
                    amountInvoicedGross?: number
                    amountPaidGross?: number
                    dueDate?: string | null
                    id: string
                    organizationId: string
                    paymentTermsDays?: number | null
                    projectId: string
                    sent?: boolean
                    sentDate?: string | null
                    updatedAt: string
                }
                Update: {
                    amountInvoicedGross?: number
                    amountPaidGross?: number
                    dueDate?: string | null
                    id?: string
                    organizationId?: string
                    paymentTermsDays?: number | null
                    projectId?: string
                    sent?: boolean
                    sentDate?: string | null
                    updatedAt?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "Invoice_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "Invoice_projectId_fkey"
                        columns: ["projectId"]
                        isOneToOne: false
                        referencedRelation: "Project"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Opportunity: {
                Row: {
                    clientId: string
                    createdAt: string | null
                    description: string | null
                    expectedCloseDate: string | null
                    id: string
                    organizationId: string
                    probability: number | null
                    stage: string
                    title: string
                    updatedAt: string | null
                    value: number | null
                }
                Insert: {
                    clientId: string
                    createdAt?: string | null
                    description?: string | null
                    expectedCloseDate?: string | null
                    id?: string
                    organizationId: string
                    probability?: number | null
                    stage: string
                    title: string
                    updatedAt?: string | null
                    value?: number | null
                }
                Update: {
                    clientId?: string
                    createdAt?: string | null
                    description?: string | null
                    expectedCloseDate?: string | null
                    id?: string
                    organizationId?: string
                    probability?: number | null
                    stage?: string
                    title?: string
                    updatedAt?: string | null
                    value?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "Opportunity_clientId_fkey"
                        columns: ["clientId"]
                        isOneToOne: false
                        referencedRelation: "Client"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "Opportunity_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Organization: {
                Row: {
                    createdAt: string | null
                    id: string
                    logoUrl: string | null
                    name: string
                    rut: string | null
                    settings: Json | null
                    updatedAt: string | null
                }
                Insert: {
                    createdAt?: string | null
                    id?: string
                    logoUrl?: string | null
                    name: string
                    rut?: string | null
                    settings?: Json | null
                    updatedAt?: string | null
                }
                Update: {
                    createdAt?: string | null
                    id?: string
                    logoUrl?: string | null
                    name?: string
                    rut?: string | null
                    settings?: Json | null
                    updatedAt?: string | null
                }
                Relationships: []
            }
            OrganizationMember: {
                Row: {
                    createdAt: string | null
                    id: string
                    organizationId: string | null
                    role: string | null
                    userId: string | null
                }
                Insert: {
                    createdAt?: string | null
                    id?: string
                    organizationId?: string | null
                    role?: string | null
                    userId?: string | null
                }
                Update: {
                    createdAt?: string | null
                    id?: string
                    organizationId?: string | null
                    role?: string | null
                    userId?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "OrganizationMember_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Product: {
                Row: {
                    costNet: number
                    createdAt: string
                    description: string | null
                    id: string
                    min_stock: number
                    name: string
                    organizationId: string
                    priceNet: number
                    sku: string
                    stock: number
                    type: string
                    unit: string
                    updatedAt: string
                }
                Insert: {
                    costNet?: number
                    createdAt?: string
                    description?: string | null
                    id?: string
                    min_stock?: number
                    name: string
                    organizationId: string
                    priceNet?: number
                    sku?: string
                    stock?: number
                    type?: string
                    unit?: string
                    updatedAt?: string
                }
                Update: {
                    costNet?: number
                    createdAt?: string
                    description?: string | null
                    id?: string
                    min_stock?: number
                    name?: string
                    organizationId?: string
                    priceNet?: number
                    sku?: string
                    stock?: number
                    type?: string
                    unit?: string
                    updatedAt?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "Product_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Profile: {
                Row: {
                    avatarUrl: string | null
                    createdAt: string
                    email: string
                    id: string
                    name: string
                    organizationId: string
                    role: string
                    updatedAt: string
                }
                Insert: {
                    avatarUrl?: string | null
                    createdAt?: string
                    email: string
                    id?: string
                    name: string
                    organizationId: string
                    role?: string
                    updatedAt?: string
                }
                Update: {
                    avatarUrl?: string | null
                    createdAt?: string
                    email?: string
                    id?: string
                    name?: string
                    organizationId?: string
                    role?: string
                    updatedAt?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "Profile_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Project: {
                Row: {
                    acceptedAt: string | null
                    blockingReason: string | null
                    budgetNet: number
                    clientId: string | null
                    companyId: string
                    createdAt: string
                    currency: string | null
                    id: string
                    marginPct: number
                    name: string
                    nextAction: string | null
                    nextActionDate: string | null
                    organizationId: string
                    paymentMethod: string
                    plannedEndDate: string
                    progress: number
                    quoteSentDate: string | null
                    responsible: string
                    scopeDetails: string | null
                    stage: Database["public"]["Enums"]["ProjectStage"]
                    startDate: string
                    status: Database["public"]["Enums"]["ProjectStatus"]
                    updatedAt: string
                }
                Insert: {
                    acceptedAt?: string | null
                    blockingReason?: string | null
                    budgetNet?: number
                    clientId?: string | null
                    companyId: string
                    createdAt?: string
                    currency?: string | null
                    id: string
                    marginPct?: number
                    name: string
                    nextAction?: string | null
                    nextActionDate?: string | null
                    organizationId: string
                    paymentMethod?: string
                    plannedEndDate: string
                    progress?: number
                    quoteSentDate?: string | null
                    responsible: string
                    scopeDetails?: string | null
                    stage: Database["public"]["Enums"]["ProjectStage"]
                    startDate: string
                    status: Database["public"]["Enums"]["ProjectStatus"]
                    updatedAt: string
                }
                Update: {
                    acceptedAt?: string | null
                    blockingReason?: string | null
                    budgetNet?: number
                    clientId?: string | null
                    companyId?: string
                    createdAt?: string
                    currency?: string | null
                    id?: string
                    marginPct?: number
                    name?: string
                    nextAction?: string | null
                    nextActionDate?: string | null
                    organizationId?: string
                    paymentMethod?: string
                    plannedEndDate?: string
                    progress?: number
                    quoteSentDate?: string | null
                    responsible?: string
                    scopeDetails?: string | null
                    stage?: Database["public"]["Enums"]["ProjectStage"]
                    startDate?: string
                    status?: Database["public"]["Enums"]["ProjectStatus"]
                    updatedAt?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "Project_clientId_fkey"
                        columns: ["clientId"]
                        isOneToOne: false
                        referencedRelation: "Client"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "Project_companyId_fkey"
                        columns: ["companyId"]
                        isOneToOne: false
                        referencedRelation: "Company"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "Project_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                ]
            }
            ProjectLog: {
                Row: {
                    content: string
                    createdAt: string
                    id: string
                    organizationId: string
                    projectId: string
                    type: string
                }
                Insert: {
                    content: string
                    createdAt?: string
                    id?: string
                    organizationId: string
                    projectId: string
                    type?: string
                }
                Update: {
                    content?: string
                    createdAt?: string
                    id?: string
                    organizationId?: string
                    projectId?: string
                    type?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "ProjectLog_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "ProjectLog_projectId_fkey"
                        columns: ["projectId"]
                        isOneToOne: false
                        referencedRelation: "Project"
                        referencedColumns: ["id"]
                    },
                ]
            }
            QuoteItem: {
                Row: {
                    costNet: number
                    detail: string
                    id: string
                    isSelected: boolean
                    organizationId: string
                    priceNet: number
                    projectId: string
                    quantity: number
                    sku: string | null
                    unit: string
                }
                Insert: {
                    costNet?: number
                    detail: string
                    id?: string
                    isSelected?: boolean
                    organizationId: string
                    priceNet?: number
                    projectId: string
                    quantity?: number
                    sku?: string | null
                    unit?: string
                }
                Update: {
                    costNet?: number
                    detail?: string
                    id?: string
                    isSelected?: boolean
                    organizationId?: string
                    priceNet?: number
                    projectId?: string
                    quantity?: number
                    sku?: string | null
                    unit?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "QuoteItem_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "QuoteItem_projectId_fkey"
                        columns: ["projectId"]
                        isOneToOne: false
                        referencedRelation: "Project"
                        referencedColumns: ["id"]
                    },
                ]
            }
            SaleNote: {
                Row: {
                    correlative: number
                    generatedAt: string
                    id: string
                    organizationId: string
                    pdfUrl: string | null
                    projectId: string
                    status: string
                }
                Insert: {
                    correlative?: number
                    generatedAt?: string
                    id: string
                    organizationId: string
                    pdfUrl?: string | null
                    projectId: string
                    status?: string
                }
                Update: {
                    correlative?: number
                    generatedAt?: string
                    id?: string
                    organizationId?: string
                    pdfUrl?: string | null
                    projectId?: string
                    status?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "SaleNote_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "SaleNote_projectId_fkey"
                        columns: ["projectId"]
                        isOneToOne: false
                        referencedRelation: "Project"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Settings: {
                Row: {
                    currency: string
                    defaultPaymentTermsDays: number
                    id: number
                    organizationId: string
                    vatRate: number
                    yellowThresholdDays: number
                }
                Insert: {
                    currency?: string
                    defaultPaymentTermsDays?: number
                    id?: number
                    organizationId: string
                    vatRate?: number
                    yellowThresholdDays?: number
                }
                Update: {
                    currency?: string
                    defaultPaymentTermsDays?: number
                    id?: number
                    organizationId?: string
                    vatRate?: number
                    yellowThresholdDays?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "Settings_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Location: {
                Row: {
                    address: string | null
                    createdAt: string
                    id: string
                    isDefault: boolean
                    name: string
                    organizationId: string
                    status: string | null
                    type: string | null
                    updatedAt: string
                }
                Insert: {
                    address?: string | null
                    createdAt?: string
                    id?: string
                    isDefault?: boolean
                    name: string
                    organizationId: string
                    status?: string | null
                    type?: string | null
                    updatedAt?: string
                }
                Update: {
                    address?: string | null
                    createdAt?: string
                    id?: string
                    isDefault?: boolean
                    name?: string
                    organizationId?: string
                    status?: string | null
                    type?: string | null
                    updatedAt?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "Location_organizationId_fkey"
                        columns: ["organizationId"]
                        isOneToOne: false
                        referencedRelation: "Organization"
                        referencedColumns: ["id"]
                    },
                ]
            }
            ProductStock: {
                Row: {
                    id: string
                    locationId: string
                    minStock: number
                    productId: string
                    quantity: number
                    updatedAt: string
                }
                Insert: {
                    id?: string
                    locationId: string
                    minStock?: number
                    productId: string
                    quantity?: number
                    updatedAt?: string
                }
                Update: {
                    id?: string
                    locationId?: string
                    minStock?: number
                    productId?: string
                    quantity?: number
                    updatedAt?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "ProductStock_locationId_fkey"
                        columns: ["locationId"]
                        isOneToOne: false
                        referencedRelation: "Location"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "ProductStock_productId_fkey"
                        columns: ["productId"]
                        isOneToOne: false
                        referencedRelation: "Product"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            adjust_inventory: {
                Args: {
                    p_product_id: string
                    p_quantity: number
                    p_reason?: string
                    p_reference_id?: string
                    p_type: string
                    p_location_id?: string
                }
                Returns: undefined
            }
        }
        Enums: {
            ClientStatus: "LEAD" | "PROSPECT" | "CLIENT" | "CHURNED"
            CostCategory:
            | "SERVICIOS"
            | "HARDWARE"
            | "SOFTWARE"
            | "LOGISTICA"
            | "OTROS"
            InteractionType: "CALL" | "EMAIL" | "MEETING" | "NOTE"
            ProjectStage:
            | "LEVANTAMIENTO"
            | "DISENO"
            | "DESARROLLO"
            | "QA"
            | "IMPLEMENTACION"
            | "SOPORTE"
            ProjectStatus:
            | "EN_CURSO"
            | "EN_ESPERA"
            | "BLOQUEADO"
            | "CERRADO"
            | "CANCELADO"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
