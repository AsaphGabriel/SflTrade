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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      nft_price_history: {
        Row: {
          collection: string
          floor_sfl: number
          floor_usd: number
          have_boost: number
          id: number
          last_sale_sfl: number | null
          name: string
          nft_id: number
          supply: number | null
          timestamp: string
        }
        Insert: {
          collection: string
          floor_sfl: number
          floor_usd: number
          have_boost?: number
          id?: never
          last_sale_sfl?: number | null
          name: string
          nft_id: number
          supply?: number | null
          timestamp?: string
        }
        Update: {
          collection?: string
          floor_sfl?: number
          floor_usd?: number
          have_boost?: number
          id?: never
          last_sale_sfl?: number | null
          name?: string
          nft_id?: number
          supply?: number | null
          timestamp?: string
        }
        Relationships: []
      }
      resource_price_history: {
        Row: {
          id: number
          price_sfl: number
          price_usd: number
          resource_id: string
          timestamp: string
        }
        Insert: {
          id?: never
          price_sfl: number
          price_usd: number
          resource_id: string
          timestamp?: string
        }
        Update: {
          id?: never
          price_sfl?: number
          price_usd?: number
          resource_id?: string
          timestamp?: string
        }
        Relationships: []
      }
      token_price_history: {
        Row: {
          id: number
          price_usd: number
          source: string
          timestamp: string
        }
        Insert: {
          id?: never
          price_usd: number
          source?: string
          timestamp?: string
        }
        Update: {
          id?: never
          price_usd?: number
          source?: string
          timestamp?: string
        }
        Relationships: []
      }
      user_portfolios: {
        Row: {
          avg_price_sfl: number
          avg_token_price_usd: number
          id: string
          quantity: number
          resource_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_price_sfl?: number
          avg_token_price_usd?: number
          id?: string
          quantity?: number
          resource_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_price_sfl?: number
          avg_token_price_usd?: number
          id?: string
          quantity?: number
          resource_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          island_tax: number
          preferred_currency: string
          shrine_active: boolean
          updated_at: string
          user_id: string
          vip_active: boolean
        }
        Insert: {
          island_tax?: number
          preferred_currency?: string
          shrine_active?: boolean
          updated_at?: string
          user_id: string
          vip_active?: boolean
        }
        Update: {
          island_tax?: number
          preferred_currency?: string
          shrine_active?: boolean
          updated_at?: string
          user_id?: string
          vip_active?: boolean
        }
        Relationships: []
      }
      user_transactions: {
        Row: {
          created_at: string
          id: string
          price_sfl: number
          quantity: number
          resource_id: string
          token_price_usd_at_purchase: number
          total_sfl: number
          total_usd: number
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          price_sfl: number
          quantity: number
          resource_id: string
          token_price_usd_at_purchase: number
          total_sfl: number
          total_usd: number
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          price_sfl?: number
          quantity?: number
          resource_id?: string
          token_price_usd_at_purchase?: number
          total_sfl?: number
          total_usd?: number
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_nft_daily_metrics: {
        Row: {
          avg_floor_sfl: number | null
          avg_floor_usd: number | null
          collection: string | null
          day: string | null
          max_floor_sfl: number | null
          min_floor_sfl: number | null
          name: string | null
          nft_id: number | null
          records_count: number | null
          sma_30d_sfl: number | null
          sma_7d_sfl: number | null
        }
        Relationships: []
      }
      v_resource_daily_metrics: {
        Row: {
          avg_price_sfl: number | null
          avg_price_usd: number | null
          day: string | null
          max_price_sfl: number | null
          min_price_sfl: number | null
          records_count: number | null
          resource_id: string | null
          sma_30d_sfl: number | null
          sma_7d_sfl: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      clean_old_price_history: { Args: never; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
