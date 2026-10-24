export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor: Database['public']['Enums']['audit_actor'];
          after_values: Json | null;
          before_values: Json | null;
          created_at: string;
          id: string;
          reason: string | null;
          target_id: string | null;
          target_type: string;
          target_user_id: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor?: Database['public']['Enums']['audit_actor'];
          after_values?: Json | null;
          before_values?: Json | null;
          created_at?: string;
          id?: string;
          reason?: string | null;
          target_id?: string | null;
          target_type: string;
          target_user_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          actor?: Database['public']['Enums']['audit_actor'];
          after_values?: Json | null;
          before_values?: Json | null;
          created_at?: string;
          id?: string;
          reason?: string | null;
          target_id?: string | null;
          target_type?: string;
          target_user_id?: string | null;
          user_id?: string | null;
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
      banned_email_hashes: {
        Row: {
          created_at: string;
          email_hash: string;
          id: string;
          sanction_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email_hash: string;
          id?: string;
          sanction_id: string;
        };
        Update: {
          created_at?: string;
          email_hash?: string;
          id?: string;
          sanction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'banned_email_hashes_sanction_id_fkey';
            columns: ['sanction_id'];
            isOneToOne: false;
            referencedRelation: 'sanctions';
            referencedColumns: ['id'];
          },
        ];
      };
      case_actions: {
        Row: {
          action: Database['public']['Enums']['moderation_action'];
          case_id: string;
          created_at: string;
          id: string;
          note: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          action: Database['public']['Enums']['moderation_action'];
          case_id: string;
          created_at?: string;
          id?: string;
          note: string;
          user_id: string;
        };
        Update: {
          action?: Database['public']['Enums']['moderation_action'];
          case_id?: string;
          created_at?: string;
          id?: string;
          note?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'case_actions_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'case_actions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      cases: {
        Row: {
          created_at: string;
          deadline_at: string;
          decided_at: string | null;
          decided_by_user_id: string | null;
          decision: Database['public']['Enums']['moderation_action'] | null;
          id: string;
          is_safeguarding: boolean;
          item_id: string;
          item_type: Database['public']['Enums']['reportable_type'];
          received_at: string;
          reference: string;
          report_count: number;
          reporter_under_18: boolean;
          source: Database['public']['Enums']['case_source'];
          status: Database['public']['Enums']['case_status'];
          tier: Database['public']['Enums']['case_tier'];
          top_reason: Database['public']['Enums']['report_reason'] | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          deadline_at: string;
          decided_at?: string | null;
          decided_by_user_id?: string | null;
          decision?: Database['public']['Enums']['moderation_action'] | null;
          id?: string;
          is_safeguarding?: boolean;
          item_id: string;
          item_type: Database['public']['Enums']['reportable_type'];
          received_at?: string;
          reference: string;
          report_count?: number;
          reporter_under_18?: boolean;
          source: Database['public']['Enums']['case_source'];
          status?: Database['public']['Enums']['case_status'];
          tier: Database['public']['Enums']['case_tier'];
          top_reason?: Database['public']['Enums']['report_reason'] | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          deadline_at?: string;
          decided_at?: string | null;
          decided_by_user_id?: string | null;
          decision?: Database['public']['Enums']['moderation_action'] | null;
          id?: string;
          is_safeguarding?: boolean;
          item_id?: string;
          item_type?: Database['public']['Enums']['reportable_type'];
          received_at?: string;
          reference?: string;
          report_count?: number;
          reporter_under_18?: boolean;
          source?: Database['public']['Enums']['case_source'];
          status?: Database['public']['Enums']['case_status'];
          tier?: Database['public']['Enums']['case_tier'];
          top_reason?: Database['public']['Enums']['report_reason'] | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cases_decided_by_user_id_fkey';
            columns: ['decided_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cases_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      client_errors: {
        Row: {
          app_version: string;
          browser_family: string;
          created_at: string;
          error_message: string;
          error_name: string;
          id: string;
          route_path: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          app_version: string;
          browser_family: string;
          created_at?: string;
          error_message: string;
          error_name: string;
          id?: string;
          route_path: string;
          updated_at?: string;
        };
        Update: {
          app_version?: string;
          browser_family?: string;
          created_at?: string;
          error_message?: string;
          error_name?: string;
          id?: string;
          route_path?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      confusable_characters: {
        Row: {
          created_at: string;
          id: string;
          prototype_text: string;
          source_text: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          prototype_text: string;
          source_text: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          prototype_text?: string;
          source_text?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      consents: {
        Row: {
          accepted_at: string;
          created_at: string;
          id: string;
          legal_document_version_id: string;
          method: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string;
          created_at?: string;
          id?: string;
          legal_document_version_id: string;
          method: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accepted_at?: string;
          created_at?: string;
          id?: string;
          legal_document_version_id?: string;
          method?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'consents_legal_document_version_id_fkey';
            columns: ['legal_document_version_id'];
            isOneToOne: false;
            referencedRelation: 'legal_document_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'consents_user_id_fkey';
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
      invites: {
        Row: {
          code_hash: string;
          created_at: string;
          expires_at: string;
          id: string;
          max_uses: number;
          note: string | null;
          purpose: string;
          revoked_at: string | null;
          space_id: string | null;
          updated_at: string;
          use_count: number;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          code_hash: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          max_uses?: number;
          note?: string | null;
          purpose?: string;
          revoked_at?: string | null;
          space_id?: string | null;
          updated_at?: string;
          use_count?: number;
          user_id: string;
        };
        Update: {
          code_hash?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          max_uses?: number;
          note?: string | null;
          purpose?: string;
          revoked_at?: string | null;
          space_id?: string | null;
          updated_at?: string;
          use_count?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invites_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      legal_document_versions: {
        Row: {
          body_markdown: string;
          change_summary: string | null;
          created_at: string;
          document_id: string;
          id: string;
          is_lawyer_reviewed: boolean;
          is_material: boolean;
          language: string;
          published_at: string;
          title: string;
          updated_at: string;
          version_label: string;
        };
        ComputedFields: never;
        Insert: {
          body_markdown: string;
          change_summary?: string | null;
          created_at?: string;
          document_id: string;
          id?: string;
          is_lawyer_reviewed?: boolean;
          is_material?: boolean;
          language: string;
          published_at: string;
          title: string;
          updated_at?: string;
          version_label: string;
        };
        Update: {
          body_markdown?: string;
          change_summary?: string | null;
          created_at?: string;
          document_id?: string;
          id?: string;
          is_lawyer_reviewed?: boolean;
          is_material?: boolean;
          language?: string;
          published_at?: string;
          title?: string;
          updated_at?: string;
          version_label?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'legal_document_versions_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'legal_documents';
            referencedColumns: ['id'];
          },
        ];
      };
      legal_documents: {
        Row: {
          created_at: string;
          id: string;
          needs_acceptance: boolean;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          needs_acceptance?: boolean;
          slug: string;
          sort_order: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          needs_acceptance?: boolean;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      markets: {
        Row: {
          country_code: string;
          created_at: string;
          id: string;
          is_open: boolean;
          languages: string[];
          minimum_age: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          country_code: string;
          created_at?: string;
          id?: string;
          is_open?: boolean;
          languages: string[];
          minimum_age?: number;
          updated_at?: string;
        };
        Update: {
          country_code?: string;
          created_at?: string;
          id?: string;
          is_open?: boolean;
          languages?: string[];
          minimum_age?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      moderated_items: {
        Row: {
          case_id: string | null;
          created_at: string;
          id: string;
          item_id: string;
          item_type: Database['public']['Enums']['reportable_type'];
          moderated_by_user_id: string;
          note: string;
          restore_reason: string | null;
          restored_at: string | null;
          restored_by_user_id: string | null;
          state: Database['public']['Enums']['moderated_state'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          case_id?: string | null;
          created_at?: string;
          id?: string;
          item_id: string;
          item_type: Database['public']['Enums']['reportable_type'];
          moderated_by_user_id: string;
          note: string;
          restore_reason?: string | null;
          restored_at?: string | null;
          restored_by_user_id?: string | null;
          state: Database['public']['Enums']['moderated_state'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          case_id?: string | null;
          created_at?: string;
          id?: string;
          item_id?: string;
          item_type?: Database['public']['Enums']['reportable_type'];
          moderated_by_user_id?: string;
          note?: string;
          restore_reason?: string | null;
          restored_at?: string | null;
          restored_by_user_id?: string | null;
          state?: Database['public']['Enums']['moderated_state'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'moderated_items_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moderated_items_moderated_by_user_id_fkey';
            columns: ['moderated_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moderated_items_restored_by_user_id_fkey';
            columns: ['restored_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moderated_items_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          age_check_method: Database['public']['Enums']['age_check_method'] | null;
          age_check_result: Database['public']['Enums']['age_check_result'];
          age_checked_at: string | null;
          birth_month: number | null;
          birth_year: number;
          country_code: string | null;
          created_at: string;
          deleted_at: string | null;
          handle: string | null;
          handle_changed_at: string | null;
          handle_skeleton: string | null;
          handle_slug: string | null;
          id: string;
          locale: string;
          pen_name: string | null;
          pen_name_changed_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          age_check_method?: Database['public']['Enums']['age_check_method'] | null;
          age_check_result?: Database['public']['Enums']['age_check_result'];
          age_checked_at?: string | null;
          birth_month?: number | null;
          birth_year: number;
          country_code?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          handle?: string | null;
          handle_changed_at?: string | null;
          handle_skeleton?: string | null;
          handle_slug?: string | null;
          id: string;
          locale?: string;
          pen_name?: string | null;
          pen_name_changed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          age_check_method?: Database['public']['Enums']['age_check_method'] | null;
          age_check_result?: Database['public']['Enums']['age_check_result'];
          age_checked_at?: string | null;
          birth_month?: number | null;
          birth_year?: number;
          country_code?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          handle?: string | null;
          handle_changed_at?: string | null;
          handle_skeleton?: string | null;
          handle_slug?: string | null;
          id?: string;
          locale?: string;
          pen_name?: string | null;
          pen_name_changed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      report_reason_tiers: {
        Row: {
          created_at: string;
          id: string;
          is_safeguarding: boolean;
          reason: Database['public']['Enums']['report_reason'];
          tier: Database['public']['Enums']['case_tier'];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_safeguarding?: boolean;
          reason: Database['public']['Enums']['report_reason'];
          tier: Database['public']['Enums']['case_tier'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_safeguarding?: boolean;
          reason?: Database['public']['Enums']['report_reason'];
          tier?: Database['public']['Enums']['case_tier'];
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          case_id: string | null;
          closed_at: string | null;
          created_at: string;
          details: string | null;
          id: string;
          item_id: string;
          item_type: Database['public']['Enums']['reportable_type'];
          reason: Database['public']['Enums']['report_reason'];
          reference: string;
          reported_user_id: string;
          reporter_age_band: Database['public']['Enums']['age_band'];
          source: string;
          updated_at: string;
          user_id: string;
          attach_report_to_case: string | null;
        };
        ComputedFields: 'attach_report_to_case';
        Insert: {
          case_id?: string | null;
          closed_at?: string | null;
          created_at?: string;
          details?: string | null;
          id?: string;
          item_id: string;
          item_type: Database['public']['Enums']['reportable_type'];
          reason: Database['public']['Enums']['report_reason'];
          reference: string;
          reported_user_id: string;
          reporter_age_band: Database['public']['Enums']['age_band'];
          source?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          case_id?: string | null;
          closed_at?: string | null;
          created_at?: string;
          details?: string | null;
          id?: string;
          item_id?: string;
          item_type?: Database['public']['Enums']['reportable_type'];
          reason?: Database['public']['Enums']['report_reason'];
          reference?: string;
          reported_user_id?: string;
          reporter_age_band?: Database['public']['Enums']['age_band'];
          source?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_reported_user_id_fkey';
            columns: ['reported_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reserved_names: {
        Row: {
          created_at: string;
          folded_name: string;
          id: string;
          match_rule: string;
          name: string;
          reason: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          folded_name?: string;
          id?: string;
          match_rule?: string;
          name: string;
          reason: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          folded_name?: string;
          id?: string;
          match_rule?: string;
          name?: string;
          reason?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      safety_contact_gaps: {
        Row: {
          country_code: string;
          first_seen_at: string;
          id: string;
          last_seen_at: string;
          times_seen: number;
        };
        ComputedFields: never;
        Insert: {
          country_code: string;
          first_seen_at?: string;
          id?: string;
          last_seen_at?: string;
          times_seen?: number;
        };
        Update: {
          country_code?: string;
          first_seen_at?: string;
          id?: string;
          last_seen_at?: string;
          times_seen?: number;
        };
        Relationships: [];
      };
      safety_contacts: {
        Row: {
          checked_by: string;
          confidence: string;
          country_code: string;
          created_at: string;
          id: string;
          kind: Database['public']['Enums']['safety_contact_kind'];
          label: string;
          last_checked_on: string;
          link: string | null;
          note: string | null;
          opening_hours: string | null;
          phone_number: string | null;
          position: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          checked_by?: string;
          confidence: string;
          country_code: string;
          created_at?: string;
          id?: string;
          kind: Database['public']['Enums']['safety_contact_kind'];
          label: string;
          last_checked_on: string;
          link?: string | null;
          note?: string | null;
          opening_hours?: string | null;
          phone_number?: string | null;
          position: number;
          updated_at?: string;
        };
        Update: {
          checked_by?: string;
          confidence?: string;
          country_code?: string;
          created_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['safety_contact_kind'];
          label?: string;
          last_checked_on?: string;
          link?: string | null;
          note?: string | null;
          opening_hours?: string | null;
          phone_number?: string | null;
          position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      sanctions: {
        Row: {
          applied_by_user_id: string;
          case_id: string | null;
          created_at: string;
          ends_at: string | null;
          id: string;
          kind: Database['public']['Enums']['sanction_kind'];
          lift_reason: string | null;
          lifted_at: string | null;
          lifted_by_user_id: string | null;
          note: string;
          starts_at: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          applied_by_user_id: string;
          case_id?: string | null;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          kind: Database['public']['Enums']['sanction_kind'];
          lift_reason?: string | null;
          lifted_at?: string | null;
          lifted_by_user_id?: string | null;
          note: string;
          starts_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          applied_by_user_id?: string;
          case_id?: string | null;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['sanction_kind'];
          lift_reason?: string | null;
          lifted_at?: string | null;
          lifted_by_user_id?: string | null;
          note?: string;
          starts_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sanctions_applied_by_user_id_fkey';
            columns: ['applied_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sanctions_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sanctions_lifted_by_user_id_fkey';
            columns: ['lifted_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sanctions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
      sign_in_failures: {
        Row: {
          created_at: string;
          email_hash: string;
          failed_at: string;
          id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email_hash: string;
          failed_at?: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email_hash?: string;
          failed_at?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff_permissions: {
        Row: {
          created_at: string;
          granted_by_user_id: string | null;
          id: string;
          permission: Database['public']['Enums']['staff_permission'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          granted_by_user_id?: string | null;
          id?: string;
          permission: Database['public']['Enums']['staff_permission'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          granted_by_user_id?: string | null;
          id?: string;
          permission?: Database['public']['Enums']['staff_permission'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_permissions_granted_by_user_id_fkey';
            columns: ['granted_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_permissions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      staff_role_areas: {
        Row: {
          access: string;
          area: string;
          created_at: string;
          id: string;
          required_permission: Database['public']['Enums']['staff_permission'] | null;
          role: Database['public']['Enums']['staff_role'];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          access: string;
          area: string;
          created_at?: string;
          id?: string;
          required_permission?: Database['public']['Enums']['staff_permission'] | null;
          role: Database['public']['Enums']['staff_role'];
          updated_at?: string;
        };
        Update: {
          access?: string;
          area?: string;
          created_at?: string;
          id?: string;
          required_permission?: Database['public']['Enums']['staff_permission'] | null;
          role?: Database['public']['Enums']['staff_role'];
          updated_at?: string;
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
      username_approvals: {
        Row: {
          approved_by_user_id: string;
          approved_name: string;
          approved_skeleton: string;
          created_at: string;
          id: string;
          name_kind: string;
          reason: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          approved_by_user_id: string;
          approved_name: string;
          approved_skeleton: string;
          created_at?: string;
          id?: string;
          name_kind: string;
          reason: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          approved_by_user_id?: string;
          approved_name?: string;
          approved_skeleton?: string;
          created_at?: string;
          id?: string;
          name_kind?: string;
          reason?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'username_approvals_approved_by_user_id_fkey';
            columns: ['approved_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'username_approvals_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      username_word_lists: {
        Row: {
          created_at: string;
          folded_word: string;
          id: string;
          language: string;
          match_rule: string;
          updated_at: string;
          word: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          folded_word?: string;
          id?: string;
          language: string;
          match_rule?: string;
          updated_at?: string;
          word: string;
        };
        Update: {
          created_at?: string;
          folded_word?: string;
          id?: string;
          language?: string;
          match_rule?: string;
          updated_at?: string;
          word?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_current_legal_versions: {
        Args: { document_slugs: string[]; reading_language?: string };
        Returns: number;
      };
      account_state: {
        Args: { target_user_id: string };
        Returns: Database['public']['Enums']['account_status'];
      };
      active_sanction: {
        Args: { target_user_id: string; wanted_kind: Database['public']['Enums']['sanction_kind'] };
        Returns: {
          applied_by_user_id: string;
          case_id: string | null;
          created_at: string;
          ends_at: string | null;
          id: string;
          kind: Database['public']['Enums']['sanction_kind'];
          lift_reason: string | null;
          lifted_at: string | null;
          lifted_by_user_id: string | null;
          note: string;
          starts_at: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'sanctions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_account_sanctions: {
        Args: { target_user_id: string };
        Returns: {
          applied_by_handle: string;
          case_reference: string;
          ends_at: string;
          id: string;
          is_live: boolean;
          kind: Database['public']['Enums']['sanction_kind'];
          lifted_at: string;
          note: string;
          starts_at: string;
        }[];
      };
      admin_apply_sanction: {
        Args: {
          days?: number;
          note_text?: string;
          source_case_id?: string;
          target_user_id: string;
          wanted_kind: Database['public']['Enums']['sanction_kind'];
        };
        Returns: string;
      };
      admin_approve_username: {
        Args: {
          approved_name: string;
          name_kind: string;
          reason_given: string;
          target_user_id: string;
        };
        Returns: string;
      };
      admin_case_actions: {
        Args: { target_case_id: string };
        Returns: {
          action: Database['public']['Enums']['moderation_action'];
          created_at: string;
          note: string;
          staff_handle: string;
        }[];
      };
      admin_case_reports: {
        Args: { target_case_id: string };
        Returns: {
          created_at: string;
          details: string;
          reason: Database['public']['Enums']['report_reason'];
          reference: string;
          reporter_age_band: Database['public']['Enums']['age_band'];
          reporter_handle: string;
        }[];
      };
      admin_create_invite: {
        Args: { admits?: number; private_note?: string; valid_days?: number };
        Returns: {
          code: string;
          expires_at: string;
          invite_id: string;
        }[];
      };
      admin_decide_case: {
        Args: {
          chosen_action: Database['public']['Enums']['moderation_action'];
          note_text: string;
          suspension_days?: number;
          target_case_id: string;
        };
        Returns: boolean;
      };
      admin_export_audit_log: {
        Args: {
          action_prefix?: string;
          from_date?: string;
          staff_handle?: string;
          target_user_id?: string;
          to_date?: string;
        };
        Returns: Database['public']['CompositeTypes']['audit_log_row'][];
        SetofOptions: {
          from: '*';
          to: 'audit_log_row';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      admin_grant_role: {
        Args: {
          granted_role: Database['public']['Enums']['staff_role'];
          reason_given: string;
          target_user_id: string;
        };
        Returns: boolean;
      };
      admin_lift_sanction: {
        Args: { reason_given: string; target_sanction_id: string };
        Returns: boolean;
      };
      admin_list_client_errors: {
        Args: { max_rows?: number; since?: string };
        Returns: {
          app_version: string;
          browser_family: string;
          created_at: string;
          error_message: string;
          error_name: string;
          id: string;
          route_path: string;
        }[];
      };
      admin_list_invites: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          expires_at: string;
          id: string;
          made_by_handle: string;
          max_uses: number;
          note: string;
          revoked_at: string;
          status: string;
          use_count: number;
        }[];
      };
      admin_list_staff: {
        Args: Record<PropertyKey, never>;
        Returns: {
          handle: string;
          permissions: Database['public']['Enums']['staff_permission'][];
          roles: Database['public']['Enums']['staff_role'][];
          user_id: string;
        }[];
      };
      admin_moderation_queue: {
        Args: {
          case_id?: string;
          source_filter?: Database['public']['Enums']['case_source'];
          status_filter?: Database['public']['Enums']['case_status'];
          tier_filter?: Database['public']['Enums']['case_tier'];
          under_18_filter?: boolean;
        };
        Returns: Database['public']['CompositeTypes']['moderation_queue_row'][];
        SetofOptions: {
          from: '*';
          to: 'moderation_queue_row';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      admin_pause_reporting: {
        Args: { note_text?: string; reporter_handle: string; source_case_id?: string };
        Returns: string;
      };
      admin_remove_role: {
        Args: {
          reason_given: string;
          removed_role: Database['public']['Enums']['staff_role'];
          target_user_id: string;
        };
        Returns: boolean;
      };
      admin_restore_item: {
        Args: { reason_given: string; target_item_id: string };
        Returns: boolean;
      };
      admin_revoke_invite: {
        Args: { reason_given: string; target_invite_id: string };
        Returns: boolean;
      };
      admin_search_audit_log: {
        Args: {
          action_prefix?: string;
          from_date?: string;
          page_number?: number;
          page_size?: number;
          staff_handle?: string;
          target_user_id?: string;
          to_date?: string;
        };
        Returns: Database['public']['CompositeTypes']['audit_log_row'][];
        SetofOptions: {
          from: '*';
          to: 'audit_log_row';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      admin_set_permission: {
        Args: {
          changed_permission: Database['public']['Enums']['staff_permission'];
          reason_given: string;
          should_hold: boolean;
          target_user_id: string;
        };
        Returns: boolean;
      };
      admin_user_id_for_handle: { Args: { wanted_handle: string }; Returns: string };
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
      attach_report_to_case: {
        Args: {
          new_report: Omit<
            Database['public']['Tables']['reports']['Row'],
            Database['public']['Tables']['reports']['ComputedFields']
          >;
        };
        Returns: string;
      };
      audit_log_rows: {
        Args: {
          action_prefix: string;
          from_date: string;
          row_limit: number;
          row_offset: number;
          staff_handle: string;
          target_user_id: string;
          to_date: string;
        };
        Returns: Database['public']['CompositeTypes']['audit_log_row'][];
        SetofOptions: {
          from: '*';
          to: 'audit_log_row';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      banned_email_hash: { Args: { email: string }; Returns: string };
      birth_year_needs_month: { Args: { birth_year: number; on_date: string }; Returns: boolean };
      bootstrap_first_owner: { Args: { target_user_id: string }; Returns: undefined };
      change_is_too_soon: {
        Args: { last_changed_at: string; setting_key: string };
        Returns: boolean;
      };
      check_handle: { Args: { candidate: string }; Returns: string };
      check_invite: { Args: { code: string }; Returns: string };
      check_pen_name: { Args: { candidate: string }; Returns: string };
      clear_my_sign_in_failures: { Args: Record<PropertyKey, never>; Returns: undefined };
      display_name: { Args: { handle: string; pen_name: string }; Returns: string };
      end_my_session: { Args: { target_session_id: string }; Returns: boolean };
      fold_look_alike_characters: { Args: { name: string }; Returns: string };
      generate_invite_code: { Args: Record<PropertyKey, never>; Returns: string };
      has_invisible_characters: { Args: { name: string }; Returns: boolean };
      hash_email: { Args: { email: string }; Returns: string };
      invite_code_hash: { Args: { code: string }; Returns: string };
      is_active_member: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_email_banned: { Args: { email: string }; Returns: boolean };
      is_feature_enabled: { Args: { flag_key: string }; Returns: boolean };
      is_moderated_away: {
        Args: { item_id: string; item_type: Database['public']['Enums']['reportable_type'] };
        Returns: boolean;
      };
      is_staff: {
        Args: { required_role?: Database['public']['Enums']['staff_role'] };
        Returns: boolean;
      };
      is_staff_session: { Args: Record<PropertyKey, never>; Returns: boolean };
      latest_material_legal_version: { Args: { target_document_id: string }; Returns: string };
      legal_documents_to_accept: {
        Args: { target_user_id: string };
        Returns: {
          created_at: string;
          id: string;
          needs_acceptance: boolean;
          slug: string;
          sort_order: number;
          updated_at: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'legal_documents';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      list_my_sessions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          is_current: boolean;
          last_active_at: string;
          session_id: string;
          started_at: string;
          user_agent: string;
        }[];
      };
      log_account_change: {
        Args: {
          action_taken: string;
          target_user_id: string;
          values_after: Json;
          values_before: Json;
        };
        Returns: undefined;
      };
      log_sensitive_read: {
        Args: {
          affected_user_id?: string;
          read_kind: string;
          target_row_id?: string;
          target_table: string;
        };
        Returns: string;
      };
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
      may_see_case: { Args: { case_is_safeguarding: boolean }; Returns: boolean };
      moderate_item: {
        Args: {
          item_id: string;
          item_type: Database['public']['Enums']['reportable_type'];
          note_text: string;
          owner_user_id: string;
          source_case_id: string;
          wanted_state: Database['public']['Enums']['moderated_state'];
        };
        Returns: string;
      };
      moderated_state_of: {
        Args: { item_id: string; item_type: Database['public']['Enums']['reportable_type'] };
        Returns: Database['public']['Enums']['moderated_state'];
      };
      my_legal_documents_to_accept: {
        Args: Record<PropertyKey, never>;
        Returns: {
          change_summary: string;
          document_slug: string;
          version_label: string;
        }[];
      };
      my_sanctions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          ends_at: string;
          kind: Database['public']['Enums']['sanction_kind'];
          starts_at: string;
        }[];
      };
      my_staff_areas: {
        Args: Record<PropertyKey, never>;
        Returns: {
          access: string;
          area: string;
        }[];
      };
      name_has_listed_word: { Args: { name: string }; Returns: boolean };
      name_is_approved: {
        Args: { name: string; name_kind: string; target_user_id: string };
        Returns: boolean;
      };
      name_matching_words: { Args: { name: string }; Returns: string[] };
      name_reserved_reason: { Args: { name: string }; Returns: string };
      name_slug: { Args: { name: string }; Returns: string };
      name_word_check: {
        Args: { name: string; name_kind: string; target_user_id: string };
        Returns: string;
      };
      needs_legal_acceptance: { Args: { target_user_id: string }; Returns: boolean };
      normalise_invite_code: { Args: { code: string }; Returns: string };
      normalise_pen_name: { Args: { typed_name: string }; Returns: string };
      note_safety_contact_gap: { Args: { wanted_country_code: string }; Returns: undefined };
      purge_old_client_errors: { Args: Record<PropertyKey, never>; Returns: number };
      record_sign_in_failure: { Args: { email_hash: string }; Returns: string };
      record_sign_up_consent: {
        Args: { accepted_version_id: string; document_slug: string; new_user_id: string };
        Returns: undefined;
      };
      report_client_error: {
        Args: {
          app_version: string;
          browser_family: string;
          error_message: string;
          error_name: string;
          route_path: string;
        };
        Returns: string;
      };
      report_item: {
        Args: {
          details?: string;
          item_reference: string;
          item_type: Database['public']['Enums']['reportable_type'];
          reason: Database['public']['Enums']['report_reason'];
        };
        Returns: {
          received_at: string;
          report_reference: string;
        }[];
      };
      reportable_item_owner: {
        Args: { item_reference: string; item_type: Database['public']['Enums']['reportable_type'] };
        Returns: {
          item_id: string;
          owner_user_id: string;
        }[];
      };
      reportable_item_summary: {
        Args: { item_id: string; item_type: Database['public']['Enums']['reportable_type'] };
        Returns: string;
      };
      require_role_change_allowed: {
        Args: { reason_given: string; target_user_id: string };
        Returns: undefined;
      };
      require_role_in_reach: {
        Args: { changed_role: Database['public']['Enums']['staff_role'] };
        Returns: undefined;
      };
      sanction_end: {
        Args: { days: number; wanted_kind: Database['public']['Enums']['sanction_kind'] };
        Returns: string;
      };
      scrub_error_text: { Args: { max_length: number; raw_text: string }; Returns: string };
      scrub_route_path: { Args: { raw_path: string }; Returns: string };
      set_my_handle: { Args: { new_handle: string }; Returns: string };
      set_my_locale: { Args: { new_locale: string }; Returns: string };
      set_my_pen_name: { Args: { new_pen_name: string }; Returns: string };
      setting_value: { Args: { setting_key: string }; Returns: Json };
      sign_in_pause_until: { Args: { email_hash: string }; Returns: string };
      sign_out_everywhere: { Args: { target_user_id: string }; Returns: undefined };
      sign_up_age_outcome: { Args: { birth_month?: number; birth_year: number }; Returns: string };
      sign_up_birth_month: { Args: { birth_year: number; sign_up_data: Json }; Returns: number };
      sign_up_birth_year: { Args: { sign_up_data: Json }; Returns: number };
      sign_up_market_outcome: {
        Args: { birth_month?: number; birth_year: number; country_code: string };
        Returns: string;
      };
      staff_may: { Args: { target_area: string; wanted_access?: string }; Returns: boolean };
      staff_session_started_at: { Args: Record<PropertyKey, never>; Returns: string };
      staff_signed_in_recently: { Args: Record<PropertyKey, never>; Returns: boolean };
      strip_combining_marks: { Args: { name: string }; Returns: string };
      tier_hours: {
        Args: { target_tier: Database['public']['Enums']['case_tier'] };
        Returns: number;
      };
      tier_rank: {
        Args: { target_tier: Database['public']['Enums']['case_tier'] };
        Returns: number;
      };
      use_platform_invite: { Args: { code: string; new_user_id: string }; Returns: undefined };
      username_skeleton: { Args: { name: string }; Returns: string };
      verified_signup_country: { Args: { token: string }; Returns: string };
    };
    Enums: {
      account_status:
        | 'active'
        | 'deleted'
        | 'email_unconfirmed'
        | 'age_check_pending'
        | 'age_check_failed'
        | 'awaiting_parental_consent'
        | 'minor_not_admitted'
        | 'handle_missing'
        | 'staff_account'
        | 'legal_acceptance_required'
        | 'suspended'
        | 'banned';
      age_band: 'under_13' | '13_to_15' | '16_to_17' | '18_plus' | 'unknown';
      age_check_method: 'facial_estimation' | 'id_document' | 'manual';
      age_check_result: 'pending' | '13_or_over' | '18_or_over' | 'failed';
      audit_actor: 'person' | 'system';
      case_source: 'report' | 'authority_order' | 'picture_check';
      case_status: 'open' | 'decided';
      case_tier: 'one_hour' | 'same_day' | 'two_days' | 'seven_days';
      moderated_state: 'hidden' | 'removed';
      moderation_action: 'no_action' | 'hide' | 'remove' | 'restrict' | 'warn' | 'suspend' | 'ban';
      report_reason:
        | 'illegal_content'
        | 'harassment'
        | 'insults'
        | 'self_harm'
        | 'child_sexual_content'
        | 'threat_to_minor'
        | 'terrorism'
        | 'hate'
        | 'spam'
        | 'copyright'
        | 'copied_published_work'
        | 'undisclosed_ai'
        | 'other';
      reportable_type: 'profile';
      safety_contact_kind:
        | 'emergency'
        | 'child_helpline'
        | 'csam_hotline'
        | 'crisis_youth'
        | 'police_online_child'
        | 'regulator';
      sanction_kind: 'warning' | 'suspension' | 'ban' | 'reporting_pause';
      staff_permission: 'safeguarding' | 'teacher_checks' | 'on_call';
      staff_role: 'owner' | 'admin' | 'moderator' | 'support' | 'content_editor';
    };
    CompositeTypes: {
      audit_log_row: {
        id: string | null;
        created_at: string | null;
        staff_handle: string | null;
        action: string | null;
        target_type: string | null;
        target_id: string | null;
        target_handle: string | null;
        target_user_id_short: string | null;
        reason: string | null;
        before_values: Json | null;
        after_values: Json | null;
        actor: Database['public']['Enums']['audit_actor'] | null;
        actor_user_id_short: string | null;
      };
      moderation_queue_row: {
        id: string | null;
        reference: string | null;
        source: Database['public']['Enums']['case_source'] | null;
        tier: Database['public']['Enums']['case_tier'] | null;
        status: Database['public']['Enums']['case_status'] | null;
        item_type: Database['public']['Enums']['reportable_type'] | null;
        item_id: string | null;
        item_summary: string | null;
        reported_handle: string | null;
        reported_age_band: Database['public']['Enums']['age_band'] | null;
        top_reason: Database['public']['Enums']['report_reason'] | null;
        report_count: number | null;
        reporter_under_18: boolean | null;
        is_safeguarding: boolean | null;
        received_at: string | null;
        deadline_at: string | null;
        decision: Database['public']['Enums']['moderation_action'] | null;
        decided_at: string | null;
        decided_by_handle: string | null;
        reported_user_id: string | null;
      };
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
        'handle_missing',
        'staff_account',
        'legal_acceptance_required',
        'suspended',
        'banned',
      ],
      age_band: ['under_13', '13_to_15', '16_to_17', '18_plus', 'unknown'],
      age_check_method: ['facial_estimation', 'id_document', 'manual'],
      age_check_result: ['pending', '13_or_over', '18_or_over', 'failed'],
      audit_actor: ['person', 'system'],
      case_source: ['report', 'authority_order', 'picture_check'],
      case_status: ['open', 'decided'],
      case_tier: ['one_hour', 'same_day', 'two_days', 'seven_days'],
      moderated_state: ['hidden', 'removed'],
      moderation_action: ['no_action', 'hide', 'remove', 'restrict', 'warn', 'suspend', 'ban'],
      report_reason: [
        'illegal_content',
        'harassment',
        'insults',
        'self_harm',
        'child_sexual_content',
        'threat_to_minor',
        'terrorism',
        'hate',
        'spam',
        'copyright',
        'copied_published_work',
        'undisclosed_ai',
        'other',
      ],
      reportable_type: ['profile'],
      safety_contact_kind: [
        'emergency',
        'child_helpline',
        'csam_hotline',
        'crisis_youth',
        'police_online_child',
        'regulator',
      ],
      sanction_kind: ['warning', 'suspension', 'ban', 'reporting_pause'],
      staff_permission: ['safeguarding', 'teacher_checks', 'on_call'],
      staff_role: ['owner', 'admin', 'moderator', 'support', 'content_editor'],
    },
  },
} as const;
