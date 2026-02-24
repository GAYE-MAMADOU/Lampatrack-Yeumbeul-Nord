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
      lampadaire_history: {
        Row: {
          action: string
          created_at: string
          id: string
          intervention_type: string | null
          lampadaire_id: string
          new_status: Database["public"]["Enums"]["lampadaire_status"] | null
          performed_by: string | null
          previous_status:
            | Database["public"]["Enums"]["lampadaire_status"]
            | null
          technician_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          intervention_type?: string | null
          lampadaire_id: string
          new_status?: Database["public"]["Enums"]["lampadaire_status"] | null
          performed_by?: string | null
          previous_status?:
            | Database["public"]["Enums"]["lampadaire_status"]
            | null
          technician_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          intervention_type?: string | null
          lampadaire_id?: string
          new_status?: Database["public"]["Enums"]["lampadaire_status"] | null
          performed_by?: string | null
          previous_status?:
            | Database["public"]["Enums"]["lampadaire_status"]
            | null
          technician_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lampadaire_history_lampadaire_id_fkey"
            columns: ["lampadaire_id"]
            isOneToOne: false
            referencedRelation: "lampadaires"
            referencedColumns: ["id"]
          },
        ]
      }
      lampadaires: {
        Row: {
          created_at: string
          id: string
          identifier: string
          latitude: number
          longitude: number
          status: Database["public"]["Enums"]["lampadaire_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          latitude: number
          longitude: number
          status?: Database["public"]["Enums"]["lampadaire_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          latitude?: number
          longitude?: number
          status?: Database["public"]["Enums"]["lampadaire_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          banned_at: string | null
          banned_reason: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_banned: boolean
          user_id: string
        }
        Insert: {
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean
          user_id: string
        }
        Update: {
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      signalements: {
        Row: {
          admin_notes: string | null
          cause: string
          created_at: string
          description: string | null
          id: string
          lampadaire_id: string
          photo_url: string
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          cause: string
          created_at?: string
          description?: string | null
          id?: string
          lampadaire_id: string
          photo_url: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          cause?: string
          created_at?: string
          description?: string | null
          id?: string
          lampadaire_id?: string
          photo_url?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signalements_lampadaire_id_fkey"
            columns: ["lampadaire_id"]
            isOneToOne: false
            referencedRelation: "lampadaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signalements_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_lampadaire_history_secure: {
        Args: never
        Returns: {
          action: string
          created_at: string
          id: string
          intervention_type: string
          lampadaire_id: string
          new_status: Database["public"]["Enums"]["lampadaire_status"]
          performed_by: string
          previous_status: Database["public"]["Enums"]["lampadaire_status"]
          technician_name: string
        }[]
      }
      get_signalements_secure: {
        Args: never
        Returns: {
          admin_notes: string
          cause: string
          created_at: string
          description: string
          id: string
          lampadaire_id: string
          photo_url: string
          processed_at: string
          processed_by: string
          status: Database["public"]["Enums"]["report_status"]
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_owns_report_photo: {
        Args: { object_name: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      lampadaire_status: "functional" | "damaged"
      report_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "user"],
      lampadaire_status: ["functional", "damaged"],
      report_status: ["pending", "approved", "rejected"],
    },
  },
} as const
