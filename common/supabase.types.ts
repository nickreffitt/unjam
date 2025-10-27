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
    PostgrestVersion: "13.0.5"
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
      codeshare_requests: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: Database["public"]["Enums"]["codeshare_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: Database["public"]["Enums"]["codeshare_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: Database["public"]["Enums"]["codeshare_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "codeshare_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codeshare_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      github_integrations: {
        Row: {
          created_at: string | null
          customer_id: string
          github_access_token: string
          github_user_id: string
          github_username: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          github_access_token: string
          github_user_id: string
          github_username: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          github_access_token?: string
          github_user_id?: string
          github_username?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "github_integrations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      project_repositories: {
        Row: {
          created_at: string | null
          customer_id: string
          external_platform: string
          external_project_id: string
          external_project_url: string
          github_owner: string
          github_repo: string
          github_repo_url: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          external_platform: string
          external_project_id: string
          external_project_url: string
          github_owner: string
          github_repo: string
          github_repo_url: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          external_platform?: string
          external_project_id?: string
          external_project_url?: string
          github_owner?: string
          github_repo?: string
          github_repo_url?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_repositories_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          notes: string | null
          rating: number
          rating_for: string
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          notes?: string | null
          rating: number
          rating_for: string
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          notes?: string | null
          rating?: number
          rating_for?: string
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ticket"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rating_for_fkey"
            columns: ["rating_for"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      repository_collaborators: {
        Row: {
          engineer_id: string
          github_username: string
          id: string
          invited_at: string | null
          removed_at: string | null
          repository_id: string
        }
        Insert: {
          engineer_id: string
          github_username: string
          id?: string
          invited_at?: string | null
          removed_at?: string | null
          repository_id: string
        }
        Update: {
          engineer_id?: string
          github_username?: string
          id?: string
          invited_at?: string | null
          removed_at?: string | null
          repository_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repository_collaborators_engineer_id_fkey"
            columns: ["engineer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repository_collaborators_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "project_repositories"
            referencedColumns: ["id"]
          },
        ]
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
      ticket_queue_messages: {
        Row: {
          created_at: string | null
          queue_message_id: number
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          queue_message_id: number
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          queue_message_id?: number
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_queue_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
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
      [_ in never]: never
    }
    Enums: {
      codeshare_status: "pending" | "accepted" | "rejected" | "expired"
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
      codeshare_status: ["pending", "accepted", "rejected", "expired"],
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
