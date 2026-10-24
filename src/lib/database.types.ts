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
      categories: {
        Row: {
          created_at: string;
          id: string;
          position: number;
          slug: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          position: number;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          position?: number;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chapter_revisions: {
        Row: {
          body: string;
          chapter_id: string;
          created_at: string;
          created_by_user_id: string;
          id: string;
          reason: Database['public']['Enums']['revision_reason'];
          title: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          chapter_id: string;
          created_at?: string;
          created_by_user_id: string;
          id?: string;
          reason: Database['public']['Enums']['revision_reason'];
          title: string;
          user_id: string;
        };
        Update: {
          body?: string;
          chapter_id?: string;
          created_at?: string;
          created_by_user_id?: string;
          id?: string;
          reason?: Database['public']['Enums']['revision_reason'];
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chapter_revisions_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chapter_revisions_created_by_user_id_fkey';
            columns: ['created_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chapter_revisions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chapters: {
        Row: {
          code: string;
          created_at: string;
          deleted_at: string | null;
          draft_body: string;
          draft_saved_at: string | null;
          draft_title: string;
          draft_version: number;
          edited_at: string | null;
          first_published_at: string | null;
          id: string;
          last_published_at: string | null;
          position: number;
          published_body: string | null;
          published_title: string | null;
          published_word_count: number | null;
          scheduled_for: string | null;
          status: Database['public']['Enums']['chapter_status'];
          story_id: string;
          unpublished_at: string | null;
          updated_at: string;
          user_id: string;
          word_count: number;
          chapter_gate_outcome: string | null;
          chapter_publish_now: undefined | null;
        };
        ComputedFields: 'chapter_gate_outcome' | 'chapter_publish_now';
        Insert: {
          code: string;
          created_at?: string;
          deleted_at?: string | null;
          draft_body?: string;
          draft_saved_at?: string | null;
          draft_title?: string;
          draft_version?: number;
          edited_at?: string | null;
          first_published_at?: string | null;
          id?: string;
          last_published_at?: string | null;
          position: number;
          published_body?: string | null;
          published_title?: string | null;
          published_word_count?: number | null;
          scheduled_for?: string | null;
          status?: Database['public']['Enums']['chapter_status'];
          story_id: string;
          unpublished_at?: string | null;
          updated_at?: string;
          user_id: string;
          word_count?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          deleted_at?: string | null;
          draft_body?: string;
          draft_saved_at?: string | null;
          draft_title?: string;
          draft_version?: number;
          edited_at?: string | null;
          first_published_at?: string | null;
          id?: string;
          last_published_at?: string | null;
          position?: number;
          published_body?: string | null;
          published_title?: string | null;
          published_word_count?: number | null;
          scheduled_for?: string | null;
          status?: Database['public']['Enums']['chapter_status'];
          story_id?: string;
          unpublished_at?: string | null;
          updated_at?: string;
          user_id?: string;
          word_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'chapters_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chapters_user_id_fkey';
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
      jobs: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          payload: NonNullable<Json>;
          processed_at: string | null;
          run_after: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          run_after?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          run_after?: string;
          updated_at?: string;
        };
        Relationships: [];
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
      stories: {
        Row: {
          ai_disclosure: Database['public']['Enums']['ai_disclosure'];
          ai_undisclosed_labelled_at: string | null;
          blurb: string;
          category_id: string;
          comments_enabled: boolean;
          completion_status: Database['public']['Enums']['completion_status'];
          content_note: string;
          cover_accent: string | null;
          cover_background: string | null;
          cover_design: string | null;
          cover_kind: Database['public']['Enums']['cover_kind'];
          cover_square_path: string | null;
          cover_tall_path: string | null;
          created_at: string;
          deals_with_abuse_or_coercion: boolean;
          deleted_at: string | null;
          first_published_at: string | null;
          id: string;
          is_fan_fiction: boolean;
          is_parody: boolean;
          language_code: string;
          last_chapter_published_at: string | null;
          rating: Database['public']['Enums']['story_rating'];
          slug: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          ai_disclosure?: Database['public']['Enums']['ai_disclosure'];
          ai_undisclosed_labelled_at?: string | null;
          blurb?: string;
          category_id: string;
          comments_enabled?: boolean;
          completion_status?: Database['public']['Enums']['completion_status'];
          content_note?: string;
          cover_accent?: string | null;
          cover_background?: string | null;
          cover_design?: string | null;
          cover_kind?: Database['public']['Enums']['cover_kind'];
          cover_square_path?: string | null;
          cover_tall_path?: string | null;
          created_at?: string;
          deals_with_abuse_or_coercion?: boolean;
          deleted_at?: string | null;
          first_published_at?: string | null;
          id?: string;
          is_fan_fiction?: boolean;
          is_parody?: boolean;
          language_code: string;
          last_chapter_published_at?: string | null;
          rating: Database['public']['Enums']['story_rating'];
          slug: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ai_disclosure?: Database['public']['Enums']['ai_disclosure'];
          ai_undisclosed_labelled_at?: string | null;
          blurb?: string;
          category_id?: string;
          comments_enabled?: boolean;
          completion_status?: Database['public']['Enums']['completion_status'];
          content_note?: string;
          cover_accent?: string | null;
          cover_background?: string | null;
          cover_design?: string | null;
          cover_kind?: Database['public']['Enums']['cover_kind'];
          cover_square_path?: string | null;
          cover_tall_path?: string | null;
          created_at?: string;
          deals_with_abuse_or_coercion?: boolean;
          deleted_at?: string | null;
          first_published_at?: string | null;
          id?: string;
          is_fan_fiction?: boolean;
          is_parody?: boolean;
          language_code?: string;
          last_chapter_published_at?: string | null;
          rating?: Database['public']['Enums']['story_rating'];
          slug?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'stories_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stories_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      story_tags: {
        Row: {
          created_at: string;
          story_id: string;
          tag_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          story_id: string;
          tag_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          story_id?: string;
          tag_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_tags_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_tags_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      tags: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          normalised_name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          normalised_name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          normalised_name?: string;
          updated_at?: string;
        };
        Relationships: [];
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
      admin_approve_username: {
        Args: {
          approved_name: string;
          name_kind: string;
          reason_given: string;
          target_user_id: string;
        };
        Returns: string;
      };
      admin_grant_role: {
        Args: {
          granted_role: Database['public']['Enums']['staff_role'];
          reason_given: string;
          target_user_id: string;
        };
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
      admin_list_staff: {
        Args: Record<PropertyKey, never>;
        Returns: {
          handle: string;
          permissions: Database['public']['Enums']['staff_permission'][];
          roles: Database['public']['Enums']['staff_role'][];
          user_id: string;
        }[];
      };
      admin_raise_story_rating: {
        Args: {
          new_rating: Database['public']['Enums']['story_rating'];
          reason_given: string;
          target_story_id: string;
        };
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
      admin_set_ai_undisclosed_label: {
        Args: { reason_given: string; target_story_id: string };
        Returns: string;
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
      birth_year_needs_month: { Args: { birth_year: number; on_date: string }; Returns: boolean };
      bootstrap_first_owner: { Args: { target_user_id: string }; Returns: undefined };
      cancel_schedule: { Args: { chapter_code: string }; Returns: Json };
      change_is_too_soon: {
        Args: { last_changed_at: string; setting_key: string };
        Returns: boolean;
      };
      chapter_code: { Args: Record<PropertyKey, never>; Returns: string };
      chapter_gate_outcome: {
        Args: {
          chapter: Omit<
            Database['public']['Tables']['chapters']['Row'],
            Database['public']['Tables']['chapters']['ComputedFields']
          >;
        };
        Returns: string;
      };
      chapter_is_readable: { Args: { chapter_id: string }; Returns: boolean };
      chapter_publish_now: {
        Args: {
          chapter: Omit<
            Database['public']['Tables']['chapters']['Row'],
            Database['public']['Tables']['chapters']['ComputedFields']
          >;
        };
        Returns: undefined;
      };
      check_chapter_text: { Args: { body: string }; Returns: string };
      check_handle: { Args: { candidate: string }; Returns: string };
      check_invite: { Args: { code: string }; Returns: string };
      check_pen_name: { Args: { candidate: string }; Returns: string };
      check_story_basics: {
        Args: {
          category_slug: string;
          clean_blurb: string;
          clean_title: string;
          language_code: string;
        };
        Returns: string;
      };
      check_story_cover: { Args: { cover: Json }; Returns: undefined };
      check_story_labels: { Args: { labels: Json }; Returns: undefined };
      clear_my_sign_in_failures: { Args: Record<PropertyKey, never>; Returns: undefined };
      content_is_held_for_moderation: {
        Args: { item_id: string; item_type: Database['public']['Enums']['reportable_type'] };
        Returns: boolean;
      };
      count_words: { Args: { body: string }; Returns: number };
      cover_upload_allowed: { Args: { object_name: string }; Returns: boolean };
      create_chapter: { Args: { story_slug: string }; Returns: Json };
      create_story: {
        Args: {
          blurb: string;
          category_slug: string;
          cover: Json;
          labels?: Json;
          language_code: string;
          story_id?: string;
          tag_names: string[];
          title: string;
        };
        Returns: Json;
      };
      delete_my_story: { Args: { story_slug: string }; Returns: Json };
      display_name: { Args: { handle: string; pen_name: string }; Returns: string };
      end_my_session: { Args: { target_session_id: string }; Returns: boolean };
      fold_look_alike_characters: { Args: { name: string }; Returns: string };
      get_story_page: { Args: { story_slug: string }; Returns: Json };
      has_invisible_characters: { Args: { name: string }; Returns: boolean };
      hash_email: { Args: { email: string }; Returns: string };
      invite_code_hash: { Args: { code: string }; Returns: string };
      is_active_member: { Args: Record<PropertyKey, never>; Returns: boolean };
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
      my_legal_documents_to_accept: {
        Args: Record<PropertyKey, never>;
        Returns: {
          change_summary: string;
          document_slug: string;
          version_label: string;
        }[];
      };
      my_live_chapter: {
        Args: { chapter_code: string };
        Returns: {
          code: string;
          created_at: string;
          deleted_at: string | null;
          draft_body: string;
          draft_saved_at: string | null;
          draft_title: string;
          draft_version: number;
          edited_at: string | null;
          first_published_at: string | null;
          id: string;
          last_published_at: string | null;
          position: number;
          published_body: string | null;
          published_title: string | null;
          published_word_count: number | null;
          scheduled_for: string | null;
          status: Database['public']['Enums']['chapter_status'];
          story_id: string;
          unpublished_at: string | null;
          updated_at: string;
          user_id: string;
          word_count: number;
        };
        SetofOptions: {
          from: '*';
          to: 'chapters';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      my_live_story_id: { Args: { story_slug: string }; Returns: string };
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
      normalise_romanian_letters: { Args: { input_text: string }; Returns: string };
      normalise_tag: { Args: { tag_name: string }; Returns: string };
      open_story_languages: { Args: Record<PropertyKey, never>; Returns: string[] };
      publish_chapter: { Args: { chapter_code: string }; Returns: Json };
      publish_due_chapters: { Args: Record<PropertyKey, never>; Returns: number };
      purge_deleted_stories: { Args: Record<PropertyKey, never>; Returns: number };
      purge_old_client_errors: { Args: Record<PropertyKey, never>; Returns: number };
      rating_allows: {
        Args: { story_rating: Database['public']['Enums']['story_rating'] };
        Returns: boolean;
      };
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
      require_role_change_allowed: {
        Args: { reason_given: string; target_user_id: string };
        Returns: undefined;
      };
      require_role_in_reach: {
        Args: { changed_role: Database['public']['Enums']['staff_role'] };
        Returns: undefined;
      };
      restore_my_story: { Args: { story_slug: string }; Returns: Json };
      save_chapter_draft: {
        Args: { body: string; chapter_code: string; expected_version: number; title: string };
        Returns: Json;
      };
      schedule_chapter: { Args: { chapter_code: string; publish_at: string }; Returns: Json };
      scrub_error_text: { Args: { max_length: number; raw_text: string }; Returns: string };
      scrub_route_path: { Args: { raw_path: string }; Returns: string };
      set_my_handle: { Args: { new_handle: string }; Returns: string };
      set_my_locale: { Args: { new_locale: string }; Returns: string };
      set_my_pen_name: { Args: { new_pen_name: string }; Returns: string };
      set_story_tags: {
        Args: { owner_id: string; tag_names: string[]; target_story_id: string };
        Returns: undefined;
      };
      setting_value: { Args: { setting_key: string }; Returns: Json };
      sign_in_pause_until: { Args: { email_hash: string }; Returns: string };
      sign_up_age_outcome: { Args: { birth_month?: number; birth_year: number }; Returns: string };
      sign_up_birth_month: { Args: { birth_year: number; sign_up_data: Json }; Returns: number };
      sign_up_birth_year: { Args: { sign_up_data: Json }; Returns: number };
      sign_up_market_outcome: {
        Args: { birth_month?: number; birth_year: number; country_code: string };
        Returns: string;
      };
      staff_may: { Args: { target_area: string; wanted_access?: string }; Returns: boolean };
      story_has_readable_chapter: { Args: { target_story_id: string }; Returns: boolean };
      story_page_chapters: { Args: { is_owner: boolean; target_story_id: string }; Returns: Json };
      story_slug_for: { Args: { title: string }; Returns: string };
      strip_combining_marks: { Args: { name: string }; Returns: string };
      unpublish_chapter: { Args: { chapter_code: string }; Returns: Json };
      update_my_story: { Args: { changes: Json; story_slug: string }; Returns: Json };
      update_published_chapter: { Args: { chapter_code: string }; Returns: Json };
      use_platform_invite: { Args: { code: string }; Returns: undefined };
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
        | 'legal_acceptance_required';
      age_band: 'under_13' | '13_to_15' | '16_to_17' | '18_plus' | 'unknown';
      age_check_method: 'facial_estimation' | 'id_document' | 'manual';
      age_check_result: 'pending' | '13_or_over' | '18_or_over' | 'failed';
      ai_disclosure: 'no_ai' | 'ai_brainstorming' | 'partly_ai_written';
      chapter_status: 'draft' | 'scheduled' | 'published';
      completion_status: 'ongoing' | 'completed';
      cover_kind: 'automatic' | 'drawn' | 'upload';
      reportable_type: 'profile' | 'story' | 'chapter';
      revision_reason: 'published' | 'edited' | 'restored';
      staff_permission: 'safeguarding' | 'teacher_checks' | 'on_call';
      staff_role: 'owner' | 'admin' | 'moderator' | 'support' | 'content_editor';
      story_rating: 'all_ages' | '13_plus' | '16_plus' | '18_plus';
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
        'handle_missing',
        'staff_account',
        'legal_acceptance_required',
      ],
      age_band: ['under_13', '13_to_15', '16_to_17', '18_plus', 'unknown'],
      age_check_method: ['facial_estimation', 'id_document', 'manual'],
      age_check_result: ['pending', '13_or_over', '18_or_over', 'failed'],
      ai_disclosure: ['no_ai', 'ai_brainstorming', 'partly_ai_written'],
      chapter_status: ['draft', 'scheduled', 'published'],
      completion_status: ['ongoing', 'completed'],
      cover_kind: ['automatic', 'drawn', 'upload'],
      reportable_type: ['profile', 'story', 'chapter'],
      revision_reason: ['published', 'edited', 'restored'],
      staff_permission: ['safeguarding', 'teacher_checks', 'on_call'],
      staff_role: ['owner', 'admin', 'moderator', 'support', 'content_editor'],
      story_rating: ['all_ages', '13_plus', '16_plus', '18_plus'],
    },
  },
} as const;
