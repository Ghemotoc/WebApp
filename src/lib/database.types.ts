export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      appeals: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decided_by_user_id: string | null;
          decision_note: string | null;
          explanation: string;
          id: string;
          message_to_person: string | null;
          original_decider_user_id: string | null;
          reference: string;
          statement_id: string;
          status: Database['public']['Enums']['appeal_status'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decided_by_user_id?: string | null;
          decision_note?: string | null;
          explanation: string;
          id?: string;
          message_to_person?: string | null;
          original_decider_user_id?: string | null;
          reference: string;
          statement_id: string;
          status?: Database['public']['Enums']['appeal_status'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          decided_by_user_id?: string | null;
          decision_note?: string | null;
          explanation?: string;
          id?: string;
          message_to_person?: string | null;
          original_decider_user_id?: string | null;
          reference?: string;
          statement_id?: string;
          status?: Database['public']['Enums']['appeal_status'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'appeals_decided_by_user_id_fkey';
            columns: ['decided_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'appeals_original_decider_user_id_fkey';
            columns: ['original_decider_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'appeals_statement_id_fkey';
            columns: ['statement_id'];
            isOneToOne: false;
            referencedRelation: 'statements_of_reasons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'appeals_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
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
      blocks: {
        Row: {
          blocked_user_id: string;
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          blocked_user_id: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          blocked_user_id?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'blocks_blocked_user_id_fkey';
            columns: ['blocked_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      canva_connections: {
        Row: {
          access_expires_at: string;
          access_token_ciphertext: string;
          created_at: string;
          id: string;
          refresh_token_ciphertext: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          access_expires_at: string;
          access_token_ciphertext: string;
          created_at?: string;
          id?: string;
          refresh_token_ciphertext: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_expires_at?: string;
          access_token_ciphertext?: string;
          created_at?: string;
          id?: string;
          refresh_token_ciphertext?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'canva_connections_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
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
          claimed_at: string | null;
          claimed_by_user_id: string | null;
          created_at: string;
          deadline_at: string;
          decided_at: string | null;
          decided_by_user_id: string | null;
          decision: Database['public']['Enums']['moderation_action'] | null;
          disabled_at: string | null;
          id: string;
          is_safeguarding: boolean;
          item_id: string;
          item_type: Database['public']['Enums']['reportable_type'];
          preserve_until: string | null;
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
          add_copied_work_note: undefined | null;
          case_item_content: Json | null;
          order_timeline_json: Json | null;
          statement_ground_for_case: {
            ground: Database['public']['Enums']['statement_ground'];
            ground_key: string;
          } | null;
        };
        ComputedFields:
          | 'add_copied_work_note'
          | 'case_item_content'
          | 'order_timeline_json'
          | 'statement_ground_for_case';
        Insert: {
          claimed_at?: string | null;
          claimed_by_user_id?: string | null;
          created_at?: string;
          deadline_at: string;
          decided_at?: string | null;
          decided_by_user_id?: string | null;
          decision?: Database['public']['Enums']['moderation_action'] | null;
          disabled_at?: string | null;
          id?: string;
          is_safeguarding?: boolean;
          item_id: string;
          item_type: Database['public']['Enums']['reportable_type'];
          preserve_until?: string | null;
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
          claimed_at?: string | null;
          claimed_by_user_id?: string | null;
          created_at?: string;
          deadline_at?: string;
          decided_at?: string | null;
          decided_by_user_id?: string | null;
          decision?: Database['public']['Enums']['moderation_action'] | null;
          disabled_at?: string | null;
          id?: string;
          is_safeguarding?: boolean;
          item_id?: string;
          item_type?: Database['public']['Enums']['reportable_type'];
          preserve_until?: string | null;
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
            foreignKeyName: 'cases_claimed_by_user_id_fkey';
            columns: ['claimed_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
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
      chapter_embeds: {
        Row: {
          author_name: string | null;
          chapter_id: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          media_path: string;
          service: Database['public']['Enums']['embed_service'];
          source_url: string;
          title: string | null;
          updated_at: string;
          user_id: string;
          embed_json: Json | null;
        };
        ComputedFields: 'embed_json';
        Insert: {
          author_name?: string | null;
          chapter_id: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          media_path: string;
          service: Database['public']['Enums']['embed_service'];
          source_url: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          author_name?: string | null;
          chapter_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          media_path?: string;
          service?: Database['public']['Enums']['embed_service'];
          source_url?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chapter_embeds_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chapter_embeds_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chapter_likes: {
        Row: {
          chapter_id: string;
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          chapter_id: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          chapter_id?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chapter_likes_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chapter_likes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chapter_reads: {
        Row: {
          chapter_id: string;
          read_on: string;
          total: number;
        };
        ComputedFields: never;
        Insert: {
          chapter_id: string;
          read_on: string;
          total?: number;
        };
        Update: {
          chapter_id?: string;
          read_on?: string;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'chapter_reads_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
        ];
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
      chapter_shares: {
        Row: {
          chapter_id: string;
          shared_on: string;
          total: number;
        };
        ComputedFields: never;
        Insert: {
          chapter_id: string;
          shared_on: string;
          total?: number;
        };
        Update: {
          chapter_id?: string;
          shared_on?: string;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'chapter_shares_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
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
      classic_authors: {
        Row: {
          created_at: string;
          died_year: number;
          id: string;
          name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          died_year: number;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          died_year?: number;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      classic_works: {
        Row: {
          added_by_user_id: string;
          created_at: string;
          details_checked: boolean;
          first_published_year: number | null;
          kind: Database['public']['Enums']['classic_kind'];
          original_language: string;
          source_title: string;
          source_url: string;
          story_id: string;
          translator_died_year: number | null;
          translator_name: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          added_by_user_id: string;
          created_at?: string;
          details_checked?: boolean;
          first_published_year?: number | null;
          kind: Database['public']['Enums']['classic_kind'];
          original_language: string;
          source_title: string;
          source_url: string;
          story_id: string;
          translator_died_year?: number | null;
          translator_name?: string | null;
          updated_at?: string;
        };
        Update: {
          added_by_user_id?: string;
          created_at?: string;
          details_checked?: boolean;
          first_published_year?: number | null;
          kind?: Database['public']['Enums']['classic_kind'];
          original_language?: string;
          source_title?: string;
          source_url?: string;
          story_id?: string;
          translator_died_year?: number | null;
          translator_name?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'classic_works_added_by_user_id_fkey';
            columns: ['added_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'classic_works_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: true;
            referencedRelation: 'stories';
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
      cms_versions: {
        Row: {
          content: NonNullable<Json>;
          content_kind: string;
          created_at: string;
          entry_key: string;
          id: string;
          is_removal: boolean;
          language_code: string | null;
          market_code: string;
          published_at: string | null;
          show_from: string | null;
          show_until: string | null;
          status: string;
          updated_at: string;
          user_id: string | null;
          cms_content_problems: string[] | null;
          cms_live_content_of: Json | null;
        };
        ComputedFields: 'cms_content_problems' | 'cms_live_content_of';
        Insert: {
          content?: NonNullable<Json>;
          content_kind: string;
          created_at?: string;
          entry_key: string;
          id?: string;
          is_removal?: boolean;
          language_code?: string | null;
          market_code: string;
          published_at?: string | null;
          show_from?: string | null;
          show_until?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          content?: NonNullable<Json>;
          content_kind?: string;
          created_at?: string;
          entry_key?: string;
          id?: string;
          is_removal?: boolean;
          language_code?: string | null;
          market_code?: string;
          published_at?: string | null;
          show_from?: string | null;
          show_until?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'cms_versions_language_code_fkey';
            columns: ['language_code'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'cms_versions_market_code_fkey';
            columns: ['market_code'];
            isOneToOne: false;
            referencedRelation: 'markets';
            referencedColumns: ['country_code'];
          },
          {
            foreignKeyName: 'cms_versions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      comment_downvotes: {
        Row: {
          comment_id: string;
          created_at: string;
          id: string;
          is_counted: boolean;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          comment_id: string;
          created_at?: string;
          id?: string;
          is_counted: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          comment_id?: string;
          created_at?: string;
          id?: string;
          is_counted?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comment_downvotes_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comment_downvotes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      comment_reactions: {
        Row: {
          comment_id: string;
          created_at: string;
          id: string;
          kind: Database['public']['Enums']['reaction_kind'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          comment_id: string;
          created_at?: string;
          id?: string;
          kind: Database['public']['Enums']['reaction_kind'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          comment_id?: string;
          created_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['reaction_kind'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comment_reactions_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comment_reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      comments: {
        Row: {
          body: string;
          chapter_id: string;
          created_at: string;
          deleted_at: string | null;
          deleted_by: Database['public']['Enums']['comment_deleted_by'] | null;
          id: string;
          is_spoiler: boolean;
          parent_comment_id: string | null;
          updated_at: string;
          user_id: string;
          comment_is_shown_to_caller: boolean | null;
          comment_state_for_caller: string | null;
          open_downvote_case: undefined | null;
        };
        ComputedFields:
          'comment_is_shown_to_caller' | 'comment_state_for_caller' | 'open_downvote_case';
        Insert: {
          body: string;
          chapter_id: string;
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: Database['public']['Enums']['comment_deleted_by'] | null;
          id?: string;
          is_spoiler?: boolean;
          parent_comment_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          chapter_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: Database['public']['Enums']['comment_deleted_by'] | null;
          id?: string;
          is_spoiler?: boolean;
          parent_comment_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comments_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_parent_comment_id_fkey';
            columns: ['parent_comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      compliance_log_entries: {
        Row: {
          action_taken: string | null;
          authority: string;
          completed_at: string | null;
          completed_by_user_id: string | null;
          content: string;
          created_at: string;
          entry_kind: Database['public']['Enums']['compliance_entry_kind'];
          id: string;
          received_at: string;
          reference: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          action_taken?: string | null;
          authority: string;
          completed_at?: string | null;
          completed_by_user_id?: string | null;
          content: string;
          created_at?: string;
          entry_kind: Database['public']['Enums']['compliance_entry_kind'];
          id?: string;
          received_at: string;
          reference?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          action_taken?: string | null;
          authority?: string;
          completed_at?: string | null;
          completed_by_user_id?: string | null;
          content?: string;
          created_at?: string;
          entry_kind?: Database['public']['Enums']['compliance_entry_kind'];
          id?: string;
          received_at?: string;
          reference?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'compliance_log_entries_completed_by_user_id_fkey';
            columns: ['completed_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'compliance_log_entries_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
      copied_work_notes: {
        Row: {
          case_id: string;
          created_at: string;
          id: string;
          story_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          case_id: string;
          created_at?: string;
          id?: string;
          story_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          case_id?: string;
          created_at?: string;
          id?: string;
          story_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'copied_work_notes_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'copied_work_notes_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: true;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'copied_work_notes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      daily_metrics: {
        Row: {
          created_at: string;
          id: string;
          market: string;
          metric: string;
          metric_date: string;
          updated_at: string;
          value: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          market?: string;
          metric: string;
          metric_date: string;
          updated_at?: string;
          value: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          market?: string;
          metric?: string;
          metric_date?: string;
          updated_at?: string;
          value?: number;
        };
        Relationships: [];
      };
      email_outbox: {
        Row: {
          attempts: number;
          claimed_at: string | null;
          created_at: string;
          delivery: string;
          id: string;
          notification_ids: string[];
          sent_at: string | null;
          updated_at: string;
          user_id: string;
          email_worker_items: Json | null;
        };
        ComputedFields: 'email_worker_items';
        Insert: {
          attempts?: number;
          claimed_at?: string | null;
          created_at?: string;
          delivery: string;
          id?: string;
          notification_ids: string[];
          sent_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          claimed_at?: string | null;
          created_at?: string;
          delivery?: string;
          id?: string;
          notification_ids?: string[];
          sent_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'email_outbox_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      email_unsubscribe_keys: {
        Row: {
          created_at: string;
          id: string;
          unsubscribe_key: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          unsubscribe_key?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          unsubscribe_key?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'email_unsubscribe_keys_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
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
      follows_stories: {
        Row: {
          created_at: string;
          id: string;
          story_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          story_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          story_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'follows_stories_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_stories_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      follows_users: {
        Row: {
          created_at: string;
          followed_user_id: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          followed_user_id: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          followed_user_id?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'follows_users_followed_user_id_fkey';
            columns: ['followed_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_users_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      interface_text_overrides: {
        Row: {
          created_at: string;
          id: string;
          is_reset: boolean;
          locale: string;
          published_at: string | null;
          show_from: string | null;
          status: string;
          text: string;
          text_key: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_reset?: boolean;
          locale: string;
          published_at?: string | null;
          show_from?: string | null;
          status?: string;
          text?: string;
          text_key: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_reset?: boolean;
          locale?: string;
          published_at?: string | null;
          show_from?: string | null;
          status?: string;
          text?: string;
          text_key?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'interface_text_overrides_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'interface_text_overrides_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
      languages: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          is_interface: boolean;
          status: Database['public']['Enums']['language_status'];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          is_interface?: boolean;
          status?: Database['public']['Enums']['language_status'];
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          is_interface?: boolean;
          status?: Database['public']['Enums']['language_status'];
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
      library_entries: {
        Row: {
          created_at: string;
          id: string;
          shelf: Database['public']['Enums']['library_shelf'];
          story_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          shelf: Database['public']['Enums']['library_shelf'];
          story_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          shelf?: Database['public']['Enums']['library_shelf'];
          story_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'library_entries_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'library_entries_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      markets: {
        Row: {
          country_code: string;
          created_at: string;
          id: string;
          is_open: boolean;
          languages: string[];
          legal_check: Database['public']['Enums']['legal_check_status'];
          minimum_age: number;
          status: Database['public']['Enums']['market_status'];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          country_code: string;
          created_at?: string;
          id?: string;
          is_open?: boolean;
          languages: string[];
          legal_check?: Database['public']['Enums']['legal_check_status'];
          minimum_age?: number;
          status?: Database['public']['Enums']['market_status'];
          updated_at?: string;
        };
        Update: {
          country_code?: string;
          created_at?: string;
          id?: string;
          is_open?: boolean;
          languages?: string[];
          legal_check?: Database['public']['Enums']['legal_check_status'];
          minimum_age?: number;
          status?: Database['public']['Enums']['market_status'];
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
      moderator_mail_messages: {
        Row: {
          body: string;
          created_at: string;
          from_team: boolean;
          id: string;
          is_internal_note: boolean;
          thread_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          created_at?: string;
          from_team?: boolean;
          id?: string;
          is_internal_note?: boolean;
          thread_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          from_team?: boolean;
          id?: string;
          is_internal_note?: boolean;
          thread_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'moderator_mail_messages_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'moderator_mail_threads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moderator_mail_messages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      moderator_mail_threads: {
        Row: {
          assigned_to_user_id: string | null;
          created_at: string;
          id: string;
          last_message_at: string;
          reference: string;
          statement_id: string | null;
          status: string;
          subject: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          assigned_to_user_id?: string | null;
          created_at?: string;
          id?: string;
          last_message_at?: string;
          reference: string;
          statement_id?: string | null;
          status?: string;
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          assigned_to_user_id?: string | null;
          created_at?: string;
          id?: string;
          last_message_at?: string;
          reference?: string;
          statement_id?: string | null;
          status?: string;
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'moderator_mail_threads_assigned_to_user_id_fkey';
            columns: ['assigned_to_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moderator_mail_threads_statement_id_fkey';
            columns: ['statement_id'];
            isOneToOne: false;
            referencedRelation: 'statements_of_reasons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moderator_mail_threads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_email_settings: {
        Row: {
          created_at: string;
          delivery: Database['public']['Enums']['email_delivery'];
          id: string;
          kind: Database['public']['Enums']['notification_kind'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          delivery: Database['public']['Enums']['email_delivery'];
          id?: string;
          kind: Database['public']['Enums']['notification_kind'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          delivery?: Database['public']['Enums']['email_delivery'];
          id?: string;
          kind?: Database['public']['Enums']['notification_kind'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_email_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          actor_count: number;
          actor_user_ids: string[];
          appeal_id: string | null;
          case_id: string | null;
          chapter_id: string | null;
          comment_id: string | null;
          created_at: string;
          decision: Database['public']['Enums']['moderation_action'] | null;
          group_key: string | null;
          id: string;
          is_required: boolean;
          kind: Database['public']['Enums']['notification_kind'];
          mail_thread_id: string | null;
          read_at: string | null;
          statement_id: string | null;
          story_id: string | null;
          updated_at: string;
          user_id: string;
          notification_is_shown: boolean | null;
          notification_json: Json | null;
        };
        ComputedFields: 'notification_is_shown' | 'notification_json';
        Insert: {
          actor_count?: number;
          actor_user_ids?: string[];
          appeal_id?: string | null;
          case_id?: string | null;
          chapter_id?: string | null;
          comment_id?: string | null;
          created_at?: string;
          decision?: Database['public']['Enums']['moderation_action'] | null;
          group_key?: string | null;
          id?: string;
          is_required?: boolean;
          kind: Database['public']['Enums']['notification_kind'];
          mail_thread_id?: string | null;
          read_at?: string | null;
          statement_id?: string | null;
          story_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          actor_count?: number;
          actor_user_ids?: string[];
          appeal_id?: string | null;
          case_id?: string | null;
          chapter_id?: string | null;
          comment_id?: string | null;
          created_at?: string;
          decision?: Database['public']['Enums']['moderation_action'] | null;
          group_key?: string | null;
          id?: string;
          is_required?: boolean;
          kind?: Database['public']['Enums']['notification_kind'];
          mail_thread_id?: string | null;
          read_at?: string | null;
          statement_id?: string | null;
          story_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_appeal_id_fkey';
            columns: ['appeal_id'];
            isOneToOne: false;
            referencedRelation: 'appeals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_mail_thread_id_fkey';
            columns: ['mail_thread_id'];
            isOneToOne: false;
            referencedRelation: 'moderator_mail_threads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_statement_id_fkey';
            columns: ['statement_id'];
            isOneToOne: false;
            referencedRelation: 'statements_of_reasons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      on_call_alerts: {
        Row: {
          acknowledged_at: string | null;
          acknowledged_by_user_id: string | null;
          alerted_at: string | null;
          case_id: string | null;
          created_at: string;
          escalated_at: string | null;
          id: string;
          kind: string;
          notice_id: string | null;
          on_call_user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          acknowledged_at?: string | null;
          acknowledged_by_user_id?: string | null;
          alerted_at?: string | null;
          case_id?: string | null;
          created_at?: string;
          escalated_at?: string | null;
          id?: string;
          kind: string;
          notice_id?: string | null;
          on_call_user_id?: string | null;
        };
        Update: {
          acknowledged_at?: string | null;
          acknowledged_by_user_id?: string | null;
          alerted_at?: string | null;
          case_id?: string | null;
          created_at?: string;
          escalated_at?: string | null;
          id?: string;
          kind?: string;
          notice_id?: string | null;
          on_call_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'on_call_alerts_acknowledged_by_user_id_fkey';
            columns: ['acknowledged_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'on_call_alerts_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'on_call_alerts_notice_id_fkey';
            columns: ['notice_id'];
            isOneToOne: false;
            referencedRelation: 'public_notices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'on_call_alerts_on_call_user_id_fkey';
            columns: ['on_call_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      on_call_rota: {
        Row: {
          created_at: string;
          created_by_user_id: string;
          ends_at: string;
          id: string;
          starts_at: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by_user_id: string;
          ends_at: string;
          id?: string;
          starts_at: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by_user_id?: string;
          ends_at?: string;
          id?: string;
          starts_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'on_call_rota_created_by_user_id_fkey';
            columns: ['created_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'on_call_rota_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      picture_checks: {
        Row: {
          attempts: number;
          bucket: string;
          case_id: string | null;
          chapter_id: string | null;
          checked_at: string | null;
          created_at: string;
          deleted_at: string | null;
          flags: NonNullable<Json>;
          id: string;
          kind: Database['public']['Enums']['picture_kind'];
          path: string;
          preserve_until: string | null;
          provider: string | null;
          rights_confirmed_at: string | null;
          status: Database['public']['Enums']['picture_status'];
          story_id: string | null;
          updated_at: string;
          user_id: string;
          picture_state_json: Json | null;
          show_passed_avatar: undefined | null;
        };
        ComputedFields: 'picture_state_json' | 'show_passed_avatar';
        Insert: {
          attempts?: number;
          bucket: string;
          case_id?: string | null;
          chapter_id?: string | null;
          checked_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          flags?: NonNullable<Json>;
          id?: string;
          kind: Database['public']['Enums']['picture_kind'];
          path: string;
          preserve_until?: string | null;
          provider?: string | null;
          rights_confirmed_at?: string | null;
          status?: Database['public']['Enums']['picture_status'];
          story_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          bucket?: string;
          case_id?: string | null;
          chapter_id?: string | null;
          checked_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          flags?: NonNullable<Json>;
          id?: string;
          kind?: Database['public']['Enums']['picture_kind'];
          path?: string;
          preserve_until?: string | null;
          provider?: string | null;
          rights_confirmed_at?: string | null;
          status?: Database['public']['Enums']['picture_status'];
          story_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'picture_checks_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picture_checks_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picture_checks_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picture_checks_user_id_fkey';
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
          avatar_picture_id: string | null;
          bio: string;
          birth_month: number | null;
          birth_year: number;
          birthday_day: number | null;
          birthday_month: number | null;
          country_code: string | null;
          created_at: string;
          deleted_at: string | null;
          handle: string | null;
          handle_changed_at: string | null;
          handle_skeleton: string | null;
          handle_slug: string | null;
          id: string;
          locale: string;
          marketing_email_opt_in: boolean;
          pen_name: string | null;
          pen_name_changed_at: string | null;
          shows_online_status: boolean;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          age_check_method?: Database['public']['Enums']['age_check_method'] | null;
          age_check_result?: Database['public']['Enums']['age_check_result'];
          age_checked_at?: string | null;
          avatar_picture_id?: string | null;
          bio?: string;
          birth_month?: number | null;
          birth_year: number;
          birthday_day?: number | null;
          birthday_month?: number | null;
          country_code?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          handle?: string | null;
          handle_changed_at?: string | null;
          handle_skeleton?: string | null;
          handle_slug?: string | null;
          id: string;
          locale?: string;
          marketing_email_opt_in?: boolean;
          pen_name?: string | null;
          pen_name_changed_at?: string | null;
          shows_online_status?: boolean;
          updated_at?: string;
        };
        Update: {
          age_check_method?: Database['public']['Enums']['age_check_method'] | null;
          age_check_result?: Database['public']['Enums']['age_check_result'];
          age_checked_at?: string | null;
          avatar_picture_id?: string | null;
          bio?: string;
          birth_month?: number | null;
          birth_year?: number;
          birthday_day?: number | null;
          birthday_month?: number | null;
          country_code?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          handle?: string | null;
          handle_changed_at?: string | null;
          handle_skeleton?: string | null;
          handle_slug?: string | null;
          id?: string;
          locale?: string;
          marketing_email_opt_in?: boolean;
          pen_name?: string | null;
          pen_name_changed_at?: string | null;
          shows_online_status?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_avatar_picture_id_fkey';
            columns: ['avatar_picture_id'];
            isOneToOne: false;
            referencedRelation: 'picture_checks';
            referencedColumns: ['id'];
          },
        ];
      };
      public_notices: {
        Row: {
          authority_name: string | null;
          case_id: string | null;
          closed_at: string | null;
          content_url: string;
          copy_source_author: string | null;
          copy_source_passage: string | null;
          copy_source_reference: string | null;
          copy_source_title: string | null;
          created_at: string;
          decided_at: string | null;
          decision_emailed_at: string | null;
          explanation: string;
          good_faith_confirmed: boolean;
          id: string;
          item_id: string | null;
          item_type: Database['public']['Enums']['reportable_type'] | null;
          kind: string;
          language: string;
          notifier_email: string | null;
          notifier_name: string | null;
          order_reference: string | null;
          owner_user_id: string | null;
          reason: Database['public']['Enums']['report_reason'] | null;
          received_at: string;
          reference: string;
          updated_at: string;
          attach_notice_to_case: string | null;
        };
        ComputedFields: 'attach_notice_to_case';
        Insert: {
          authority_name?: string | null;
          case_id?: string | null;
          closed_at?: string | null;
          content_url: string;
          copy_source_author?: string | null;
          copy_source_passage?: string | null;
          copy_source_reference?: string | null;
          copy_source_title?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decision_emailed_at?: string | null;
          explanation: string;
          good_faith_confirmed?: boolean;
          id?: string;
          item_id?: string | null;
          item_type?: Database['public']['Enums']['reportable_type'] | null;
          kind: string;
          language?: string;
          notifier_email?: string | null;
          notifier_name?: string | null;
          order_reference?: string | null;
          owner_user_id?: string | null;
          reason?: Database['public']['Enums']['report_reason'] | null;
          received_at?: string;
          reference: string;
          updated_at?: string;
        };
        Update: {
          authority_name?: string | null;
          case_id?: string | null;
          closed_at?: string | null;
          content_url?: string;
          copy_source_author?: string | null;
          copy_source_passage?: string | null;
          copy_source_reference?: string | null;
          copy_source_title?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decision_emailed_at?: string | null;
          explanation?: string;
          good_faith_confirmed?: boolean;
          id?: string;
          item_id?: string | null;
          item_type?: Database['public']['Enums']['reportable_type'] | null;
          kind?: string;
          language?: string;
          notifier_email?: string | null;
          notifier_name?: string | null;
          order_reference?: string | null;
          owner_user_id?: string | null;
          reason?: Database['public']['Enums']['report_reason'] | null;
          received_at?: string;
          reference?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_notices_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_notices_owner_user_id_fkey';
            columns: ['owner_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      quote_cards: {
        Row: {
          chapter_id: string;
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          chapter_id: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          chapter_id?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quote_cards_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quote_cards_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      rate_limit_events: {
        Row: {
          action: string;
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rate_limit_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reading_positions: {
        Row: {
          chapter_id: string;
          created_at: string;
          device_kind: string;
          id: string;
          percent: number;
          story_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          chapter_id: string;
          created_at?: string;
          device_kind: string;
          id?: string;
          percent: number;
          story_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          chapter_id?: string;
          created_at?: string;
          device_kind?: string;
          id?: string;
          percent?: number;
          story_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reading_positions_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reading_positions_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reading_positions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reading_settings: {
        Row: {
          created_at: string;
          font: Database['public']['Enums']['reading_font'];
          id: string;
          line_spacing: Database['public']['Enums']['reading_line_spacing'];
          line_width: Database['public']['Enums']['reading_line_width'];
          text_size: number | null;
          theme: Database['public']['Enums']['reading_theme'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          font?: Database['public']['Enums']['reading_font'];
          id?: string;
          line_spacing?: Database['public']['Enums']['reading_line_spacing'];
          line_width?: Database['public']['Enums']['reading_line_width'];
          text_size?: number | null;
          theme?: Database['public']['Enums']['reading_theme'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          font?: Database['public']['Enums']['reading_font'];
          id?: string;
          line_spacing?: Database['public']['Enums']['reading_line_spacing'];
          line_width?: Database['public']['Enums']['reading_line_width'];
          text_size?: number | null;
          theme?: Database['public']['Enums']['reading_theme'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reading_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      report_detail_requests: {
        Row: {
          answer: string | null;
          answered_at: string | null;
          case_id: string;
          created_at: string;
          id: string;
          question: string;
          report_id: string;
          requested_by_user_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          answer?: string | null;
          answered_at?: string | null;
          case_id: string;
          created_at?: string;
          id?: string;
          question: string;
          report_id: string;
          requested_by_user_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answer?: string | null;
          answered_at?: string | null;
          case_id?: string;
          created_at?: string;
          id?: string;
          question?: string;
          report_id?: string;
          requested_by_user_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'report_detail_requests_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'report_detail_requests_report_id_fkey';
            columns: ['report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'report_detail_requests_requested_by_user_id_fkey';
            columns: ['requested_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'report_detail_requests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
          copy_source_author: string | null;
          copy_source_passage: string | null;
          copy_source_reference: string | null;
          copy_source_title: string | null;
          created_at: string;
          details: string | null;
          id: string;
          item_id: string;
          item_type: Database['public']['Enums']['reportable_type'];
          reason: Database['public']['Enums']['report_reason'];
          reference: string;
          reported_passage: string | null;
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
          copy_source_author?: string | null;
          copy_source_passage?: string | null;
          copy_source_reference?: string | null;
          copy_source_title?: string | null;
          created_at?: string;
          details?: string | null;
          id?: string;
          item_id: string;
          item_type: Database['public']['Enums']['reportable_type'];
          reason: Database['public']['Enums']['report_reason'];
          reference: string;
          reported_passage?: string | null;
          reported_user_id: string;
          reporter_age_band: Database['public']['Enums']['age_band'];
          source?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          case_id?: string | null;
          closed_at?: string | null;
          copy_source_author?: string | null;
          copy_source_passage?: string | null;
          copy_source_reference?: string | null;
          copy_source_title?: string | null;
          created_at?: string;
          details?: string | null;
          id?: string;
          item_id?: string;
          item_type?: Database['public']['Enums']['reportable_type'];
          reason?: Database['public']['Enums']['report_reason'];
          reference?: string;
          reported_passage?: string | null;
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
      safeguarding_referrals: {
        Row: {
          authority_name: string;
          authority_reference: string | null;
          case_id: string;
          created_at: string;
          id: string;
          note: string | null;
          referred_at: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          authority_name: string;
          authority_reference?: string | null;
          case_id: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          referred_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          authority_name?: string;
          authority_reference?: string | null;
          case_id?: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          referred_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'safeguarding_referrals_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'safeguarding_referrals_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      safety_contact_checks: {
        Row: {
          check_month: string;
          closed_at: string | null;
          closed_by_user_id: string | null;
          country_code: string;
          created_at: string;
          id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          check_month: string;
          closed_at?: string | null;
          closed_by_user_id?: string | null;
          country_code: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          check_month?: string;
          closed_at?: string | null;
          closed_by_user_id?: string | null;
          country_code?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'safety_contact_checks_closed_by_user_id_fkey';
            columns: ['closed_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
          last_checked_by_user_id: string | null;
          last_checked_on: string;
          link: string | null;
          note: string | null;
          opening_hours: string | null;
          opening_hours_ro: string | null;
          phone_number: string | null;
          position: number;
          updated_at: string;
          safety_contact_values: Json | null;
        };
        ComputedFields: 'safety_contact_values';
        Insert: {
          checked_by?: string;
          confidence: string;
          country_code: string;
          created_at?: string;
          id?: string;
          kind: Database['public']['Enums']['safety_contact_kind'];
          label: string;
          last_checked_by_user_id?: string | null;
          last_checked_on: string;
          link?: string | null;
          note?: string | null;
          opening_hours?: string | null;
          opening_hours_ro?: string | null;
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
          last_checked_by_user_id?: string | null;
          last_checked_on?: string;
          link?: string | null;
          note?: string | null;
          opening_hours?: string | null;
          opening_hours_ro?: string | null;
          phone_number?: string | null;
          position?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'safety_contacts_last_checked_by_user_id_fkey';
            columns: ['last_checked_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
      seasonal_occasions: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          doodle: Database['public']['Enums']['seasonal_doodle'];
          ends_on: string;
          every_year: boolean;
          id: string;
          is_season_default: boolean;
          name_en: string;
          name_ro: string;
          shows_on: string;
          starts_on: string;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          doodle: Database['public']['Enums']['seasonal_doodle'];
          ends_on: string;
          every_year?: boolean;
          id?: string;
          is_season_default?: boolean;
          name_en: string;
          name_ro: string;
          shows_on?: string;
          starts_on: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          doodle?: Database['public']['Enums']['seasonal_doodle'];
          ends_on?: string;
          every_year?: boolean;
          id?: string;
          is_season_default?: boolean;
          name_en?: string;
          name_ro?: string;
          shows_on?: string;
          starts_on?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'seasonal_occasions_user_id_fkey';
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
      staff_languages: {
        Row: {
          created_at: string;
          id: string;
          language_code: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          language_code: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          language_code?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_languages_language_code_fkey';
            columns: ['language_code'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'staff_languages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
      statements_of_reasons: {
        Row: {
          action: Database['public']['Enums']['statement_action'];
          appeal_until: string;
          automated_decision: boolean;
          automated_detection: boolean;
          case_id: string | null;
          created_at: string;
          facts: string | null;
          ground: Database['public']['Enums']['statement_ground'];
          ground_key: string;
          id: string;
          issued_at: string;
          item_summary: string | null;
          item_type: Database['public']['Enums']['reportable_type'] | null;
          language: string;
          reference: string;
          restriction_ends_at: string | null;
          sanction_id: string | null;
          story_id: string | null;
          updated_at: string;
          user_id: string;
          decider_of_statement: string | null;
          statement_json: Json | null;
        };
        ComputedFields: 'decider_of_statement' | 'statement_json';
        Insert: {
          action: Database['public']['Enums']['statement_action'];
          appeal_until: string;
          automated_decision?: boolean;
          automated_detection?: boolean;
          case_id?: string | null;
          created_at?: string;
          facts?: string | null;
          ground: Database['public']['Enums']['statement_ground'];
          ground_key: string;
          id?: string;
          issued_at?: string;
          item_summary?: string | null;
          item_type?: Database['public']['Enums']['reportable_type'] | null;
          language: string;
          reference: string;
          restriction_ends_at?: string | null;
          sanction_id?: string | null;
          story_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          action?: Database['public']['Enums']['statement_action'];
          appeal_until?: string;
          automated_decision?: boolean;
          automated_detection?: boolean;
          case_id?: string | null;
          created_at?: string;
          facts?: string | null;
          ground?: Database['public']['Enums']['statement_ground'];
          ground_key?: string;
          id?: string;
          issued_at?: string;
          item_summary?: string | null;
          item_type?: Database['public']['Enums']['reportable_type'] | null;
          language?: string;
          reference?: string;
          restriction_ends_at?: string | null;
          sanction_id?: string | null;
          story_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'statements_of_reasons_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'statements_of_reasons_sanction_id_fkey';
            columns: ['sanction_id'];
            isOneToOne: false;
            referencedRelation: 'sanctions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'statements_of_reasons_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'statements_of_reasons_user_id_fkey';
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
          classic_author_id: string | null;
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
          picture_sharing_enabled: boolean;
          quote_cards_enabled: boolean;
          rank_badge_tag_ids: string[] | null;
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
          classic_author_id?: string | null;
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
          picture_sharing_enabled?: boolean;
          quote_cards_enabled?: boolean;
          rank_badge_tag_ids?: string[] | null;
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
          classic_author_id?: string | null;
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
          picture_sharing_enabled?: boolean;
          quote_cards_enabled?: boolean;
          rank_badge_tag_ids?: string[] | null;
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
            foreignKeyName: 'stories_classic_author_id_fkey';
            columns: ['classic_author_id'];
            isOneToOne: false;
            referencedRelation: 'classic_authors';
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
      story_scores: {
        Row: {
          computed_at: string;
          created_at: string;
          score: number;
          story_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          computed_at?: string;
          created_at?: string;
          score?: number;
          story_id: string;
          updated_at?: string;
        };
        Update: {
          computed_at?: string;
          created_at?: string;
          score?: number;
          story_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_scores_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: true;
            referencedRelation: 'stories';
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
      tag_names: {
        Row: {
          created_at: string;
          id: string;
          language_code: string;
          name: string;
          named_by_user_id: string | null;
          normalised_name: string;
          tag_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          language_code: string;
          name: string;
          named_by_user_id?: string | null;
          normalised_name: string;
          tag_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          language_code?: string;
          name?: string;
          named_by_user_id?: string | null;
          normalised_name?: string;
          tag_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tag_names_language_code_fkey';
            columns: ['language_code'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'tag_names_named_by_user_id_fkey';
            columns: ['named_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tag_names_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
        ];
      };
      tags: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decided_by_user_id: string | null;
          decision_reason: string | null;
          id: string;
          is_recommended: boolean;
          name: string;
          normalised_name: string;
          status: Database['public']['Enums']['tag_status'];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decided_by_user_id?: string | null;
          decision_reason?: string | null;
          id?: string;
          is_recommended?: boolean;
          name: string;
          normalised_name: string;
          status?: Database['public']['Enums']['tag_status'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          decided_by_user_id?: string | null;
          decision_reason?: string | null;
          id?: string;
          is_recommended?: boolean;
          name?: string;
          normalised_name?: string;
          status?: Database['public']['Enums']['tag_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tags_decided_by_user_id_fkey';
            columns: ['decided_by_user_id'];
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
      account_is_new: { Args: { target_user_id: string }; Returns: boolean };
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
      add_chapter_share: { Args: { target_chapter_id: string }; Returns: undefined };
      add_copied_work_note: {
        Args: {
          target: Omit<
            Database['public']['Tables']['cases']['Row'],
            Database['public']['Tables']['cases']['ComputedFields']
          >;
        };
        Returns: undefined;
      };
      admin_account_open_cases: {
        Args: { target_user_id: string };
        Returns: {
          case_id: string;
          deadline_at: string;
          item_type: Database['public']['Enums']['reportable_type'];
          reference: string;
          tier: Database['public']['Enums']['case_tier'];
          top_reason: Database['public']['Enums']['report_reason'];
        }[];
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
      admin_acknowledge_on_call_alert: { Args: { alert_id: string }; Returns: boolean };
      admin_add_classic_author: { Args: { author_name: string; died: number }; Returns: string };
      admin_add_name_word: {
        Args: { how_it_matches: string; new_word: string; word_language: string };
        Returns: string;
      };
      admin_add_reserved_name: {
        Args: { how_it_matches: string; new_name: string };
        Returns: string;
      };
      admin_appeals_queue: {
        Args: { status_filter?: Database['public']['Enums']['appeal_status'] };
        Returns: {
          appellant_handle: string;
          case_reference: string;
          created_at: string;
          decided_at: string;
          decided_by_handle: string;
          decision_note: string;
          explanation: string;
          id: string;
          item_summary: string;
          may_decide: boolean;
          message_to_person: string;
          original_decider_handle: string;
          reference: string;
          statement_action: Database['public']['Enums']['statement_action'];
          statement_reference: string;
          status: Database['public']['Enums']['appeal_status'];
        }[];
      };
      admin_apply_sanction: {
        Args: {
          days?: number;
          message_to_person?: string;
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
      admin_assign_mail: {
        Args: { assignee_handle: string; thread_reference: string };
        Returns: boolean;
      };
      admin_build_evidence_pack: {
        Args: { reason_given: string; target_case_id: string };
        Returns: Json;
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
      admin_case_embed: { Args: { target_case_id: string }; Returns: Json };
      admin_case_notices: {
        Args: { target_case_id: string };
        Returns: {
          alerted_at: string;
          authority_name: string;
          content_url: string;
          copy_source_author: string;
          copy_source_passage: string;
          copy_source_reference: string;
          copy_source_title: string;
          explanation: string;
          kind: string;
          language: string;
          notice_id: string;
          notifier_email: string;
          notifier_name: string;
          order_reference: string;
          reason: Database['public']['Enums']['report_reason'];
          received_at: string;
          reference: string;
        }[];
      };
      admin_case_picture: { Args: { target_case_id: string }; Returns: Json };
      admin_case_referrals: { Args: { target_case_id: string }; Returns: Json };
      admin_case_reports: {
        Args: { target_case_id: string };
        Returns: {
          copy_source_author: string;
          copy_source_passage: string;
          copy_source_reference: string;
          copy_source_title: string;
          created_at: string;
          detail_answer: string;
          detail_asked_at: string;
          detail_question: string;
          details: string;
          reason: Database['public']['Enums']['report_reason'];
          reference: string;
          reported_passage: string;
          reporter_age_band: Database['public']['Enums']['age_band'];
          reporter_handle: string;
        }[];
      };
      admin_case_statements: { Args: { target_case_id: string }; Returns: Json };
      admin_case_support_contacts: { Args: { target_case_id: string }; Returns: Json };
      admin_claim_case: { Args: { target_case_id: string }; Returns: boolean };
      admin_classic_chapter: { Args: { target_chapter_code: string }; Returns: Json };
      admin_classic_suggestions: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_close_unmatched_notice: {
        Args: { note: string; target_notice_id: string };
        Returns: undefined;
      };
      admin_complete_compliance_entry: {
        Args: { action: string; done_at?: string; entry_reference: string };
        Returns: string;
      };
      admin_compliance_log: { Args: { for_export?: boolean }; Returns: Json };
      admin_confirm_safety_contact: { Args: { target_contact_id: string }; Returns: boolean };
      admin_create_invite: {
        Args: { admits?: number; private_note?: string; valid_days?: number };
        Returns: {
          code: string;
          expires_at: string;
          invite_id: string;
        }[];
      };
      admin_decide_appeal: {
        Args: {
          message_to_person: string;
          note_text: string;
          outcome: Database['public']['Enums']['appeal_status'];
          target_appeal_id: string;
        };
        Returns: boolean;
      };
      admin_decide_case: {
        Args: {
          chosen_action: Database['public']['Enums']['moderation_action'];
          message_to_person?: string;
          note_text: string;
          suspension_days?: number;
          target_case_id: string;
        };
        Returns: boolean;
      };
      admin_due_decision_emails: {
        Args: Record<PropertyKey, never>;
        Returns: {
          decided_at: string;
          kind: string;
          language: string;
          notice_id: string;
          notifier_email: string;
          outcome: string;
          reference: string;
        }[];
      };
      admin_emergency_disable: {
        Args: {
          message_to_person: string;
          note_text: string;
          target_case_id: string;
          tell_uploader: boolean;
        };
        Returns: string;
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
      admin_find_accounts: {
        Args: { search_text: string };
        Returns: {
          email_masked: string;
          handle: string;
          matched_by: string;
          pen_name: string;
          staff_roles: Database['public']['Enums']['staff_role'][];
          user_id: string;
        }[];
      };
      admin_fix_classic_typo: {
        Args: { corrected_body: string; reason_given: string; target_chapter_code: string };
        Returns: Json;
      };
      admin_grant_role: {
        Args: {
          granted_role: Database['public']['Enums']['staff_role'];
          reason_given: string;
          target_user_id: string;
        };
        Returns: boolean;
      };
      admin_import_classics: { Args: { list_rows: Json }; Returns: Json };
      admin_lift_sanction: {
        Args: { reason_given: string; target_sanction_id: string };
        Returns: boolean;
      };
      admin_list_classic_authors: {
        Args: Record<PropertyKey, never>;
        Returns: {
          died_year: number;
          id: string;
          name: string;
        }[];
      };
      admin_list_classics: { Args: Record<PropertyKey, never>; Returns: Json };
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
      admin_list_tags: {
        Args: { which_tags: string };
        Returns: {
          created_at: string;
          is_recommended: boolean;
          missing_languages: string[];
          name: string;
          names: Json;
          status: Database['public']['Enums']['tag_status'];
          story_count: number;
          tag_id: string;
        }[];
      };
      admin_log_compliance_entry: {
        Args: {
          action?: string;
          authority: string;
          done_at?: string;
          kind: Database['public']['Enums']['compliance_entry_kind'];
          received: string;
          what_was_asked: string;
        };
        Returns: string;
      };
      admin_log_referral: {
        Args: {
          authority_name: string;
          authority_reference?: string;
          note_text?: string;
          target_case_id: string;
        };
        Returns: string;
      };
      admin_march_numbers: { Args: { days?: number }; Returns: Json };
      admin_mark_decision_emails_sent: { Args: { notice_ids: string[] }; Returns: number };
      admin_mark_safeguarding: {
        Args: { reason_given: string; target_case_id: string };
        Returns: boolean;
      };
      admin_metrics_overview: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_moderation_queue: {
        Args: {
          case_id?: string;
          claimed_filter?: string;
          reason_filter?: Database['public']['Enums']['report_reason'];
          search_text?: string;
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
      admin_moderator_mail_inbox: {
        Args: { assigned_filter?: string; status_filter?: string };
        Returns: {
          assigned_handle: string;
          assigned_to_me: boolean;
          last_message_at: string;
          member_handle: string;
          message_count: number;
          reference: string;
          status: string;
          subject: string;
        }[];
      };
      admin_moderator_mail_thread: { Args: { thread_reference: string }; Returns: Json };
      admin_move_category: { Args: { category_slug: string; move_by: number }; Returns: number };
      admin_name_tag: { Args: { names: Json; tag_id: string }; Returns: undefined };
      admin_on_call_alerts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          acknowledged_at: string;
          alert_id: string;
          case_id: string;
          case_reference: string;
          created_at: string;
          escalated_at: string;
          kind: string;
          notice_reference: string;
          on_call_handle: string;
        }[];
      };
      admin_on_call_rota: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_order_timeline: { Args: { target_case_id: string }; Returns: Json };
      admin_pause_reporting: {
        Args: { note_text?: string; reporter_handle: string; source_case_id?: string };
        Returns: string;
      };
      admin_publish_classic: { Args: { target_story_id: string }; Returns: Json };
      admin_publish_cms_version: { Args: { version_id: string }; Returns: string };
      admin_publish_interface_text: { Args: { version_id: string }; Returns: string };
      admin_raise_story_rating: {
        Args: {
          new_rating: Database['public']['Enums']['story_rating'];
          reason_given: string;
          target_story_id: string;
        };
        Returns: string;
      };
      admin_reject_tag: { Args: { reason: string; tag_id: string }; Returns: number };
      admin_release_case: { Args: { target_case_id: string }; Returns: boolean };
      admin_remove_cms_entry: {
        Args: {
          content_kind: string;
          entry_key: string;
          language_code: string;
          market_code: string;
        };
        Returns: undefined;
      };
      admin_remove_name_word: { Args: { target_word_id: string }; Returns: boolean };
      admin_remove_occasion: { Args: { occasion_id: string }; Returns: undefined };
      admin_remove_on_call_shift: {
        Args: { reason_given: string; shift_id: string };
        Returns: boolean;
      };
      admin_remove_reserved_name: { Args: { target_name_id: string }; Returns: boolean };
      admin_remove_role: {
        Args: {
          reason_given: string;
          removed_role: Database['public']['Enums']['staff_role'];
          target_user_id: string;
        };
        Returns: boolean;
      };
      admin_remove_safety_contact: {
        Args: { reason_given: string; target_contact_id: string };
        Returns: boolean;
      };
      admin_reply_mail: {
        Args: { body: string; is_note?: boolean; thread_reference: string };
        Returns: boolean;
      };
      admin_request_report_details: {
        Args: { question: string; report_reference: string };
        Returns: undefined;
      };
      admin_reset_interface_text: {
        Args: { locale: string; text_key: string };
        Returns: undefined;
      };
      admin_reset_pen_name: {
        Args: { reason_given: string; target_user_id: string };
        Returns: boolean;
      };
      admin_restore_cms_version: { Args: { version_id: string }; Returns: string };
      admin_restore_interface_text: { Args: { version_id: string }; Returns: string };
      admin_restore_item: {
        Args: { reason_given: string; target_item_id: string };
        Returns: boolean;
      };
      admin_reveal_email: { Args: { target_user_id: string }; Returns: string };
      admin_revoke_invite: {
        Args: { reason_given: string; target_invite_id: string };
        Returns: boolean;
      };
      admin_safety_contact_checks: {
        Args: Record<PropertyKey, never>;
        Returns: {
          check_month: string;
          closed_at: string;
          closed_by_handle: string;
          contact_count: number;
          country_code: string;
          still_to_confirm: number;
        }[];
      };
      admin_safety_contact_warnings: {
        Args: Record<PropertyKey, never>;
        Returns: {
          country_code: string;
          days_since: number;
          id: string;
          label: string;
          last_checked_on: string;
        }[];
      };
      admin_save_classic_work: { Args: { details: Json; target_story_id?: string }; Returns: Json };
      admin_save_cms_draft: {
        Args: {
          content_kind: string;
          entry_key: string;
          language_code: string;
          market_code: string;
          new_content: Json;
          new_show_from?: string;
          new_show_until?: string;
        };
        Returns: string;
      };
      admin_save_interface_text: {
        Args: {
          brand_names: string[];
          file_placeholders: string[];
          locale: string;
          new_show_from?: string;
          new_text: string;
          text_key: string;
        };
        Returns: string;
      };
      admin_save_occasion: {
        Args: {
          doodle: Database['public']['Enums']['seasonal_doodle'];
          ends_on: string;
          every_year: boolean;
          is_season_default: boolean;
          name_en: string;
          name_ro: string;
          occasion_id?: string;
          shows_on: string;
          starts_on: string;
        };
        Returns: string;
      };
      admin_save_safety_contact: { Args: { contact: Json }; Returns: string };
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
      admin_set_ai_undisclosed_label: {
        Args: { reason_given: string; target_story_id: string };
        Returns: string;
      };
      admin_set_birthday: {
        Args: {
          reason_given: string;
          target_user_id: string;
          wanted_day?: number;
          wanted_month?: number;
        };
        Returns: boolean;
      };
      admin_set_classic_chapters: {
        Args: { chapter_list: Json; target_story_id: string };
        Returns: Json;
      };
      admin_set_flag: { Args: { flag_key: string; turn_on: boolean }; Returns: boolean };
      admin_set_language_status: {
        Args: { language_code: string; new_status: Database['public']['Enums']['language_status'] };
        Returns: Database['public']['Enums']['language_status'];
      };
      admin_set_launch_date: { Args: { new_date: string }; Returns: string };
      admin_set_mail_status: {
        Args: { new_status: string; thread_reference: string };
        Returns: boolean;
      };
      admin_set_market: {
        Args: {
          market_country: string;
          new_legal_check: Database['public']['Enums']['legal_check_status'];
          new_status: Database['public']['Enums']['market_status'];
        };
        Returns: Database['public']['Enums']['market_status'];
      };
      admin_set_on_call_shift: {
        Args: {
          on_call_user_id: string;
          reason_given: string;
          shift_ends_at: string;
          shift_starts_at: string;
        };
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
      admin_set_setting: { Args: { new_value: Json; setting_key: string }; Returns: Json };
      admin_set_staff_languages: {
        Args: { language_codes: string[]; target_user_id: string };
        Returns: number;
      };
      admin_sign_out_everywhere: {
        Args: { reason_given: string; target_user_id: string };
        Returns: number;
      };
      admin_unmatched_notices: {
        Args: Record<PropertyKey, never>;
        Returns: {
          authority_name: string;
          content_url: string;
          deadline_at: string;
          explanation: string;
          kind: string;
          notice_id: string;
          reason: Database['public']['Enums']['report_reason'];
          received_at: string;
          reference: string;
        }[];
      };
      admin_unpublish_classic: {
        Args: { reason_given: string; target_story_id: string };
        Returns: Json;
      };
      admin_user_account: {
        Args: { target_user_id: string };
        Returns: {
          account_status: Database['public']['Enums']['account_status'];
          age_band: Database['public']['Enums']['age_band'];
          age_check_method: string;
          age_check_result: Database['public']['Enums']['age_check_result'];
          age_checked_at: string;
          email_masked: string;
          handle: string;
          joined_at: string;
          may_act: boolean;
          may_read_audit_log: boolean;
          may_reveal_email: boolean;
          may_view_sanctions: boolean;
          pen_name: string;
          staff_roles: Database['public']['Enums']['staff_role'][];
          user_id: string;
        }[];
      };
      admin_user_id_for_handle: { Args: { wanted_handle: string }; Returns: string };
      admin_user_lookup: {
        Args: { search_text: string };
        Returns: {
          account_status: Database['public']['Enums']['account_status'];
          age_check_result: Database['public']['Enums']['age_check_result'];
          age_checked_at: string;
          handle: string;
          matched_by: string;
          open_case_count: number;
          pen_name: string;
          sanction_kinds: Database['public']['Enums']['sanction_kind'][];
          staff_roles: Database['public']['Enums']['staff_role'][];
          user_id: string;
        }[];
      };
      admin_waiting_decision_email_count: { Args: Record<PropertyKey, never>; Returns: number };
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
      age_check_numbers: { Args: Record<PropertyKey, never>; Returns: Json };
      another_appeals_decider_exists: { Args: Record<PropertyKey, never>; Returns: boolean };
      answer_report_detail_request: {
        Args: { answer_text: string; target_request_id: string };
        Returns: undefined;
      };
      attach_notice_to_case: {
        Args: {
          new_notice: Omit<
            Database['public']['Tables']['public_notices']['Row'],
            Database['public']['Tables']['public_notices']['ComputedFields']
          >;
        };
        Returns: string;
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
      avatar_upload_allowed: { Args: { object_name: string }; Returns: boolean };
      banned_email_hash: { Args: { email: string }; Returns: string };
      birth_year_needs_month: { Args: { birth_year: number; on_date: string }; Returns: boolean };
      bootstrap_first_owner: { Args: { target_user_id: string }; Returns: undefined };
      browse_stories: {
        Args: {
          category_slug?: string;
          completion?: Database['public']['Enums']['completion_status'];
          language?: string;
          list_key?: string;
          list_kind: string;
          page_offset?: number;
          page_size?: number;
          sort_order?: string;
        };
        Returns: Json;
      };
      cancel_schedule: { Args: { chapter_code: string }; Returns: Json };
      case_item_content: {
        Args: {
          target: Omit<
            Database['public']['Tables']['cases']['Row'],
            Database['public']['Tables']['cases']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      case_matches_queue_filters: {
        Args: {
          claimed_filter: string;
          reason_filter: Database['public']['Enums']['report_reason'];
          reported_handle: string;
          search_text: string;
          target: Omit<
            Database['public']['Tables']['cases']['Row'],
            Database['public']['Tables']['cases']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      cases_by_tier: { Args: { window_days: number }; Returns: Json };
      change_is_too_soon: {
        Args: { last_changed_at: string; setting_key: string };
        Returns: boolean;
      };
      chapter_blocks: {
        Args: { body: string };
        Returns: {
          block_number: number;
          block_text: string;
        }[];
      };
      chapter_code: { Args: Record<PropertyKey, never>; Returns: string };
      chapter_comments: {
        Args: { chapter_code: string; older_than?: string; story_slug: string };
        Returns: Json;
      };
      chapter_embed_references: {
        Args: { body: string };
        Returns: {
          embed_id: string;
        }[];
      };
      chapter_embed_states: { Args: { body: string; owner_id: string }; Returns: Json };
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
      chapter_like_count_of: { Args: { target_chapter_id: string }; Returns: number };
      chapter_like_state: { Args: { chapter_code: string; story_slug: string }; Returns: Json };
      chapter_like_totals: {
        Args: Record<PropertyKey, never>;
        Returns: {
          chapter_id: string;
          like_count: number;
          likes_last_7_days: number;
          story_id: string;
        }[];
      };
      chapter_picture_references: {
        Args: { body: string };
        Returns: {
          alt_text: string;
          picture_id: string;
        }[];
      };
      chapter_picture_states: { Args: { body: string; owner_id: string }; Returns: Json };
      chapter_picture_upload_allowed: { Args: { object_name: string }; Returns: boolean };
      chapter_place: {
        Args: { target_chapter_id: string };
        Returns: {
          number: number;
          total: number;
        }[];
      };
      chapter_publish_now: {
        Args: {
          chapter: Omit<
            Database['public']['Tables']['chapters']['Row'],
            Database['public']['Tables']['chapters']['ComputedFields']
          >;
        };
        Returns: undefined;
      };
      check_birthday: { Args: { wanted_day: number; wanted_month: number }; Returns: undefined };
      check_chapter_embeds: { Args: { body: string; owner_id: string }; Returns: undefined };
      check_chapter_pictures: { Args: { body: string; owner_id: string }; Returns: undefined };
      check_chapter_text: { Args: { body: string }; Returns: string };
      check_comment_text: { Args: { body: string }; Returns: string };
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
      classic_authors_dying_in: { Args: { died: number }; Returns: Json };
      classic_fix_is_small: {
        Args: { corrected_text: string; live_text: string };
        Returns: boolean;
      };
      classic_free_markets: {
        Args: {
          author_died_year: number;
          first_published_year: number;
          on_day: string;
          translator_died_year: number;
        };
        Returns: Json;
      };
      classic_import_row: { Args: { list_row: Json }; Returns: string };
      classic_kind_from_list: {
        Args: { list_type: string };
        Returns: Database['public']['Enums']['classic_kind'];
      };
      classic_source_title: { Args: { source_link: string }; Returns: string };
      classic_story_category: { Args: { details: Json }; Returns: string };
      classic_upsert_story: {
        Args: { details: Json; target_story_id: string; wanted_category_id: string };
        Returns: string;
      };
      classic_work_json: { Args: { target_story_id: string }; Returns: Json };
      classics_account_id: { Args: Record<PropertyKey, never>; Returns: string };
      clean_mail_text: { Args: { longest: number; raw_text: string }; Returns: string };
      clear_my_sign_in_failures: { Args: Record<PropertyKey, never>; Returns: undefined };
      close_finished_safety_checks: { Args: { target_country: string }; Returns: undefined };
      cms_content_problems: {
        Args: {
          version_row: Omit<
            Database['public']['Tables']['cms_versions']['Row'],
            Database['public']['Tables']['cms_versions']['ComputedFields']
          >;
        };
        Returns: string[];
      };
      cms_entry_problem: {
        Args: {
          wanted_key: string;
          wanted_kind: string;
          wanted_language: string;
          wanted_market: string;
        };
        Returns: string;
      };
      cms_home_page_problems: { Args: { page: Json }; Returns: string[] };
      cms_link_problems: {
        Args: { field_name: string; markdown: string; market: string };
        Returns: string[];
      };
      cms_live_content_of: {
        Args: {
          version_row: Omit<
            Database['public']['Tables']['cms_versions']['Row'],
            Database['public']['Tables']['cms_versions']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      cms_live_versions: {
        Args: { wanted_kind: string };
        Returns: {
          content: NonNullable<Json>;
          content_kind: string;
          created_at: string;
          entry_key: string;
          id: string;
          is_removal: boolean;
          language_code: string | null;
          market_code: string;
          published_at: string | null;
          show_from: string | null;
          show_until: string | null;
          status: string;
          updated_at: string;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'cms_versions';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      cms_text_problem: {
        Args: { field_name: string; field_value: string; longest: number };
        Returns: string;
      };
      comment_is_shown_to_caller: {
        Args: {
          target: Omit<
            Database['public']['Tables']['comments']['Row'],
            Database['public']['Tables']['comments']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      comment_json: {
        Args: {
          story_writer_id: string;
          target: Omit<
            Database['public']['Tables']['comments']['Row'],
            Database['public']['Tables']['comments']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      comment_reactions_json: { Args: { target_comment_id: string }; Returns: Json };
      comment_replies_json: { Args: { parent_id: string; story_writer_id: string }; Returns: Json };
      comment_state_for_caller: {
        Args: {
          target: Omit<
            Database['public']['Tables']['comments']['Row'],
            Database['public']['Tables']['comments']['ComputedFields']
          >;
        };
        Returns: string;
      };
      comment_wait_minutes: { Args: { author_id: string }; Returns: number };
      compliance_times_problem: { Args: { completed: string; received: string }; Returns: string };
      compute_daily_metrics: { Args: { for_day?: string }; Returns: number };
      compute_story_scores: { Args: Record<PropertyKey, never>; Returns: number };
      content_is_held_for_moderation: {
        Args: { item_id: string; item_type: Database['public']['Enums']['reportable_type'] };
        Returns: boolean;
      };
      count_links: { Args: { body: string }; Returns: number };
      count_words: { Args: { body: string }; Returns: number };
      cover_upload_allowed: { Args: { object_name: string }; Returns: boolean };
      create_chapter: { Args: { story_slug: string }; Returns: Json };
      create_monthly_safety_checks: { Args: Record<PropertyKey, never>; Returns: number };
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
      current_seasonal_doodle: {
        Args: { on_date: string; place: string };
        Returns: {
          doodle: Database['public']['Enums']['seasonal_doodle'];
        }[];
      };
      decide_case: {
        Args: {
          chosen_action: Database['public']['Enums']['moderation_action'];
          message_to_person: string;
          note_text: string;
          send_statement: boolean;
          suspension_days: number;
          target: Omit<
            Database['public']['Tables']['cases']['Row'],
            Database['public']['Tables']['cases']['ComputedFields']
          >;
        };
        Returns: undefined;
      };
      decider_of_statement: {
        Args: {
          target: Omit<
            Database['public']['Tables']['statements_of_reasons']['Row'],
            Database['public']['Tables']['statements_of_reasons']['ComputedFields']
          >;
        };
        Returns: string;
      };
      default_email_delivery: {
        Args: { kind: Database['public']['Enums']['notification_kind'] };
        Returns: Database['public']['Enums']['email_delivery'];
      };
      delete_chapter: { Args: { chapter_code: string }; Returns: Json };
      delete_comment: { Args: { comment_id: string }; Returns: boolean };
      delete_my_story: { Args: { story_slug: string }; Returns: Json };
      disconnect_canva: { Args: Record<PropertyKey, never>; Returns: boolean };
      display_name: { Args: { handle: string; pen_name: string }; Returns: string };
      downvote_comment: {
        Args: { comment_id: string; should_downvote: boolean };
        Returns: boolean;
      };
      email_delivery_for: {
        Args: { kind: Database['public']['Enums']['notification_kind']; target_user_id: string };
        Returns: string;
      };
      email_worker_act_as: {
        Args: { saved_claims?: string; target_user_id: string };
        Returns: undefined;
      };
      email_worker_claim: { Args: { batch_size?: number; worker_key: string }; Returns: Json };
      email_worker_items: {
        Args: {
          queued: Omit<
            Database['public']['Tables']['email_outbox']['Row'],
            Database['public']['Tables']['email_outbox']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      email_worker_key_matches: { Args: { worker_key: string }; Returns: boolean };
      email_worker_mark_sent: {
        Args: { outbox_ids: string[]; worker_key: string };
        Returns: number;
      };
      email_worker_unsubscribe_key: { Args: { target_user_id: string }; Returns: string };
      embed_json: {
        Args: {
          card: Omit<
            Database['public']['Tables']['chapter_embeds']['Row'],
            Database['public']['Tables']['chapter_embeds']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      end_my_session: { Args: { target_session_id: string }; Returns: boolean };
      escalate_on_call_alerts: { Args: Record<PropertyKey, never>; Returns: number };
      finishes_story: {
        Args: {
          read_percent: number;
          target_chapter: Omit<
            Database['public']['Tables']['chapters']['Row'],
            Database['public']['Tables']['chapters']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      fold_look_alike_characters: { Args: { name: string }; Returns: string };
      follow_story: { Args: { should_follow: boolean; story_slug: string }; Returns: Json };
      follow_writer: { Args: { should_follow: boolean; target_handle: string }; Returns: Json };
      follower_count_of: { Args: { writer_id: string }; Returns: number };
      generate_invite_code: { Args: Record<PropertyKey, never>; Returns: string };
      get_chapter: { Args: { chapter_code: string; story_slug: string }; Returns: Json };
      get_link_preview: { Args: { chapter_code?: string; story_slug: string }; Returns: Json };
      get_shared_passage: {
        Args: { chapter_code: string; first_block: number; last_block: number; story_slug: string };
        Returns: Json;
      };
      get_story_page: { Args: { story_slug: string }; Returns: Json };
      get_writer_profile: { Args: { wanted_handle: string }; Returns: Json };
      greeting_for: {
        Args: {
          birthday_day: number;
          birthday_month: number;
          greeting_day: string;
          joined_at: string;
        };
        Returns: string;
      };
      has_invisible_characters: { Args: { name: string }; Returns: boolean };
      hash_email: { Args: { email: string }; Returns: string };
      interface_text_live: {
        Args: { wanted_locale: string };
        Returns: {
          created_at: string;
          id: string;
          is_reset: boolean;
          locale: string;
          published_at: string | null;
          show_from: string | null;
          status: string;
          text: string;
          text_key: string;
          updated_at: string;
          user_id: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'interface_text_overrides';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      interface_text_live_text: {
        Args: { wanted_key: string; wanted_locale: string };
        Returns: string;
      };
      interface_text_problems: {
        Args: { brand_names: string[]; file_placeholders: string[]; new_text: string };
        Returns: string[];
      };
      invite_code_hash: { Args: { code: string }; Returns: string };
      is_active_member: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_blocked_with: { Args: { other_user_id: string }; Returns: boolean };
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
      is_story_list_kind: { Args: { list_kind: string }; Returns: boolean };
      issue_statement_of_reasons: {
        Args: {
          about: Json;
          chosen_action: Database['public']['Enums']['statement_action'];
          facts: string;
          ground: Database['public']['Enums']['statement_ground'];
          ground_key: string;
          recipient_id: string;
        };
        Returns: string;
      };
      item_for_public_address: {
        Args: { address: string };
        Returns: {
          item_id: string;
          item_type: Database['public']['Enums']['reportable_type'];
          owner_user_id: string;
        }[];
      };
      language_moderator_counts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          code: string;
          is_interface: boolean;
          moderators: number;
          status: Database['public']['Enums']['language_status'];
        }[];
      };
      latest_material_legal_version: { Args: { target_document_id: string }; Returns: string };
      latest_place_json: { Args: { target_story_id: string }; Returns: Json };
      launch_task: { Args: Record<PropertyKey, never>; Returns: Json };
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
      like_chapter: {
        Args: { chapter_code: string; should_like: boolean; story_slug: string };
        Returns: Json;
      };
      like_state_of: { Args: { target_chapter_id: string }; Returns: Json };
      list_default_sort: { Args: { list_kind: string }; Returns: string };
      list_holds_story: {
        Args: {
          list_key: string;
          list_kind: string;
          target: Omit<
            Database['public']['Tables']['stories']['Row'],
            Database['public']['Tables']['stories']['ComputedFields']
          >;
        };
        Returns: boolean;
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
      listed_stories: {
        Args: {
          category_slug: string;
          completion: Database['public']['Enums']['completion_status'];
          language: string;
          list_key: string;
          list_kind: string;
        };
        Returns: {
          ai_disclosure: Database['public']['Enums']['ai_disclosure'];
          ai_undisclosed_labelled_at: string | null;
          blurb: string;
          category_id: string;
          classic_author_id: string | null;
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
          picture_sharing_enabled: boolean;
          quote_cards_enabled: boolean;
          rank_badge_tag_ids: string[] | null;
          rating: Database['public']['Enums']['story_rating'];
          slug: string;
          title: string;
          updated_at: string;
          user_id: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'stories';
          isOneToOne: false;
          isSetofReturn: true;
        };
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
      make_quote_card: { Args: { chapter_code: string; story_slug: string }; Returns: Json };
      mark_notifications_read: { Args: { notification_ids?: string[] }; Returns: number };
      market_change_problem: {
        Args: {
          new_legal_check: Database['public']['Enums']['legal_check_status'];
          new_status: Database['public']['Enums']['market_status'];
          target: Omit<
            Database['public']['Tables']['markets']['Row'],
            Database['public']['Tables']['markets']['ComputedFields']
          >;
        };
        Returns: string;
      };
      marketing_email_allowed: { Args: { target_user_id: string }; Returns: boolean };
      mask_email: { Args: { address: string }; Returns: string };
      may_see_case: { Args: { case_is_safeguarding: boolean }; Returns: boolean };
      may_see_march_numbers: { Args: Record<PropertyKey, never>; Returns: boolean };
      metric_on: {
        Args: { for_day: string; wanted_market?: string; wanted_metric: string };
        Returns: number;
      };
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
      move_chapter: { Args: { chapter_code: string; direction: number }; Returns: Json };
      my_blocked_accounts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          blocked_at: string;
          display_name: string;
          handle: string;
        }[];
      };
      my_embeds: { Args: { embed_ids: string[] }; Returns: Json };
      my_followers: {
        Args: Record<PropertyKey, never>;
        Returns: {
          display_name: string;
          followed_at: string;
          handle: string;
        }[];
      };
      my_follows: { Args: Record<PropertyKey, never>; Returns: Json };
      my_greeting: { Args: Record<PropertyKey, never>; Returns: Json };
      my_legal_documents_to_accept: {
        Args: Record<PropertyKey, never>;
        Returns: {
          change_summary: string;
          document_slug: string;
          version_label: string;
        }[];
      };
      my_library: { Args: Record<PropertyKey, never>; Returns: Json };
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
      my_moderator_mail: {
        Args: Record<PropertyKey, never>;
        Returns: {
          last_message_at: string;
          reference: string;
          statement_reference: string;
          status: string;
          subject: string;
          team_replied_last: boolean;
        }[];
      };
      my_moderator_mail_thread: { Args: { thread_reference: string }; Returns: Json };
      my_notification_email_settings: { Args: Record<PropertyKey, never>; Returns: Json };
      my_notifications: { Args: { older_than?: string; page_size?: number }; Returns: Json };
      my_pending_pictures: {
        Args: Record<PropertyKey, never>;
        Returns: {
          attempts: number;
          kind: Database['public']['Enums']['picture_kind'];
          picture_id: string;
        }[];
      };
      my_picture_states: { Args: { picture_ids: string[] }; Returns: Json };
      my_place_in_chapter: { Args: { chapter_code: string; story_slug: string }; Returns: Json };
      my_report_detail_requests: {
        Args: Record<PropertyKey, never>;
        Returns: {
          asked_at: string;
          question: string;
          reason: Database['public']['Enums']['report_reason'];
          report_reference: string;
          request_id: string;
        }[];
      };
      my_reports: { Args: Record<PropertyKey, never>; Returns: Json };
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
      my_statements: { Args: Record<PropertyKey, never>; Returns: Json };
      my_unread_notification_count: { Args: Record<PropertyKey, never>; Returns: number };
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
      next_notice_reference: { Args: { notice_kind: string }; Returns: string };
      normalise_invite_code: { Args: { code: string }; Returns: string };
      normalise_pen_name: { Args: { typed_name: string }; Returns: string };
      normalise_romanian_letters: { Args: { input_text: string }; Returns: string };
      normalise_tag: { Args: { tag_name: string }; Returns: string };
      note_safety_contact_gap: { Args: { wanted_country_code: string }; Returns: undefined };
      notification_category: {
        Args: { kind: Database['public']['Enums']['notification_kind'] };
        Returns: string;
      };
      notification_is_shown: {
        Args: {
          target: Omit<
            Database['public']['Tables']['notifications']['Row'],
            Database['public']['Tables']['notifications']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      notification_item_json: { Args: { case_id: string }; Returns: Json };
      notification_json: {
        Args: {
          target: Omit<
            Database['public']['Tables']['notifications']['Row'],
            Database['public']['Tables']['notifications']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      notify: {
        Args: {
          about: Json;
          actor_id: string;
          group_key?: string;
          group_window?: string;
          notification_kind: Database['public']['Enums']['notification_kind'];
          recipient_id: string;
        };
        Returns: undefined;
      };
      notify_chapter_published: { Args: { payload: Json }; Returns: undefined };
      notify_comment_posted: { Args: { payload: Json }; Returns: undefined };
      occasion_covers: {
        Args: { ends_on: string; every_year: boolean; on_date: string; starts_on: string };
        Returns: boolean;
      };
      on_call_gaps: { Args: { from_time: string; to_time: string }; Returns: Json };
      on_call_now: { Args: { at_time?: string }; Returns: string };
      open_downvote_case: {
        Args: {
          target: Omit<
            Database['public']['Tables']['comments']['Row'],
            Database['public']['Tables']['comments']['ComputedFields']
          >;
        };
        Returns: undefined;
      };
      open_picture_case: {
        Args: {
          is_match: boolean;
          picture: Omit<
            Database['public']['Tables']['picture_checks']['Row'],
            Database['public']['Tables']['picture_checks']['ComputedFields']
          >;
        };
        Returns: string;
      };
      open_story_languages: { Args: Record<PropertyKey, never>; Returns: string[] };
      order_timeline_json: {
        Args: {
          target: Omit<
            Database['public']['Tables']['cases']['Row'],
            Database['public']['Tables']['cases']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      picture_check_is_signed: { Args: { payload: string; signature: string }; Returns: boolean };
      picture_is_visible: { Args: { bucket: string; path: string }; Returns: boolean };
      picture_reader_may_see: { Args: { bucket: string; path: string }; Returns: boolean };
      picture_state_json: {
        Args: {
          picture: Omit<
            Database['public']['Tables']['picture_checks']['Row'],
            Database['public']['Tables']['picture_checks']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      post_comment: {
        Args: {
          body: string;
          chapter_code: string;
          is_spoiler?: boolean;
          reply_to?: string;
          story_slug: string;
        };
        Returns: Json;
      };
      profile_avatar_picture: { Args: { profile_handle: string }; Returns: Json };
      profile_for_handle: {
        Args: { wanted_handle: string };
        Returns: {
          age_check_method: Database['public']['Enums']['age_check_method'] | null;
          age_check_result: Database['public']['Enums']['age_check_result'];
          age_checked_at: string | null;
          avatar_picture_id: string | null;
          bio: string;
          birth_month: number | null;
          birth_year: number;
          birthday_day: number | null;
          birthday_month: number | null;
          country_code: string | null;
          created_at: string;
          deleted_at: string | null;
          handle: string | null;
          handle_changed_at: string | null;
          handle_skeleton: string | null;
          handle_slug: string | null;
          id: string;
          locale: string;
          marketing_email_opt_in: boolean;
          pen_name: string | null;
          pen_name_changed_at: string | null;
          shows_online_status: boolean;
          updated_at: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      profile_story_cards: { Args: { is_owner: boolean; writer_id: string }; Returns: Json };
      public_notice_payload_is_signed: {
        Args: { payload: string; signature: string };
        Returns: boolean;
      };
      publish_chapter: { Args: { chapter_code: string }; Returns: Json };
      publish_due_chapters: { Args: Record<PropertyKey, never>; Returns: number };
      published_interface_text: {
        Args: { wanted_locale: string };
        Returns: {
          text: string;
          text_key: string;
        }[];
      };
      purge_deleted_chapters: { Args: Record<PropertyKey, never>; Returns: number };
      purge_deleted_comments: { Args: Record<PropertyKey, never>; Returns: number };
      purge_deleted_stories: { Args: Record<PropertyKey, never>; Returns: number };
      purge_old_client_errors: { Args: Record<PropertyKey, never>; Returns: number };
      purge_old_notifications: { Args: Record<PropertyKey, never>; Returns: number };
      purge_old_public_notices: { Args: Record<PropertyKey, never>; Returns: number };
      purge_rate_limit_events: { Args: Record<PropertyKey, never>; Returns: number };
      purge_sent_emails: { Args: Record<PropertyKey, never>; Returns: number };
      queue_daily_digests: { Args: Record<PropertyKey, never>; Returns: number };
      quote_card_state: { Args: { chapter_code: string; story_slug: string }; Returns: Json };
      ranking_setting: { Args: { fallback: number; setting_key: string }; Returns: number };
      rating_allows: {
        Args: { story_rating: Database['public']['Enums']['story_rating'] };
        Returns: boolean;
      };
      react_to_comment: {
        Args: { comment_id: string; wanted_kind: Database['public']['Enums']['reaction_kind'] };
        Returns: Json;
      };
      read_through_percent: { Args: { finished: number; readers: number }; Returns: number };
      readable_chapter: {
        Args: { chapter_code: string; story_slug: string };
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
        }[];
        SetofOptions: {
          from: '*';
          to: 'chapters';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      readable_chapter_for: {
        Args: { chapter_code: string; story_slug: string };
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
        }[];
        SetofOptions: {
          from: '*';
          to: 'chapters';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      reader_visible_story: {
        Args: { story_slug: string };
        Returns: {
          ai_disclosure: Database['public']['Enums']['ai_disclosure'];
          ai_undisclosed_labelled_at: string | null;
          blurb: string;
          category_id: string;
          classic_author_id: string | null;
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
          picture_sharing_enabled: boolean;
          quote_cards_enabled: boolean;
          rank_badge_tag_ids: string[] | null;
          rating: Database['public']['Enums']['story_rating'];
          slug: string;
          title: string;
          updated_at: string;
          user_id: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'stories';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      record_chapter_read: { Args: { chapter_code: string; story_slug: string }; Returns: boolean };
      record_chapter_share: {
        Args: { chapter_code: string; story_slug: string };
        Returns: boolean;
      };
      record_picture_check: {
        Args: { payload: string; signature: string };
        Returns: Database['public']['Enums']['picture_status'];
      };
      record_sign_in_failure: { Args: { email_hash: string }; Returns: string };
      record_sign_up_consent: {
        Args: { accepted_version_id: string; document_slug: string; new_user_id: string };
        Returns: undefined;
      };
      register_chapter_embed: {
        Args: {
          embed_author_name: string;
          embed_media_path: string;
          embed_service: Database['public']['Enums']['embed_service'];
          embed_source_url: string;
          embed_title: string;
          target_chapter_id: string;
        };
        Returns: string;
      };
      register_chapter_picture: {
        Args: { rights_confirmed: boolean; target_path: string };
        Returns: string;
      };
      register_picture: {
        Args: {
          picture_kind: Database['public']['Enums']['picture_kind'];
          target_bucket: string;
          target_path: string;
        };
        Returns: string;
      };
      removal_order_log_rows: { Args: Record<PropertyKey, never>; Returns: Json[] };
      rename_chapter: { Args: { chapter_code: string; title: string }; Returns: Json };
      renumber_story_chapters: { Args: { target_story_id: string }; Returns: undefined };
      reply_moderator_mail: { Args: { body: string; thread_reference: string }; Returns: boolean };
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
          copy_details?: Json;
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
      report_outcome_of: {
        Args: { decision: Database['public']['Enums']['moderation_action'] };
        Returns: string;
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
      require_account_action_allowed: {
        Args: { reason_given: string; target_user_id: string };
        Returns: undefined;
      };
      require_case_for_acting: {
        Args: { target_case_id: string };
        Returns: {
          claimed_at: string | null;
          claimed_by_user_id: string | null;
          created_at: string;
          deadline_at: string;
          decided_at: string | null;
          decided_by_user_id: string | null;
          decision: Database['public']['Enums']['moderation_action'] | null;
          disabled_at: string | null;
          id: string;
          is_safeguarding: boolean;
          item_id: string;
          item_type: Database['public']['Enums']['reportable_type'];
          preserve_until: string | null;
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
        SetofOptions: {
          from: '*';
          to: 'cases';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      require_classics_staff: { Args: Record<PropertyKey, never>; Returns: undefined };
      require_comment_allowed: {
        Args: {
          caller_id: string;
          story: Omit<
            Database['public']['Tables']['stories']['Row'],
            Database['public']['Tables']['stories']['ComputedFields']
          >;
        };
        Returns: undefined;
      };
      require_compliance_staff: { Args: Record<PropertyKey, never>; Returns: undefined };
      require_mail_thread_for_staff: {
        Args: { thread_reference: string };
        Returns: {
          assigned_to_user_id: string | null;
          created_at: string;
          id: string;
          last_message_at: string;
          reference: string;
          statement_id: string | null;
          status: string;
          subject: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'moderator_mail_threads';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      require_not_last_owner: {
        Args: { removed_role: Database['public']['Enums']['staff_role']; target_user_id: string };
        Returns: undefined;
      };
      require_role_change_allowed: {
        Args: { reason_given: string; target_user_id: string };
        Returns: undefined;
      };
      require_role_in_reach: {
        Args: { changed_role: Database['public']['Enums']['staff_role'] };
        Returns: undefined;
      };
      require_safety_contacts_staff: { Args: Record<PropertyKey, never>; Returns: undefined };
      require_settings_staff: { Args: Record<PropertyKey, never>; Returns: undefined };
      require_tag_staff: { Args: Record<PropertyKey, never>; Returns: undefined };
      require_website_staff: { Args: Record<PropertyKey, never>; Returns: undefined };
      restore_chapter: { Args: { chapter_code: string }; Returns: Json };
      restore_my_story: { Args: { story_slug: string }; Returns: Json };
      return_rate_on: { Args: { for_day: string }; Returns: number };
      romania_today: { Args: Record<PropertyKey, never>; Returns: string };
      run_daily_metrics: { Args: Record<PropertyKey, never>; Returns: number };
      run_email_worker: { Args: Record<PropertyKey, never>; Returns: boolean };
      run_notification_jobs: { Args: Record<PropertyKey, never>; Returns: number };
      safety_contact_values: {
        Args: {
          target: Omit<
            Database['public']['Tables']['safety_contacts']['Row'],
            Database['public']['Tables']['safety_contacts']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      sanction_end: {
        Args: { days: number; wanted_kind: Database['public']['Enums']['sanction_kind'] };
        Returns: string;
      };
      save_canva_connection: {
        Args: { access_ciphertext: string; access_expires: string; refresh_ciphertext: string };
        Returns: undefined;
      };
      save_chapter_draft: {
        Args: { body: string; chapter_code: string; expected_version: number; title: string };
        Returns: Json;
      };
      save_reading_position: {
        Args: {
          chapter_code: string;
          device_kind: string;
          read_percent: number;
          story_slug: string;
        };
        Returns: Json;
      };
      save_reading_settings: {
        Args: {
          wanted_font: Database['public']['Enums']['reading_font'];
          wanted_line_spacing: Database['public']['Enums']['reading_line_spacing'];
          wanted_line_width: Database['public']['Enums']['reading_line_width'];
          wanted_text_size: number;
          wanted_theme: Database['public']['Enums']['reading_theme'];
        };
        Returns: undefined;
      };
      schedule_chapter: { Args: { chapter_code: string; publish_at: string }; Returns: Json };
      scrub_error_text: { Args: { max_length: number; raw_text: string }; Returns: string };
      scrub_route_path: { Args: { raw_path: string }; Returns: string };
      search_fold: { Args: { raw_text: string }; Returns: string };
      search_like_pattern: { Args: { term: string }; Returns: string };
      search_query: { Args: { term: string }; Returns: unknown };
      search_tags: {
        Args: { page_offset?: number; page_size?: number; term: string };
        Returns: Json;
      };
      search_writers: {
        Args: { page_offset?: number; page_size?: number; term: string };
        Returns: Json;
      };
      seasonal_occasion_problems: {
        Args: {
          ends_on: string;
          every_year: boolean;
          name_en: string;
          name_ro: string;
          shows_on: string;
          starts_on: string;
        };
        Returns: string[];
      };
      send_moderator_mail: {
        Args: { body: string; statement_reference?: string; subject: string };
        Returns: Json;
      };
      set_block: { Args: { should_block: boolean; target_handle: string }; Returns: Json };
      set_chapter_order: { Args: { chapter_codes: string[]; story_slug: string }; Returns: Json };
      set_library_shelf: {
        Args: { story_slug: string; wanted_shelf: Database['public']['Enums']['library_shelf'] };
        Returns: Json;
      };
      set_marketing_email_opt_in: { Args: { wanted: boolean }; Returns: undefined };
      set_my_bio: { Args: { new_bio: string }; Returns: string };
      set_my_birthday: { Args: { wanted_day?: number; wanted_month?: number }; Returns: Json };
      set_my_handle: { Args: { new_handle: string }; Returns: string };
      set_my_locale: { Args: { new_locale: string }; Returns: string };
      set_my_pen_name: { Args: { new_pen_name: string }; Returns: string };
      set_notification_email: {
        Args: {
          delivery: Database['public']['Enums']['email_delivery'];
          kind: Database['public']['Enums']['notification_kind'];
        };
        Returns: undefined;
      };
      set_rank_badge_tags: { Args: { story_slug: string; tag_names: string[] }; Returns: Json };
      set_story_tags: {
        Args: { owner_id: string; tag_names: string[]; target_story_id: string };
        Returns: undefined;
      };
      setting_value: { Args: { setting_key: string }; Returns: Json };
      setting_value_problem: { Args: { new_value: Json; old_value: Json }; Returns: string };
      share_options: { Args: { chapter_code: string; story_slug: string }; Returns: Json };
      shareable_chapter: {
        Args: { chapter_code: string; story_slug: string };
        Returns: {
          chapter_id: string;
          quote_cards_enabled: boolean;
          writer_id: string;
        }[];
      };
      shared_block: {
        Args: {
          block_text: string;
          story: Omit<
            Database['public']['Tables']['stories']['Row'],
            Database['public']['Tables']['stories']['ComputedFields']
          >;
          target_chapter_id: string;
        };
        Returns: Json;
      };
      show_passed_avatar: {
        Args: {
          picture: Omit<
            Database['public']['Tables']['picture_checks']['Row'],
            Database['public']['Tables']['picture_checks']['ComputedFields']
          >;
        };
        Returns: undefined;
      };
      shown_count: { Args: { total: number }; Returns: number };
      sign_in_pause_until: { Args: { email_hash: string }; Returns: string };
      sign_out_everywhere: { Args: { target_user_id: string }; Returns: undefined };
      sign_up_age_outcome: { Args: { birth_month?: number; birth_year: number }; Returns: string };
      sign_up_birth_month: { Args: { birth_year: number; sign_up_data: Json }; Returns: number };
      sign_up_birth_year: { Args: { sign_up_data: Json }; Returns: number };
      sign_up_handle: { Args: { sign_up_data: Json }; Returns: string };
      sign_up_market_outcome: {
        Args: { birth_month?: number; birth_year: number; country_code: string };
        Returns: string;
      };
      sign_ups_by_age_group: { Args: Record<PropertyKey, never>; Returns: Json };
      signed_up_reader_count: { Args: { for_day: string }; Returns: number };
      staff_may: { Args: { target_area: string; wanted_access?: string }; Returns: boolean };
      staff_session_started_at: { Args: Record<PropertyKey, never>; Returns: string };
      staff_signed_in_recently: { Args: Record<PropertyKey, never>; Returns: boolean };
      statement_ground_for_case: {
        Args: {
          target: Omit<
            Database['public']['Tables']['cases']['Row'],
            Database['public']['Tables']['cases']['ComputedFields']
          >;
        };
        Returns: {
          ground: Database['public']['Enums']['statement_ground'];
          ground_key: string;
        }[];
      };
      statement_json: {
        Args: {
          target: Omit<
            Database['public']['Tables']['statements_of_reasons']['Row'],
            Database['public']['Tables']['statements_of_reasons']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      story_card_json: { Args: { target_story_id: string }; Returns: Json };
      story_classic_author: { Args: { target_story_id: string }; Returns: Json };
      story_comment_total: { Args: { target_story_id: string }; Returns: number };
      story_cover_picture: { Args: { story_slug: string }; Returns: Json };
      story_follow_state: { Args: { story_slug: string }; Returns: Json };
      story_follower_count_of: { Args: { target_story_id: string }; Returns: number };
      story_has_copied_work_note: { Args: { target_story_id: string }; Returns: boolean };
      story_has_readable_chapter: { Args: { target_story_id: string }; Returns: boolean };
      story_language_choices: {
        Args: Record<PropertyKey, never>;
        Returns: {
          code: string;
          is_open: boolean;
        }[];
      };
      story_library_state: { Args: { story_slug: string }; Returns: Json };
      story_like_total: { Args: { target_story_id: string }; Returns: number };
      story_matches_search: {
        Args: {
          target: Omit<
            Database['public']['Tables']['stories']['Row'],
            Database['public']['Tables']['stories']['ComputedFields']
          >;
          term: string;
        };
        Returns: boolean;
      };
      story_page_chapters: { Args: { is_owner: boolean; target_story_id: string }; Returns: Json };
      story_rank_in_tag: {
        Args: { tag_name: string; target_story_id: string };
        Returns: {
          stories_in_tag: number;
          tag_rank: number;
        }[];
      };
      story_search_document: { Args: { target_story_id: string }; Returns: unknown };
      story_search_rank: {
        Args: {
          target: Omit<
            Database['public']['Tables']['stories']['Row'],
            Database['public']['Tables']['stories']['ComputedFields']
          >;
          term: string;
        };
        Returns: number;
      };
      story_search_text: { Args: { target_story_id: string }; Returns: string };
      story_share_points: {
        Args: Record<PropertyKey, never>;
        Returns: {
          points: number;
          story_id: string;
        }[];
      };
      story_shares_content: {
        Args: { story_rating: Database['public']['Enums']['story_rating'] };
        Returns: boolean;
      };
      story_signals: {
        Args: Record<PropertyKey, never>;
        Returns: {
          comments: number;
          likes: number;
          read_through: number;
          reads: number;
          story_id: string;
        }[];
      };
      story_slug_for: { Args: { title: string }; Returns: string };
      story_tag_ranks: {
        Args: { story_slug: string };
        Returns: {
          is_badge: boolean;
          is_picked: boolean;
          stories_in_tag: number;
          tag_name: string;
          tag_rank: number;
        }[];
      };
      story_writer_name: {
        Args: { target_story_id: string; writer_handle: string; writer_pen_name: string };
        Returns: string;
      };
      strip_combining_marks: { Args: { name: string }; Returns: string };
      submit_appeal: { Args: { explanation: string; statement_reference: string }; Returns: Json };
      submit_public_notice: {
        Args: { payload: string; signature: string };
        Returns: {
          notice_reference: string;
          received_at: string;
        }[];
      };
      tag_for_name: {
        Args: { include_waiting?: boolean; preferred_language?: string; typed_name: string };
        Returns: string;
      };
      tag_name_problems: { Args: { names: Json; target_tag_id: string }; Returns: string[] };
      take_rate_limit: { Args: { action: string }; Returns: undefined };
      teaser_of: { Args: { chapter_body: string; word_limit: number }; Returns: string };
      text_placeholders: { Args: { value: string }; Returns: string[] };
      tier_hours: {
        Args: { target_tier: Database['public']['Enums']['case_tier'] };
        Returns: number;
      };
      tier_rank: {
        Args: { target_tier: Database['public']['Enums']['case_tier'] };
        Returns: number;
      };
      undo_decision_for_appeal: {
        Args: {
          appeal_reference: string;
          statement: Omit<
            Database['public']['Tables']['statements_of_reasons']['Row'],
            Database['public']['Tables']['statements_of_reasons']['ComputedFields']
          >;
        };
        Returns: undefined;
      };
      unpublish_chapter: { Args: { chapter_code: string }; Returns: Json };
      unsubscribe_from_emails: { Args: { unsubscribe_key: string }; Returns: boolean };
      update_my_story: { Args: { changes: Json; story_slug: string }; Returns: Json };
      update_published_chapter: { Args: { chapter_code: string }; Returns: Json };
      use_platform_invite: { Args: { code: string; new_user_id: string }; Returns: undefined };
      username_skeleton: { Args: { name: string }; Returns: string };
      verified_signup_country: { Args: { token: string }; Returns: string };
      wait_minutes_until_free: { Args: { oldest_in_window: string }; Returns: number };
      website_content: {
        Args: { visitor_country?: string; wanted_kind: string; wanted_language?: string };
        Returns: {
          content: Json;
          entry_key: string;
          language_code: string;
          market_code: string;
          show_from: string;
          show_until: string;
        }[];
      };
      with_comma_below: { Args: { value: string }; Returns: string };
      word_total: { Args: { any_text: string }; Returns: number };
      writer_chapter_numbers: {
        Args: { since: string; writer_id: string };
        Returns: {
          chapter_id: string;
          comments: number;
          finished: number;
          likes: number;
          readers: number;
          reads: number;
          shares: number;
        }[];
      };
      writer_dashboard: { Args: { period?: string }; Returns: Json };
      writer_dashboard_chapters: { Args: { writer_id: string }; Returns: Json };
      writer_follow_state: { Args: { wanted_handle: string }; Returns: Json };
      writer_followers_by_week: { Args: { writer_id: string }; Returns: Json };
      writer_latest_comments: { Args: { writer_id: string }; Returns: Json };
      writers_published_by_market: {
        Args: { for_day: string };
        Returns: {
          market: string;
          writer_count: number;
        }[];
      };
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
      ai_disclosure: 'no_ai' | 'ai_brainstorming' | 'partly_ai_written';
      appeal_status: 'open' | 'upheld' | 'overturned';
      audit_actor: 'person' | 'system';
      case_source: 'report' | 'authority_order' | 'picture_check' | 'downvotes';
      case_status: 'open' | 'decided';
      case_tier: 'one_hour' | 'same_day' | 'two_days' | 'seven_days';
      chapter_status: 'draft' | 'scheduled' | 'published';
      classic_kind: 'novel' | 'short_story' | 'fairy_tale' | 'poem' | 'play' | 'essay';
      comment_deleted_by: 'author' | 'writer';
      completion_status: 'ongoing' | 'completed';
      compliance_entry_kind: 'authority_order' | 'legal_request' | 'launch_notice';
      cover_kind: 'automatic' | 'drawn' | 'upload';
      email_delivery: 'instant' | 'daily' | 'off';
      embed_service: 'youtube' | 'vimeo' | 'loom' | 'spotify' | 'apple_music';
      language_status: 'open' | 'ready' | 'closed';
      legal_check_status: 'not_started' | 'in_progress' | 'done';
      library_shelf: 'reading' | 'saved' | 'finished';
      market_status: 'open' | 'ready' | 'closed';
      moderated_state: 'hidden' | 'removed';
      moderation_action:
        'no_action' | 'hide' | 'remove' | 'restrict' | 'warn' | 'suspend' | 'ban' | 'public_note';
      notification_kind:
        | 'new_chapter'
        | 'comment_on_chapter'
        | 'comment_reply'
        | 'comment_reactions'
        | 'new_follower'
        | 'moderation_decision'
        | 'report_outcome'
        | 'appeal_decided'
        | 'moderator_mail_reply'
        | 'tag_rejected';
      picture_kind:
        'cover' | 'avatar' | 'chapter_picture' | 'drawing' | 'quote_card' | 'space_banner';
      picture_status: 'pending' | 'passed' | 'held' | 'approved' | 'removed';
      reaction_kind: 'heart' | 'fire' | 'laugh' | 'wow' | 'sad' | 'star';
      reading_font: 'sans' | 'serif' | 'dyslexia_friendly';
      reading_line_spacing: 'compact' | 'normal' | 'wide';
      reading_line_width: 'narrow' | 'medium' | 'wide';
      reading_theme: 'light' | 'sepia' | 'night';
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
      reportable_type: 'profile' | 'story' | 'chapter' | 'comment' | 'picture' | 'embed';
      revision_reason: 'published' | 'edited' | 'restored';
      safety_contact_kind:
        | 'emergency'
        | 'child_helpline'
        | 'csam_hotline'
        | 'crisis_youth'
        | 'police_online_child'
        | 'regulator';
      sanction_kind: 'warning' | 'suspension' | 'ban' | 'reporting_pause';
      seasonal_doodle:
        | 'autumn_leaf'
        | 'bee'
        | 'butterfly'
        | 'candle'
        | 'cherry_blossom'
        | 'daisy'
        | 'friendly_ghost'
        | 'hot_air_balloon'
        | 'hot_chocolate'
        | 'jack_o_lantern'
        | 'kite'
        | 'mushroom'
        | 'rain_cloud'
        | 'sunny_face';
      staff_permission: 'safeguarding' | 'teacher_checks' | 'on_call';
      staff_role: 'owner' | 'admin' | 'moderator' | 'support' | 'content_editor';
      statement_action:
        | 'hide'
        | 'remove'
        | 'restrict'
        | 'warn'
        | 'suspend'
        | 'ban'
        | 'public_note'
        | 'reporting_pause'
        | 'rating_raised'
        | 'ai_label_added';
      statement_ground: 'terms' | 'law';
      story_rating: 'all_ages' | '13_plus' | '16_plus' | '18_plus';
      tag_status: 'waiting' | 'approved' | 'rejected';
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
        claimed_by_handle: string | null;
        claimed_at: string | null;
        claimed_by_me: boolean | null;
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
      ai_disclosure: ['no_ai', 'ai_brainstorming', 'partly_ai_written'],
      appeal_status: ['open', 'upheld', 'overturned'],
      audit_actor: ['person', 'system'],
      case_source: ['report', 'authority_order', 'picture_check', 'downvotes'],
      case_status: ['open', 'decided'],
      case_tier: ['one_hour', 'same_day', 'two_days', 'seven_days'],
      chapter_status: ['draft', 'scheduled', 'published'],
      classic_kind: ['novel', 'short_story', 'fairy_tale', 'poem', 'play', 'essay'],
      comment_deleted_by: ['author', 'writer'],
      completion_status: ['ongoing', 'completed'],
      compliance_entry_kind: ['authority_order', 'legal_request', 'launch_notice'],
      cover_kind: ['automatic', 'drawn', 'upload'],
      email_delivery: ['instant', 'daily', 'off'],
      embed_service: ['youtube', 'vimeo', 'loom', 'spotify', 'apple_music'],
      language_status: ['open', 'ready', 'closed'],
      legal_check_status: ['not_started', 'in_progress', 'done'],
      library_shelf: ['reading', 'saved', 'finished'],
      market_status: ['open', 'ready', 'closed'],
      moderated_state: ['hidden', 'removed'],
      moderation_action: [
        'no_action',
        'hide',
        'remove',
        'restrict',
        'warn',
        'suspend',
        'ban',
        'public_note',
      ],
      notification_kind: [
        'new_chapter',
        'comment_on_chapter',
        'comment_reply',
        'comment_reactions',
        'new_follower',
        'moderation_decision',
        'report_outcome',
        'appeal_decided',
        'moderator_mail_reply',
        'tag_rejected',
      ],
      picture_kind: ['cover', 'avatar', 'chapter_picture', 'drawing', 'quote_card', 'space_banner'],
      picture_status: ['pending', 'passed', 'held', 'approved', 'removed'],
      reaction_kind: ['heart', 'fire', 'laugh', 'wow', 'sad', 'star'],
      reading_font: ['sans', 'serif', 'dyslexia_friendly'],
      reading_line_spacing: ['compact', 'normal', 'wide'],
      reading_line_width: ['narrow', 'medium', 'wide'],
      reading_theme: ['light', 'sepia', 'night'],
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
      reportable_type: ['profile', 'story', 'chapter', 'comment', 'picture', 'embed'],
      revision_reason: ['published', 'edited', 'restored'],
      safety_contact_kind: [
        'emergency',
        'child_helpline',
        'csam_hotline',
        'crisis_youth',
        'police_online_child',
        'regulator',
      ],
      sanction_kind: ['warning', 'suspension', 'ban', 'reporting_pause'],
      seasonal_doodle: [
        'autumn_leaf',
        'bee',
        'butterfly',
        'candle',
        'cherry_blossom',
        'daisy',
        'friendly_ghost',
        'hot_air_balloon',
        'hot_chocolate',
        'jack_o_lantern',
        'kite',
        'mushroom',
        'rain_cloud',
        'sunny_face',
      ],
      staff_permission: ['safeguarding', 'teacher_checks', 'on_call'],
      staff_role: ['owner', 'admin', 'moderator', 'support', 'content_editor'],
      statement_action: [
        'hide',
        'remove',
        'restrict',
        'warn',
        'suspend',
        'ban',
        'public_note',
        'reporting_pause',
        'rating_raised',
        'ai_label_added',
      ],
      statement_ground: ['terms', 'law'],
      story_rating: ['all_ages', '13_plus', '16_plus', '18_plus'],
      tag_status: ['waiting', 'approved', 'rejected'],
    },
  },
} as const;
