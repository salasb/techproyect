export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "14.1"
    }
    public: {
        Tables: {
            AuditLog: {
                Row: {
                    action: string
                    createdAt: string | null
                    details: string | null
                    id: string
                    projectId: string
                    userId: string | null
                    userName: string | null
                }
                Insert: {
                    action: string
                    createdAt?: string | null
                    details?: string | null
                    id?: string
                    projectId: string
                    userId?: string | null
                    userName?: string | null
                }
                Update: {
                    action?: string
                    createdAt?: string | null
                    details?: string | null
                    id?: string
                    projectId?: string
                    userId?: string | null
                    userName?: string | null
                }
                Relationships: [
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
                    phone?: string | null
                    status?: Database["public"]["Enums"]["ClientStatus"]
                    taxId?: string | null
                    updatedAt?: string
                }
                Relationships: []
            }
            Company: {
                Row: {
                    address: string | null
                    contactName: string | null
                    email: string | null
                    id: string
                    name: string
                    phone: string | null
                    taxId: string | null
                }
                Insert: {
                    address?: string | null
                    contactName?: string | null
                    email?: string | null
                    id: string
                    name: string
                    phone?: string | null
                    taxId?: string | null
                }
                Update: {
                    address?: string | null
                    contactName?: string | null
                    email?: string | null
                    id?: string
                    name?: string
                    phone?: string | null
                    taxId?: string | null
                }
                Relationships: []
            }
            Contact: {
                Row: {
                    clientId: string
                    createdAt: string
                    email: string | null
                    id: string
                    name: string
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
                ]
            }
            CostEntry: {
                Row: {
                    amountNet: number
                    category: Database["public"]["Enums"]["CostCategory"]
                    date: string
                    description: string
                    id: string
                    projectId: string
                }
                Insert: {
                    amountNet: number
                    category: Database["public"]["Enums"]["CostCategory"]
                    date: string
                    description: string
                    id: string
                    projectId: string
                }
                Update: {
                    amountNet?: number
                    category?: Database["public"]["Enums"]["CostCategory"]
                    date?: string
                    description?: string
                    id?: string
                    projectId?: string
                }
                Relationships: [
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
                    projectId: string | null
                    type: Database["public"]["Enums"]["InteractionType"]
                }
                Insert: {
                    clientId: string
                    createdAt?: string
                    date?: string
                    id?: string
                    notes: string
                    projectId?: string | null
                    type: Database["public"]["Enums"]["InteractionType"]
                }
                Update: {
                    clientId?: string
                    createdAt?: string
                    date?: string
                    id?: string
                    notes?: string
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
                        foreignKeyName: "Interaction_projectId_fkey"
                        columns: ["projectId"]
                        isOneToOne: false
                        referencedRelation: "Project"
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
                    paymentTermsDays?: number | null
                    projectId?: string
                    sent?: boolean
                    sentDate?: string | null
                    updatedAt?: string
                }
                Relationships: [
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
                    clientId: string | null
                    createdAt: string
                    description: string | null
                    expectedCloseDate: string | null
                    id: string
                    probability: number
                    stage: Database["public"]["Enums"]["OpportunityStage"]
                    title: string
                    updatedAt: string
                    value: number
                }
                Insert: {
                    clientId?: string | null
                    createdAt?: string
                    description?: string | null
                    expectedCloseDate?: string | null
                    id?: string
                    probability?: number
                    stage?: Database["public"]["Enums"]["OpportunityStage"]
                    title: string
                    updatedAt?: string
                    value?: number
                }
                Update: {
                    clientId?: string | null
                    createdAt?: string
                    description?: string | null
                    expectedCloseDate?: string | null
                    id?: string
                    probability?: number
                    stage?: Database["public"]["Enums"]["OpportunityStage"]
                    title?: string
                    updatedAt?: string
                    value?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "Opportunity_clientId_fkey"
                        columns: ["clientId"]
                        isOneToOne: false
                        referencedRelation: "Client"
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
                    name: string
                    priceNet: number
                    sku: string
                    unit: string
                    updatedAt: string
                }
                Insert: {
                    costNet?: number
                    createdAt?: string
                    description?: string | null
                    id: string
                    name: string
                    priceNet?: number
                    sku: string
                    unit?: string
                    updatedAt: string
                }
                Update: {
                    costNet?: number
                    createdAt?: string
                    description?: string | null
                    id?: string
                    name?: string
                    priceNet?: number
                    sku?: string
                    unit?: string
                    updatedAt?: string
                }
                Relationships: []
            }
            Profile: {
                Row: {
                    avatarUrl: string | null
                    createdAt: string
                    email: string
                    id: string
                    name: string
                    role: string
                    updatedAt: string
                }
                Insert: {
                    avatarUrl?: string | null
                    createdAt?: string
                    email: string
                    id?: string
                    name: string
                    role?: string
                    updatedAt?: string
                }
                Update: {
                    avatarUrl?: string | null
                    createdAt?: string
                    email?: string
                    id?: string
                    name?: string
                    role?: string
                    updatedAt?: string
                }
                Relationships: []
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
                ]
            }
            ProjectLog: {
                Row: {
                    content: string
                    createdAt: string
                    id: string
                    projectId: string
                    type: string
                }
                Insert: {
                    content: string
                    createdAt?: string
                    id: string
                    projectId: string
                    type?: string
                }
                Update: {
                    content?: string
                    createdAt?: string
                    id?: string
                    projectId?: string
                    type?: string
                }
                Relationships: [
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
                    priceNet?: number
                    projectId?: string
                    quantity?: number
                    sku?: string | null
                    unit?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "QuoteItem_projectId_fkey"
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
                    vatRate: number
                    yellowThresholdDays: number
                }
                Insert: {
                    currency?: string
                    defaultPaymentTermsDays?: number
                    id?: number
                    vatRate?: number
                    yellowThresholdDays?: number
                }
                Update: {
                    currency?: string
                    defaultPaymentTermsDays?: number
                    id?: number
                    vatRate?: number
                    yellowThresholdDays?: number
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
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
            OpportunityStage:
            | "LEAD"
            | "QUALIFIED"
            | "PROPOSAL"
            | "NEGOTIATION"
            | "WON"
            | "LOST"
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
    DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
    public: {
        Enums: {
            ClientStatus: ["LEAD", "PROSPECT", "CLIENT", "CHURNED"],
            CostCategory: ["SERVICIOS", "HARDWARE", "SOFTWARE", "LOGISTICA", "OTROS"],
            InteractionType: ["CALL", "EMAIL", "MEETING", "NOTE"],
            OpportunityStage: [
                "LEAD",
                "QUALIFIED",
                "PROPOSAL",
                "NEGOTIATION",
                "WON",
                "LOST",
            ],
            ProjectStage: [
                "LEVANTAMIENTO",
                "DISENO",
                "DESARROLLO",
                "QA",
                "IMPLEMENTACION",
                "SOPORTE",
            ],
            ProjectStatus: [
                "EN_CURSO",
                "EN_ESPERA",
                "BLOQUEADO",
                "CERRADO",
                "CANCELADO",
            ],
        },
    },
} as const
