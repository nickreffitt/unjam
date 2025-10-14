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
          current_period_start: string | null
          id: string
          plan_amount: number
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
          current_period_start?: string | null
          id?: string
          plan_amount: number
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
          current_period_start?: string | null
          id?: string
          plan_amount?: number
          plan_name?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      engineer_transfers: {
        Row: {
          amount: number
          created_at: string | null
          credit_value: number
          credits_used: number
          customer_id: string
          engineer_id: string
          error_message: string | null
          id: string
          platform_profit: number
          status: Database["public"]["Enums"]["engineer_transfer_status"]
          stripe_transfer_id: string | null
          ticket_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          credit_value: number
          credits_used: number
          customer_id: string
          engineer_id: string
          error_message?: string | null
          id?: string
          platform_profit: number
          status?: Database["public"]["Enums"]["engineer_transfer_status"]
          stripe_transfer_id?: string | null
          ticket_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          credit_value?: number
          credits_used?: number
          customer_id?: string
          engineer_id?: string
          error_message?: string | null
          id?: string
          platform_profit?: number
          status?: Database["public"]["Enums"]["engineer_transfer_status"]
          stripe_transfer_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_engineer"
            columns: ["engineer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ticket"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
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
      screenshare_requests: {
        Row: {
          auto_accept: boolean | null
          created_at: string | null
          expires_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: Database["public"]["Enums"]["screenshare_status"]
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          auto_accept?: boolean | null
          created_at?: string | null
          expires_at: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: Database["public"]["Enums"]["screenshare_status"]
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          auto_accept?: boolean | null
          created_at?: string | null
          expires_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: Database["public"]["Enums"]["screenshare_status"]
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screenshare_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshare_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshare_requests_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      screenshare_sessions: {
        Row: {
          ended_at: string | null
          error_message: string | null
          id: string
          last_activity_at: string | null
          publisher_id: string
          request_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          stream_id: string | null
          subscriber_id: string
          ticket_id: string
        }
        Insert: {
          ended_at?: string | null
          error_message?: string | null
          id?: string
          last_activity_at?: string | null
          publisher_id: string
          request_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          stream_id?: string | null
          subscriber_id: string
          ticket_id: string
        }
        Update: {
          ended_at?: string | null
          error_message?: string | null
          id?: string
          last_activity_at?: string | null
          publisher_id?: string
          request_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          stream_id?: string | null
          subscriber_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screenshare_sessions_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshare_sessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "screenshare_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshare_sessions_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenshare_sessions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
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
      webrtc_signals: {
        Row: {
          created_at: string | null
          from_id: string
          id: string
          payload: Json
          processed: boolean | null
          session_id: string
          ticket_id: string
          to_id: string
          type: Database["public"]["Enums"]["webrtc_signal_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          from_id: string
          id?: string
          payload: Json
          processed?: boolean | null
          session_id: string
          ticket_id: string
          to_id: string
          type: Database["public"]["Enums"]["webrtc_signal_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          from_id?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          session_id?: string
          ticket_id?: string
          to_id?: string
          type?: Database["public"]["Enums"]["webrtc_signal_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webrtc_signals_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webrtc_signals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "screenshare_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webrtc_signals_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webrtc_signals_to_id_fkey"
            columns: ["to_id"]
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
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { data: Json; uri: string } | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { data: Json; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      retry_failed_credit_transfers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
    }
    Enums: {
      engineer_account_verification_status:
        | "active"
        | "eventually_due"
        | "currently_due"
        | "past_due"
        | "pending_verification"
        | "disabled"
      engineer_transfer_status: "pending" | "completed" | "failed"
      invoice_status: "draft" | "open" | "paid" | "uncollectible" | "void"
      screenshare_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "expired"
        | "active"
        | "ended"
      session_status:
        | "initializing"
        | "active"
        | "ended"
        | "error"
        | "disconnected"
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
      webrtc_signal_type: "offer" | "answer" | "ice-candidate"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      engineer_transfer_status: ["pending", "completed", "failed"],
      invoice_status: ["draft", "open", "paid", "uncollectible", "void"],
      screenshare_status: [
        "pending",
        "accepted",
        "rejected",
        "expired",
        "active",
        "ended",
      ],
      session_status: [
        "initializing",
        "active",
        "ended",
        "error",
        "disconnected",
      ],
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
      webrtc_signal_type: ["offer", "answer", "ice-candidate"],
    },
  },
} as const

