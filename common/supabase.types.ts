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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      billing_customers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          profile_id: string
          stripe_customer_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          profile_id: string
          stripe_customer_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          profile_id?: string
          stripe_customer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_customers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_engineers: {
        Row: {
          charges_enabled: boolean
          created_at: string | null
          current_deadline: string | null
          details_submitted: boolean
          disabled_reason: string | null
          email: string
          id: string
          payouts_enabled: boolean
          profile_id: string
          stripe_account_id: string
          updated_at: string | null
          verification_status: Database["public"]["Enums"]["engineer_account_verification_status"]
        }
        Insert: {
          charges_enabled?: boolean
          created_at?: string | null
          current_deadline?: string | null
          details_submitted?: boolean
          disabled_reason?: string | null
          email: string
          id?: string
          payouts_enabled?: boolean
          profile_id: string
          stripe_account_id: string
          updated_at?: string | null
          verification_status?: Database["public"]["Enums"]["engineer_account_verification_status"]
        }
        Update: {
          charges_enabled?: boolean
          created_at?: string | null
          current_deadline?: string | null
          details_submitted?: boolean
          disabled_reason?: string | null
          email?: string
          id?: string
          payouts_enabled?: boolean
          profile_id?: string
          stripe_account_id?: string
          updated_at?: string | null
          verification_status?: Database["public"]["Enums"]["engineer_account_verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_profile"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["invoice_status"]
          stripe_customer_id: string
          stripe_invoice_id: string
          stripe_subscription_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["invoice_status"]
          stripe_customer_id: string
          stripe_invoice_id: string
          stripe_subscription_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_customer_id?: string
          stripe_invoice_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      billing_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string | null
          credit_price: number
          current_period_end: string | null
          id: string
          plan_name: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string | null
          credit_price: number
          current_period_end?: string | null
          id?: string
          plan_name: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string | null
          credit_price?: number
          current_period_end?: string | null
          id?: string
          plan_name?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auth_id: string
          created_at: string | null
          email: string | null
          extension_installed_at: string | null
          extension_installed_version: string | null
          github_username: string | null
          id: string
          name: string
          specialties: string[] | null
          type: Database["public"]["Enums"]["user_type"]
          updated_at: string | null
        }
        Insert: {
          auth_id: string
          created_at?: string | null
          email?: string | null
          extension_installed_at?: string | null
          extension_installed_version?: string | null
          github_username?: string | null
          id?: string
          name: string
          specialties?: string[] | null
          type: Database["public"]["Enums"]["user_type"]
          updated_at?: string | null
        }
        Update: {
          auth_id?: string
          created_at?: string | null
          email?: string | null
          extension_installed_at?: string | null
          extension_installed_version?: string | null
          github_username?: string | null
          id?: string
          name?: string
          specialties?: string[] | null
          type?: Database["public"]["Enums"]["user_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      tickets: {
        Row: {
          abandoned_at: string | null
          assigned_to: string | null
          auto_complete_timeout_at: string | null
          claimed_at: string | null
          created_at: string | null
          created_by: string
          estimated_time: string
          id: string
          marked_as_fixed_at: string | null
          problem_description: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          summary: string
          updated_at: string | null
        }
        Insert: {
          abandoned_at?: string | null
          assigned_to?: string | null
          auto_complete_timeout_at?: string | null
          claimed_at?: string | null
          created_at?: string | null
          created_by: string
          estimated_time: string
          id?: string
          marked_as_fixed_at?: string | null
          problem_description: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          summary: string
          updated_at?: string | null
        }
        Update: {
          abandoned_at?: string | null
          assigned_to?: string | null
          auto_complete_timeout_at?: string | null
          claimed_at?: string | null
          created_at?: string | null
          created_by?: string
          estimated_time?: string
          id?: string
          marked_as_fixed_at?: string | null
          problem_description?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          summary?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      engineer_account_verification_status:
        | "active"
        | "eventually_due"
        | "currently_due"
        | "past_due"
        | "pending_verification"
        | "disabled"
      invoice_status: "draft" | "open" | "paid" | "uncollectible" | "void"
      subscription_status:
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "paused"
      ticket_status:
        | "waiting"
        | "in-progress"
        | "awaiting-confirmation"
        | "marked-resolved"
        | "completed"
        | "auto-completed"
      user_type: "customer" | "engineer"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      engineer_account_verification_status: [
        "active",
        "eventually_due",
        "currently_due",
        "past_due",
        "pending_verification",
        "disabled",
      ],
      invoice_status: ["draft", "open", "paid", "uncollectible", "void"],
      subscription_status: [
        "incomplete",
        "incomplete_expired",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "paused",
      ],
      ticket_status: [
        "waiting",
        "in-progress",
        "awaiting-confirmation",
        "marked-resolved",
        "completed",
        "auto-completed",
      ],
      user_type: ["customer", "engineer"],
    },
  },
} as const

