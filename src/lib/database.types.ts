export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          after_values: Json | null;
          before_values: Json | null;
          created_at: string;
          id: string;
          reason: string | null;
          target_id: string | null;
          target_type: string;
          target_user_id: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          after_values?: Json | null;
          before_values?: Json | null;
          created_at?: string;
          id?: string;
          reason?: string | null;
          target_id?: string | null;
          target_type: string;
          target_user_id?: string | null;
          user_id: string;
        };
        Update: {
          action?: string;
          after_values?: Json | null;
          before_values?: Json | null;
          created_at?: string;
          id?: string;
          reason?: string | null;
          target_id?: string | null;
          target_type?: string;
          target_user_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_target_user_id_fkey';
            columns: ['target_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      feature_flags: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          is_enabled: boolean;
          is_public: boolean;
          key: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          is_enabled?: boolean;
          is_public?: boolean;
          key: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          is_enabled?: boolean;
          is_public?: boolean;
          key?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          age_check_method: Database['public']['Enums']['age_check_method'] | null;
          age_check_result: Database['public']['Enums']['age_check_result'];
          age_checked_at: string | null;
          birth_month: number | null;
          birth_year: number;
          created_at: string;
          deleted_at: string | null;
          id: string;
          locale: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          age_check_method?: Database['public']['Enums']['age_check_method'] | null;
          age_check_result?: Database['public']['Enums']['age_check_result'];
          age_checked_at?: string | null;
          birth_month?: number | null;
          birth_year: number;
          created_at?: string;
          deleted_at?: string | null;
          id: string;
          locale?: string;
          updated_at?: string;
        };
        Update: {
          age_check_method?: Database['public']['Enums']['age_check_method'] | null;
          age_check_result?: Database['public']['Enums']['age_check_result'];
          age_checked_at?: string | null;
          birth_month?: number | null;
          birth_year?: number;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          locale?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          is_public: boolean;
          key: string;
          updated_at: string;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          is_public?: boolean;
          key: string;
          updated_at?: string;
          value: NonNullable<Json>;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      staff_roles: {
        Row: {
          created_at: string;
          granted_by_user_id: string | null;
          id: string;
          role: Database['public']['Enums']['staff_role'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          granted_by_user_id?: string | null;
          id?: string;
          role: Database['public']['Enums']['staff_role'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          granted_by_user_id?: string | null;
          id?: string;
          role?: Database['public']['Enums']['staff_role'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_roles_granted_by_user_id_fkey';
            columns: ['granted_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_roles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      account_state: {
        Args: { target_user_id: string };
        Returns: Database['public']['Enums']['account_status'];
      };
      age_band: {
        Args: Record<PropertyKey, never>;
        Returns: Database['public']['Enums']['age_band'];
      };
      age_band_from_birth: {
        Args: {
          birth_month: number;
          birth_year: number;
          check_result: Database['public']['Enums']['age_check_result'];
          on_date: string;
        };
        Returns: Database['public']['Enums']['age_band'];
      };
      is_active_member: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_feature_enabled: { Args: { flag_key: string }; Returns: boolean };
      is_staff: {
        Args: { required_role?: Database['public']['Enums']['staff_role'] };
        Returns: boolean;
      };
      is_staff_session: { Args: Record<PropertyKey, never>; Returns: boolean };
      log_staff_action: {
        Args: {
          action_taken: string;
          affected_user_id?: string;
          reason_given?: string;
          target_row_id?: string;
          target_table: string;
          values_after?: Json;
          values_before?: Json;
        };
        Returns: string;
      };
      set_my_locale: { Args: { new_locale: string }; Returns: string };
    };
    Enums: {
      account_status:
        | 'active'
        | 'deleted'
        | 'email_unconfirmed'
        | 'age_check_pending'
        | 'age_check_failed'
        | 'awaiting_parental_consent'
        | 'minor_not_admitted';
      age_band: 'under_13' | '13_to_15' | '16_to_17' | '18_plus' | 'unknown';
      age_check_method: 'facial_estimation' | 'id_document' | 'manual';
      age_check_result: 'pending' | '13_or_over' | '18_or_over' | 'failed';
      reportable_type: 'profile';
      staff_role: 'owner' | 'admin' | 'moderator' | 'support' | 'content_editor';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_status: [
        'active',
        'deleted',
        'email_unconfirmed',
        'age_check_pending',
        'age_check_failed',
        'awaiting_parental_consent',
        'minor_not_admitted',
      ],
      age_band: ['under_13', '13_to_15', '16_to_17', '18_plus', 'unknown'],
      age_check_method: ['facial_estimation', 'id_document', 'manual'],
      age_check_result: ['pending', '13_or_over', '18_or_over', 'failed'],
      reportable_type: ['profile'],
      staff_role: ['owner', 'admin', 'moderator', 'support', 'content_editor'],
    },
  },
} as const;
