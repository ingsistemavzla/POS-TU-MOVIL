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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bcv_rates: {
        Row: {
          fetched_at: string
          id: string
          rate: number
        }
        Insert: {
          fetched_at?: string
          id?: string
          rate: number
        }
        Update: {
          fetched_at?: string
          id?: string
          rate?: number
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          plan: string | null
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plan?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plan?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          id_number: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          id_number?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          id_number?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventories: {
        Row: {
          company_id: string
          created_at: string
          id: string
          min_qty: number | null
          product_id: string
          qty: number
          store_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          min_qty?: number | null
          product_id: string
          qty?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          min_qty?: number | null
          product_id?: string
          qty?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          company_id: string
          created_at: string
          id: string
          product_id: string
          qty: number
          reason: string | null
          store_from_id: string | null
          store_to_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          product_id: string
          qty: number
          reason?: string | null
          store_from_id?: string | null
          store_to_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          product_id?: string
          qty?: number
          reason?: string | null
          store_from_id?: string | null
          store_to_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_store_from_id_fkey"
            columns: ["store_from_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_store_to_id_fkey"
            columns: ["store_to_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          barcode: string | null
          category: string | null
          company_id: string
          cost_usd: number | null
          created_at: string
          id: string
          name: string
          sale_price_usd: number
          sku: string
          tax_rate: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          barcode?: string | null
          category?: string | null
          company_id: string
          cost_price_usd?: number | null
          created_at?: string
          id?: string
          name: string
          sale_price_usd: number
          sku: string
          tax_rate?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          barcode?: string | null
          category?: string | null
          company_id?: string
          cost_price_usd?: number | null
          created_at?: string
          id?: string
          name?: string
          sale_price_usd?: number
          sku?: string
          tax_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          discount_usd: number | null
          id: string
          price_usd: number
          product_id: string
          qty: number
          sale_id: string
          subtotal_usd: number
        }
        Insert: {
          created_at?: string
          discount_usd?: number | null
          id?: string
          price_usd: number
          product_id: string
          qty: number
          sale_id: string
          subtotal_usd: number
        }
        Update: {
          created_at?: string
          discount_usd?: number | null
          id?: string
          price_usd?: number
          product_id?: string
          qty?: number
          sale_id?: string
          subtotal_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount_bs: number
          amount_usd: number
          id: string
          payment_method: string
          sale_id: string
        }
        Insert: {
          amount_bs: number
          amount_usd: number
          id?: string
          payment_method: string
          sale_id: string
        }
        Update: {
          amount_bs?: number
          amount_usd?: number
          id?: string
          payment_method?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          bcv_rate_used: number
          cashier_id: string
          company_id: string
          created_at: string
          customer_id: string | null
          id: string
          invoice_number: string | null
          payment_method: string
          status: string | null
          store_id: string
          total_bs: number
          total_usd: number
        }
        Insert: {
          bcv_rate_used: number
          cashier_id: string
          company_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_number?: string | null
          payment_method: string
          status?: string | null
          store_id: string
          total_bs: number
          total_usd: number
        }
        Update: {
          bcv_rate_used?: number
          cashier_id?: string
          company_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_number?: string | null
          payment_method?: string
          status?: string | null
          store_id?: string
          total_bs?: number
          total_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          active: boolean | null
          address: string | null
          business_name: string | null
          company_id: string
          created_at: string
          email_fiscal: string | null
          fiscal_address: string | null
          id: string
          name: string
          phone: string | null
          phone_fiscal: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          business_name?: string | null
          company_id: string
          created_at?: string
          email_fiscal?: string | null
          fiscal_address?: string | null
          id?: string
          name: string
          phone?: string | null
          phone_fiscal?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          address?: string | null
          business_name?: string | null
          company_id?: string
          created_at?: string
          email_fiscal?: string | null
          fiscal_address?: string | null
          id?: string
          name?: string
          phone?: string | null
          phone_fiscal?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean | null
          assigned_store_id: string | null
          auth_user_id: string | null
          company_id: string
          created_at: string
          email: string
          id: string
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          assigned_store_id?: string | null
          auth_user_id?: string | null
          company_id: string
          created_at?: string
          email: string
          id?: string
          name: string
          role: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          assigned_store_id?: string | null
          auth_user_id?: string | null
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_assigned_store_id_fkey"
            columns: ["assigned_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
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
      [_ in never]: never
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
    Enums: {},
  },
} as const


        }

        Relationships: [

          {

            foreignKeyName: "sale_items_product_id_fkey"

            columns: ["product_id"]

            isOneToOne: false

            referencedRelation: "products"

            referencedColumns: ["id"]

          },

          {

            foreignKeyName: "sale_items_sale_id_fkey"

            columns: ["sale_id"]

            isOneToOne: false

            referencedRelation: "sales"

            referencedColumns: ["id"]

          },

        ]

      }

      sales: {

        Row: {

          bcv_rate_used: number

          cashier_id: string

          company_id: string

          created_at: string

          customer_id: string | null

          id: string

          invoice_number: string | null

          payment_method: string

          status: string | null

          store_id: string

          total_bs: number

          total_usd: number

        }

        Insert: {

          bcv_rate_used: number

          cashier_id: string

          company_id: string

          created_at?: string

          customer_id?: string | null

          id?: string

          invoice_number?: string | null

          payment_method: string

          status?: string | null

          store_id: string

          total_bs: number

          total_usd: number

        }

        Update: {

          bcv_rate_used?: number

          cashier_id?: string

          company_id?: string

          created_at?: string

          customer_id?: string | null

          id?: string

          invoice_number?: string | null

          payment_method?: string

          status?: string | null

          store_id?: string

          total_bs?: number

          total_usd?: number

        }

        Relationships: [

          {

            foreignKeyName: "sales_cashier_id_fkey"

            columns: ["cashier_id"]

            isOneToOne: false

            referencedRelation: "users"

            referencedColumns: ["id"]

          },

          {

            foreignKeyName: "sales_company_id_fkey"

            columns: ["company_id"]

            isOneToOne: false

            referencedRelation: "companies"

            referencedColumns: ["id"]

          },

          {

            foreignKeyName: "sales_customer_id_fkey"

            columns: ["customer_id"]

            isOneToOne: false

            referencedRelation: "customers"

            referencedColumns: ["id"]

          },

          {

            foreignKeyName: "sales_store_id_fkey"

            columns: ["store_id"]

            isOneToOne: false

            referencedRelation: "stores"

            referencedColumns: ["id"]

          },

        ]

      }

      stores: {

        Row: {

          active: boolean | null

          address: string | null

          company_id: string

          created_at: string

          id: string

          name: string

          phone: string | null

          updated_at: string

        }

        Insert: {

          active?: boolean | null

          address?: string | null

          company_id: string

          created_at?: string

          id?: string

          name: string

          phone?: string | null

          updated_at?: string

        }

        Update: {

          active?: boolean | null

          address?: string | null

          company_id?: string

          created_at?: string

          id?: string

          name?: string

          phone?: string | null

          updated_at?: string

        }

        Relationships: [

          {

            foreignKeyName: "stores_company_id_fkey"

            columns: ["company_id"]

            isOneToOne: false

            referencedRelation: "companies"

            referencedColumns: ["id"]

          },

        ]

      }

      users: {

        Row: {

          active: boolean | null

          assigned_store_id: string | null

          auth_user_id: string | null

          company_id: string

          created_at: string

          email: string

          id: string

          name: string

          role: string

          updated_at: string

        }

        Insert: {

          active?: boolean | null

          assigned_store_id?: string | null

          auth_user_id?: string | null

          company_id: string

          created_at?: string

          email: string

          id?: string

          name: string

          role: string

          updated_at?: string

        }

        Update: {

          active?: boolean | null

          assigned_store_id?: string | null

          auth_user_id?: string | null

          company_id?: string

          created_at?: string

          email?: string

          id?: string

          name?: string

          role?: string

          updated_at?: string

        }

        Relationships: [

          {

            foreignKeyName: "users_company_id_fkey"

            columns: ["company_id"]

            isOneToOne: false

            referencedRelation: "companies"

            referencedColumns: ["id"]

          },

          {

            foreignKeyName: "users_assigned_store_id_fkey"

            columns: ["assigned_store_id"]

            isOneToOne: false

            referencedRelation: "stores"

            referencedColumns: ["id"]

          },

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

      [_ in never]: never

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

    Enums: {},

  },

} as const


