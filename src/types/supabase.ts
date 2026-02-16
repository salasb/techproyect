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
          opportunityId: string | null
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
          opportunityId?: string | null
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
          opportunityId?: string | null
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
            foreignKeyName: "Interaction_opportunityId_fkey"
            columns: ["opportunityId"]
            isOneToOne: false
            referencedRelation: "Opportunity"
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
          fromLocationId: string | null
          id: string
          locationId: string | null
          notes: string | null
          organizationId: string
          productId: string
          quantity: number
          reference: string | null
          toLocationId: string | null
          type: string
          userId: string | null
        }
        Insert: {
          createdAt?: string | null
          fromLocationId?: string | null
          id?: string
          locationId?: string | null
          notes?: string | null
          organizationId: string
          productId: string
          quantity: number
          reference?: string | null
          toLocationId?: string | null
          type: string
          userId?: string | null
        }
        Update: {
          createdAt?: string | null
          fromLocationId?: string | null
          id?: string
          locationId?: string | null
          notes?: string | null
          organizationId?: string
          productId?: string
          quantity?: number
          reference?: string | null
          toLocationId?: string | null
          type?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "InventoryMovement_fromLocationId_fkey"
            columns: ["fromLocationId"]
            isOneToOne: false
            referencedRelation: "Location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "InventoryMovement_locationId_fkey"
            columns: ["locationId"]
            isOneToOne: false
            referencedRelation: "Location"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "InventoryMovement_toLocationId_fkey"
            columns: ["toLocationId"]
            isOneToOne: false
            referencedRelation: "Location"
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
      Location: {
        Row: {
          address: string | null
          createdAt: string | null
          id: string
          isDefault: boolean | null
          name: string
          organizationId: string
          status: string | null
          type: Database["public"]["Enums"]["LocationType"]
          updatedAt: string | null
        }
        Insert: {
          address?: string | null
          createdAt?: string | null
          id?: string
          isDefault?: boolean | null
          name: string
          organizationId: string
          status?: string | null
          type?: Database["public"]["Enums"]["LocationType"]
          updatedAt?: string | null
        }
        Update: {
          address?: string | null
          createdAt?: string | null
          id?: string
          isDefault?: boolean | null
          name?: string
          organizationId?: string
          status?: string | null
          type?: Database["public"]["Enums"]["LocationType"]
          updatedAt?: string | null
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
      LocationMember: {
        Row: {
          createdAt: string | null
          id: string
          locationId: string
          role: string
          userId: string
        }
        Insert: {
          createdAt?: string | null
          id?: string
          locationId: string
          role?: string
          userId: string
        }
        Update: {
          createdAt?: string | null
          id?: string
          locationId?: string
          role?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "LocationMember_locationId_fkey"
            columns: ["locationId"]
            isOneToOne: false
            referencedRelation: "Location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "LocationMember_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "Profile"
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
          lastContactType: string | null
          lastInteractionDate: string | null
          nextInteractionDate: string | null
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
          lastContactType?: string | null
          lastInteractionDate?: string | null
          nextInteractionDate?: string | null
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
          lastContactType?: string | null
          lastInteractionDate?: string | null
          nextInteractionDate?: string | null
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
          plan: Database["public"]["Enums"]["OrganizationPlan"] | null
          rut: string | null
          settings: Json | null
          status: Database["public"]["Enums"]["OrganizationStatus"] | null
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          id?: string
          logoUrl?: string | null
          name: string
          plan?: Database["public"]["Enums"]["OrganizationPlan"] | null
          rut?: string | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["OrganizationStatus"] | null
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          id?: string
          logoUrl?: string | null
          name?: string
          plan?: Database["public"]["Enums"]["OrganizationPlan"] | null
          rut?: string | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["OrganizationStatus"] | null
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
      Plan: {
        Row: {
          createdAt: string
          currency: string
          description: string | null
          features: Json
          id: string
          interval: string
          isActive: boolean
          limits: Json
          name: string
          price: number
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          currency?: string
          description?: string | null
          features?: Json
          id: string
          interval?: string
          isActive?: boolean
          limits?: Json
          name: string
          price?: number
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: string
          isActive?: boolean
          limits?: Json
          name?: string
          price?: number
          updatedAt?: string
        }
        Relationships: []
      }
      Product: {
        Row: {
          barcode: string | null
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
          barcode?: string | null
          costNet?: number
          createdAt?: string
          description?: string | null
          id: string
          min_stock?: number
          name: string
          organizationId: string
          priceNet?: number
          sku: string
          stock?: number
          type?: string
          unit?: string
          updatedAt: string
        }
        Update: {
          barcode?: string | null
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
      ProductStock: {
        Row: {
          id: string
          locationId: string
          maxStock: number | null
          minStock: number | null
          productId: string
          quantity: number
          updatedAt: string | null
        }
        Insert: {
          id?: string
          locationId: string
          maxStock?: number | null
          minStock?: number | null
          productId: string
          quantity?: number
          updatedAt?: string | null
        }
        Update: {
          id?: string
          locationId?: string
          maxStock?: number | null
          minStock?: number | null
          productId?: string
          quantity?: number
          updatedAt?: string | null
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
      Profile: {
        Row: {
          avatarUrl: string | null
          createdAt: string
          email: string
          id: string
          name: string
          organizationId: string | null
          role: string
          updatedAt: string
        }
        Insert: {
          avatarUrl?: string | null
          createdAt?: string
          email: string
          id?: string
          name: string
          organizationId?: string | null
          role?: string
          updatedAt?: string
        }
        Update: {
          avatarUrl?: string | null
          createdAt?: string
          email?: string
          id?: string
          name?: string
          organizationId?: string | null
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
          id: string
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
      UserInvitation: {
        Row: {
          acceptedAt: string | null
          createdAt: string | null
          email: string
          expiresAt: string
          id: string
          organizationId: string
          role: string
          token: string
        }
        Insert: {
          acceptedAt?: string | null
          createdAt?: string | null
          email: string
          expiresAt: string
          id?: string
          organizationId: string
          role?: string
          token: string
        }
        Update: {
          acceptedAt?: string | null
          createdAt?: string | null
          email?: string
          expiresAt?: string
          id?: string
          organizationId?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserInvitation_organizationId_fkey"
            columns: ["organizationId"]
            isOneToOne: false
            referencedRelation: "Organization"
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
          p_location_id?: string
          p_product_id: string
          p_quantity: number
          p_reason?: string
          p_reference_id?: string
          p_type: string
        }
        Returns: undefined
      }
      register_inventory_movement: {
        Args: {
          p_from_location_id?: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_reference?: string
          p_to_location_id?: string
          p_type: Database["public"]["Enums"]["MovementType"]
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
      LocationType: "WAREHOUSE" | "VEHICLE" | "SITE"
      MovementType: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT"
      OrganizationPlan: "FREE" | "PRO" | "ENTERPRISE" | "INVENTORY_ONLY"
      OrganizationStatus: "PENDING" | "ACTIVE" | "INACTIVE"
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
      LocationType: ["WAREHOUSE", "VEHICLE", "SITE"],
      MovementType: ["IN", "OUT", "TRANSFER", "ADJUSTMENT"],
      OrganizationPlan: ["FREE", "PRO", "ENTERPRISE", "INVENTORY_ONLY"],
      OrganizationStatus: ["PENDING", "ACTIVE", "INACTIVE"],
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
