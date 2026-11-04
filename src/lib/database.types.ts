export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      abuse_image_evidence: {
        Row: {
          case_id: string | null;
          case_reference: string;
          created_at: string;
          described_by_user_id: string | null;
          description: string;
          file_sha256: string | null;
          id: string;
          keep_until: string;
          legal_hold: boolean;
          legal_hold_reason: string | null;
          picture_id: string | null;
          picture_kind: Database['public']['Enums']['picture_kind'];
          reported_at: string;
          source: string;
          updated_at: string;
          uploaded_at: string;
          uploader_ip_period: string | null;
          uploader_ip_scrambled: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          case_id?: string | null;
          case_reference: string;
          created_at?: string;
          described_by_user_id?: string | null;
          description: string;
          file_sha256?: string | null;
          id?: string;
          keep_until: string;
          legal_hold?: boolean;
          legal_hold_reason?: string | null;
          picture_id?: string | null;
          picture_kind: Database['public']['Enums']['picture_kind'];
          reported_at?: string;
          source: string;
          updated_at?: string;
          uploaded_at: string;
          uploader_ip_period?: string | null;
          uploader_ip_scrambled?: string | null;
          user_id: string;
        };
        Update: {
          case_id?: string | null;
          case_reference?: string;
          created_at?: string;
          described_by_user_id?: string | null;
          description?: string;
          file_sha256?: string | null;
          id?: string;
          keep_until?: string;
          legal_hold?: boolean;
          legal_hold_reason?: string | null;
          picture_id?: string | null;
          picture_kind?: Database['public']['Enums']['picture_kind'];
          reported_at?: string;
          source?: string;
          updated_at?: string;
          uploaded_at?: string;
          uploader_ip_period?: string | null;
          uploader_ip_scrambled?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'abuse_image_evidence_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'abuse_image_evidence_described_by_user_id_fkey';
            columns: ['described_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'abuse_image_evidence_picture_id_fkey';
            columns: ['picture_id'];
            isOneToOne: false;
            referencedRelation: 'picture_checks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'abuse_image_evidence_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      account_deletions: {
        Row: {
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string;
          delete_after: string;
          id: string;
          requested_at: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          delete_after: string;
          id?: string;
          requested_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          delete_after?: string;
          id?: string;
          requested_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_deletions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      ad_slots: {
        Row: {
          created_at: string;
          format: Database['public']['Enums']['ad_format'];
          id: string;
          is_on: boolean;
          page_key: string;
          position: number;
          slot_key: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          format: Database['public']['Enums']['ad_format'];
          id?: string;
          is_on?: boolean;
          page_key: string;
          position: number;
          slot_key: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          format?: Database['public']['Enums']['ad_format'];
          id?: string;
          is_on?: boolean;
          page_key?: string;
          position?: number;
          slot_key?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      age_check_attempts: {
        Row: {
          created_at: string;
          id: string;
          method: Database['public']['Enums']['age_check_method'];
          outcome: string;
          threshold: number;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          method: Database['public']['Enums']['age_check_method'];
          outcome: string;
          threshold: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          method?: Database['public']['Enums']['age_check_method'];
          outcome?: string;
          threshold?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'age_check_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      age_check_sessions: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          threshold: number;
          updated_at: string;
          user_id: string;
          yoti_session_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          threshold: number;
          updated_at?: string;
          user_id: string;
          yoti_session_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          threshold?: number;
          updated_at?: string;
          user_id?: string;
          yoti_session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'age_check_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
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
      case_account_links: {
        Row: {
          case_id: string;
          created_at: string;
          id: string;
          linked_by_user_id: string | null;
          linked_user_id: string;
          reason: string;
          remove_reason: string | null;
          removed_at: string | null;
          removed_by_user_id: string | null;
          source: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          case_id: string;
          created_at?: string;
          id?: string;
          linked_by_user_id?: string | null;
          linked_user_id: string;
          reason: string;
          remove_reason?: string | null;
          removed_at?: string | null;
          removed_by_user_id?: string | null;
          source: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          case_id?: string;
          created_at?: string;
          id?: string;
          linked_by_user_id?: string | null;
          linked_user_id?: string;
          reason?: string;
          remove_reason?: string | null;
          removed_at?: string | null;
          removed_by_user_id?: string | null;
          source?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'case_account_links_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'case_account_links_linked_by_user_id_fkey';
            columns: ['linked_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'case_account_links_linked_user_id_fkey';
            columns: ['linked_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'case_account_links_removed_by_user_id_fkey';
            columns: ['removed_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'case_account_links_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
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
      certificates: {
        Row: {
          class_name: string | null;
          code: string;
          contest_id: string | null;
          created_at: string;
          id: string;
          printed_name: string | null;
          programme_name: string;
          result: Database['public']['Enums']['certificate_result'];
          revoke_reason: string | null;
          revoked_at: string | null;
          revoked_by_user_id: string | null;
          school_name: string | null;
          signed_at: string;
          space_id: string | null;
          teacher_name: string | null;
          teacher_user_id: string | null;
          updated_at: string;
          user_id: string;
          certificate_name_deleted_on: string | null;
          certificate_status: string | null;
        };
        ComputedFields: 'certificate_name_deleted_on' | 'certificate_status';
        Insert: {
          class_name?: string | null;
          code: string;
          contest_id?: string | null;
          created_at?: string;
          id?: string;
          printed_name?: string | null;
          programme_name: string;
          result: Database['public']['Enums']['certificate_result'];
          revoke_reason?: string | null;
          revoked_at?: string | null;
          revoked_by_user_id?: string | null;
          school_name?: string | null;
          signed_at?: string;
          space_id?: string | null;
          teacher_name?: string | null;
          teacher_user_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          class_name?: string | null;
          code?: string;
          contest_id?: string | null;
          created_at?: string;
          id?: string;
          printed_name?: string | null;
          programme_name?: string;
          result?: Database['public']['Enums']['certificate_result'];
          revoke_reason?: string | null;
          revoked_at?: string | null;
          revoked_by_user_id?: string | null;
          school_name?: string | null;
          signed_at?: string;
          space_id?: string | null;
          teacher_name?: string | null;
          teacher_user_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'certificates_contest_id_fkey';
            columns: ['contest_id'];
            isOneToOne: false;
            referencedRelation: 'contests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'certificates_revoked_by_user_id_fkey';
            columns: ['revoked_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'certificates_space_id_fkey';
            columns: ['space_id'];
            isOneToOne: false;
            referencedRelation: 'spaces';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'certificates_teacher_user_id_fkey';
            columns: ['teacher_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'certificates_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
      chapter_plan_characters: {
        Row: {
          chapter_id: string;
          character_id: string;
          created_at: string;
          story_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          chapter_id: string;
          character_id: string;
          created_at?: string;
          story_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          chapter_id?: string;
          character_id?: string;
          created_at?: string;
          story_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chapter_plan_characters_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapter_plans';
            referencedColumns: ['chapter_id'];
          },
          {
            foreignKeyName: 'chapter_plan_characters_character_id_fkey';
            columns: ['character_id'];
            isOneToOne: false;
            referencedRelation: 'story_characters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chapter_plan_characters_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'story_plans';
            referencedColumns: ['story_id'];
          },
          {
            foreignKeyName: 'chapter_plan_characters_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chapter_plans: {
        Row: {
          act_id: string | null;
          chapter_id: string;
          created_at: string;
          kind: string;
          location: string;
          planning_status: string;
          pov_character_id: string | null;
          story_id: string;
          summary: string;
          updated_at: string;
          user_id: string;
          word_target: number | null;
          world_date: string;
          world_sort: number | null;
        };
        ComputedFields: never;
        Insert: {
          act_id?: string | null;
          chapter_id: string;
          created_at?: string;
          kind?: string;
          location?: string;
          planning_status?: string;
          pov_character_id?: string | null;
          story_id: string;
          summary?: string;
          updated_at?: string;
          user_id: string;
          word_target?: number | null;
          world_date?: string;
          world_sort?: number | null;
        };
        Update: {
          act_id?: string | null;
          chapter_id?: string;
          created_at?: string;
          kind?: string;
          location?: string;
          planning_status?: string;
          pov_character_id?: string | null;
          story_id?: string;
          summary?: string;
          updated_at?: string;
          user_id?: string;
          word_target?: number | null;
          world_date?: string;
          world_sort?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'chapter_plans_act_id_fkey';
            columns: ['act_id'];
            isOneToOne: false;
            referencedRelation: 'story_plan_acts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chapter_plans_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: true;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chapter_plans_pov_character_id_fkey';
            columns: ['pov_character_id'];
            isOneToOne: false;
            referencedRelation: 'story_characters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chapter_plans_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'story_plans';
            referencedColumns: ['story_id'];
          },
          {
            foreignKeyName: 'chapter_plans_user_id_fkey';
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
      chapter_scenes: {
        Row: {
          chapter_id: string;
          created_at: string;
          id: string;
          position: number;
          pov_character_id: string | null;
          status: string;
          story_id: string;
          summary: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          chapter_id: string;
          created_at?: string;
          id?: string;
          position: number;
          pov_character_id?: string | null;
          status?: string;
          story_id: string;
          summary?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          chapter_id?: string;
          created_at?: string;
          id?: string;
          position?: number;
          pov_character_id?: string | null;
          status?: string;
          story_id?: string;
          summary?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chapter_scenes_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapter_plans';
            referencedColumns: ['chapter_id'];
          },
          {
            foreignKeyName: 'chapter_scenes_pov_character_id_fkey';
            columns: ['pov_character_id'];
            isOneToOne: false;
            referencedRelation: 'story_characters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chapter_scenes_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'story_plans';
            referencedColumns: ['story_id'];
          },
          {
            foreignKeyName: 'chapter_scenes_user_id_fkey';
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
      comment_nudge_words: {
        Row: {
          created_at: string;
          id: string;
          language: string;
          phrase: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          language: string;
          phrase: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          language?: string;
          phrase?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          paragraph_key: string | null;
          paragraph_number: number | null;
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
          paragraph_key?: string | null;
          paragraph_number?: number | null;
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
          paragraph_key?: string | null;
          paragraph_number?: number | null;
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
      contest_entries: {
        Row: {
          award: string | null;
          contest_id: string;
          created_at: string;
          disqualified_at: string | null;
          disqualified_by_user_id: string | null;
          entered_at: string;
          id: string;
          prize_parent_consent: boolean;
          prize_sent_at: string | null;
          statement_id: string | null;
          status: string;
          story_id: string;
          updated_at: string;
          user_id: string;
          withdrawn_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          award?: string | null;
          contest_id: string;
          created_at?: string;
          disqualified_at?: string | null;
          disqualified_by_user_id?: string | null;
          entered_at?: string;
          id?: string;
          prize_parent_consent?: boolean;
          prize_sent_at?: string | null;
          statement_id?: string | null;
          status?: string;
          story_id: string;
          updated_at?: string;
          user_id: string;
          withdrawn_at?: string | null;
        };
        Update: {
          award?: string | null;
          contest_id?: string;
          created_at?: string;
          disqualified_at?: string | null;
          disqualified_by_user_id?: string | null;
          entered_at?: string;
          id?: string;
          prize_parent_consent?: boolean;
          prize_sent_at?: string | null;
          statement_id?: string | null;
          status?: string;
          story_id?: string;
          updated_at?: string;
          user_id?: string;
          withdrawn_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contest_entries_contest_id_fkey';
            columns: ['contest_id'];
            isOneToOne: false;
            referencedRelation: 'contests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contest_entries_disqualified_by_user_id_fkey';
            columns: ['disqualified_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contest_entries_statement_id_fkey';
            columns: ['statement_id'];
            isOneToOne: false;
            referencedRelation: 'statements_of_reasons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contest_entries_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contest_entries_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      contests: {
        Row: {
          age_groups: string[];
          created_at: string;
          entries_close_on: string | null;
          entries_open_on: string | null;
          id: string;
          judges: string;
          landing_page_id: string;
          language_codes: string[];
          market_codes: string[];
          name_en: string;
          name_ro: string;
          opened_at: string | null;
          prize_delivered_by: string;
          prize_en: string;
          prize_ro: string;
          results_on: string | null;
          results_published_at: string | null;
          rules_page_key: string | null;
          updated_at: string;
          user_id: string | null;
          what_counts_en: string;
          what_counts_ro: string;
          word_limit: number | null;
          contest_detail_problems: string[] | null;
          contest_entries_have_closed: boolean | null;
          contest_landing_problems: string[] | null;
          contest_problems: string[] | null;
          contest_rules_are_published: boolean | null;
          contest_takes_entries_today: boolean | null;
          contest_writer_fits: boolean | null;
        };
        ComputedFields:
          | 'contest_detail_problems'
          | 'contest_entries_have_closed'
          | 'contest_landing_problems'
          | 'contest_problems'
          | 'contest_rules_are_published'
          | 'contest_takes_entries_today'
          | 'contest_writer_fits';
        Insert: {
          age_groups?: string[];
          created_at?: string;
          entries_close_on?: string | null;
          entries_open_on?: string | null;
          id?: string;
          judges?: string;
          landing_page_id: string;
          language_codes?: string[];
          market_codes?: string[];
          name_en?: string;
          name_ro?: string;
          opened_at?: string | null;
          prize_delivered_by?: string;
          prize_en?: string;
          prize_ro?: string;
          results_on?: string | null;
          results_published_at?: string | null;
          rules_page_key?: string | null;
          updated_at?: string;
          user_id?: string | null;
          what_counts_en?: string;
          what_counts_ro?: string;
          word_limit?: number | null;
        };
        Update: {
          age_groups?: string[];
          created_at?: string;
          entries_close_on?: string | null;
          entries_open_on?: string | null;
          id?: string;
          judges?: string;
          landing_page_id?: string;
          language_codes?: string[];
          market_codes?: string[];
          name_en?: string;
          name_ro?: string;
          opened_at?: string | null;
          prize_delivered_by?: string;
          prize_en?: string;
          prize_ro?: string;
          results_on?: string | null;
          results_published_at?: string | null;
          rules_page_key?: string | null;
          updated_at?: string;
          user_id?: string | null;
          what_counts_en?: string;
          what_counts_ro?: string;
          word_limit?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contests_landing_page_id_fkey';
            columns: ['landing_page_id'];
            isOneToOne: true;
            referencedRelation: 'landing_pages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          last_read_at: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          conversation_id: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          last_read_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          last_read_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversation_members_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          id: string;
          last_message_at: string;
          recipient_user_id: string;
          status: Database['public']['Enums']['conversation_status'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          id?: string;
          last_message_at?: string;
          recipient_user_id: string;
          status?: Database['public']['Enums']['conversation_status'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          id?: string;
          last_message_at?: string;
          recipient_user_id?: string;
          status?: Database['public']['Enums']['conversation_status'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_recipient_user_id_fkey';
            columns: ['recipient_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_user_id_fkey';
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
      customisation_change_requests: {
        Row: {
          created_at: string;
          due_at: string;
          id: string;
          item: string;
          outcome: string | null;
          reason: string;
          requested_by_user_id: string | null;
          resolved_at: string | null;
          space_id: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          due_at?: string;
          id?: string;
          item: string;
          outcome?: string | null;
          reason: string;
          requested_by_user_id?: string | null;
          resolved_at?: string | null;
          space_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          due_at?: string;
          id?: string;
          item?: string;
          outcome?: string | null;
          reason?: string;
          requested_by_user_id?: string | null;
          resolved_at?: string | null;
          space_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customisation_change_requests_requested_by_user_id_fkey';
            columns: ['requested_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customisation_change_requests_space_id_fkey';
            columns: ['space_id'];
            isOneToOne: false;
            referencedRelation: 'spaces';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customisation_change_requests_user_id_fkey';
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
      data_requests: {
        Row: {
          channel: Database['public']['Enums']['data_request_channel'];
          closed_at: string | null;
          copies_sent: NonNullable<Json>;
          created_at: string;
          created_by_user_id: string;
          due_on: string;
          extended_at: string | null;
          extended_to: string | null;
          extension_reason: string | null;
          goes_to_parent: boolean;
          handled_by_user_id: string;
          id: string;
          identity: Database['public']['Enums']['data_request_identity'];
          identity_answered_at: string | null;
          identity_asked_at: string | null;
          note: string;
          outcome: string | null;
          parent_check_token_hash: string | null;
          parent_copy_opened_at: string | null;
          parent_copy_sent_at: string | null;
          parent_copy_token_hash: string | null;
          received_on: string;
          reference: string;
          request_type: Database['public']['Enums']['data_request_type'];
          state: Database['public']['Enums']['data_request_state'];
          support_ticket_id: string | null;
          updated_at: string;
          user_id: string;
          data_request_deadline: string | null;
          data_request_json: Json | null;
          data_request_parent_copy_state: string | null;
          data_request_urgency: string | null;
        };
        ComputedFields:
          | 'data_request_deadline'
          | 'data_request_json'
          | 'data_request_parent_copy_state'
          | 'data_request_urgency';
        Insert: {
          channel: Database['public']['Enums']['data_request_channel'];
          closed_at?: string | null;
          copies_sent?: NonNullable<Json>;
          created_at?: string;
          created_by_user_id: string;
          due_on: string;
          extended_at?: string | null;
          extended_to?: string | null;
          extension_reason?: string | null;
          goes_to_parent?: boolean;
          handled_by_user_id: string;
          id?: string;
          identity: Database['public']['Enums']['data_request_identity'];
          identity_answered_at?: string | null;
          identity_asked_at?: string | null;
          note?: string;
          outcome?: string | null;
          parent_check_token_hash?: string | null;
          parent_copy_opened_at?: string | null;
          parent_copy_sent_at?: string | null;
          parent_copy_token_hash?: string | null;
          received_on: string;
          reference?: string;
          request_type: Database['public']['Enums']['data_request_type'];
          state?: Database['public']['Enums']['data_request_state'];
          support_ticket_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          channel?: Database['public']['Enums']['data_request_channel'];
          closed_at?: string | null;
          copies_sent?: NonNullable<Json>;
          created_at?: string;
          created_by_user_id?: string;
          due_on?: string;
          extended_at?: string | null;
          extended_to?: string | null;
          extension_reason?: string | null;
          goes_to_parent?: boolean;
          handled_by_user_id?: string;
          id?: string;
          identity?: Database['public']['Enums']['data_request_identity'];
          identity_answered_at?: string | null;
          identity_asked_at?: string | null;
          note?: string;
          outcome?: string | null;
          parent_check_token_hash?: string | null;
          parent_copy_opened_at?: string | null;
          parent_copy_sent_at?: string | null;
          parent_copy_token_hash?: string | null;
          received_on?: string;
          reference?: string;
          request_type?: Database['public']['Enums']['data_request_type'];
          state?: Database['public']['Enums']['data_request_state'];
          support_ticket_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'data_requests_created_by_user_id_fkey';
            columns: ['created_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'data_requests_handled_by_user_id_fkey';
            columns: ['handled_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'data_requests_support_ticket_id_fkey';
            columns: ['support_ticket_id'];
            isOneToOne: false;
            referencedRelation: 'support_tickets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'data_requests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      disposable_email_domains: {
        Row: {
          created_at: string;
          domain: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          domain: string;
        };
        Update: {
          created_at?: string;
          domain?: string;
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
      exports: {
        Row: {
          chapter_ids: string[] | null;
          content_fingerprint: string | null;
          created_at: string;
          data_request_id: string | null;
          display_name: string | null;
          document_format: string;
          expires_at: string | null;
          file_name: string;
          file_size: number | null;
          id: string;
          include_chapters: boolean;
          include_data: boolean;
          include_plan: boolean;
          kind: Database['public']['Enums']['export_kind'];
          ready_at: string | null;
          state: Database['public']['Enums']['export_state'];
          story_count: number | null;
          story_id: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          chapter_ids?: string[] | null;
          content_fingerprint?: string | null;
          created_at?: string;
          data_request_id?: string | null;
          display_name?: string | null;
          document_format?: string;
          expires_at?: string | null;
          file_name: string;
          file_size?: number | null;
          id?: string;
          include_chapters?: boolean;
          include_data?: boolean;
          include_plan?: boolean;
          kind: Database['public']['Enums']['export_kind'];
          ready_at?: string | null;
          state?: Database['public']['Enums']['export_state'];
          story_count?: number | null;
          story_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          chapter_ids?: string[] | null;
          content_fingerprint?: string | null;
          created_at?: string;
          data_request_id?: string | null;
          display_name?: string | null;
          document_format?: string;
          expires_at?: string | null;
          file_name?: string;
          file_size?: number | null;
          id?: string;
          include_chapters?: boolean;
          include_data?: boolean;
          include_plan?: boolean;
          kind?: Database['public']['Enums']['export_kind'];
          ready_at?: string | null;
          state?: Database['public']['Enums']['export_state'];
          story_count?: number | null;
          story_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exports_data_request_id_fkey';
            columns: ['data_request_id'];
            isOneToOne: false;
            referencedRelation: 'data_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exports_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exports_user_id_fkey';
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
      finished_thanks: {
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
            foreignKeyName: 'finished_thanks_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'finished_thanks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
      forum_names: {
        Row: {
          created_at: string;
          description: string;
          forum_id: string;
          id: string;
          language_code: string;
          name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string;
          forum_id: string;
          id?: string;
          language_code: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          forum_id?: string;
          id?: string;
          language_code?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'forum_names_forum_id_fkey';
            columns: ['forum_id'];
            isOneToOne: false;
            referencedRelation: 'forums';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'forum_names_language_code_fkey';
            columns: ['language_code'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
        ];
      };
      forum_post_revisions: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          post_id: string;
          title: string | null;
          updated_at: string;
          user_id: string;
          written_at: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          post_id: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
          written_at: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          post_id?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
          written_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'forum_post_revisions_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'forum_posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'forum_post_revisions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      forum_posts: {
        Row: {
          body: string;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          post_number: number;
          quoted_post_ids: string[];
          thread_id: string;
          updated_at: string;
          user_id: string;
          forum_post_state_for_caller: string | null;
        };
        ComputedFields: 'forum_post_state_for_caller';
        Insert: {
          body: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          post_number: number;
          quoted_post_ids?: string[];
          thread_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          post_number?: number;
          quoted_post_ids?: string[];
          thread_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'forum_posts_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'forum_threads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'forum_posts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      forum_read_marks: {
        Row: {
          created_at: string;
          forum_id: string | null;
          id: string;
          marked_at: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          forum_id?: string | null;
          id?: string;
          marked_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          forum_id?: string | null;
          id?: string;
          marked_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'forum_read_marks_forum_id_fkey';
            columns: ['forum_id'];
            isOneToOne: false;
            referencedRelation: 'forums';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'forum_read_marks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      forum_thread_reads: {
        Row: {
          created_at: string;
          id: string;
          last_read_post_number: number;
          read_at: string;
          thread_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          last_read_post_number?: number;
          read_at?: string;
          thread_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_read_post_number?: number;
          read_at?: string;
          thread_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'forum_thread_reads_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'forum_threads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'forum_thread_reads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      forum_threads: {
        Row: {
          bumped_at: string;
          created_at: string;
          deleted_at: string | null;
          forum_id: string;
          id: string;
          is_sticky: boolean;
          last_post_at: string;
          last_post_number: number;
          lock_reason: string | null;
          locked_at: string | null;
          locked_by_user_id: string | null;
          thread_number: number;
          title: string;
          updated_at: string;
          user_id: string;
          forum_first_unread_post: number | null;
          forum_thread_header_json: Json | null;
          forum_thread_is_shown: boolean | null;
          forum_thread_summary_json: Json | null;
          forum_unread_post_count: number | null;
        };
        ComputedFields:
          | 'forum_first_unread_post'
          | 'forum_thread_header_json'
          | 'forum_thread_is_shown'
          | 'forum_thread_summary_json'
          | 'forum_unread_post_count';
        Insert: {
          bumped_at?: string;
          created_at?: string;
          deleted_at?: string | null;
          forum_id: string;
          id?: string;
          is_sticky?: boolean;
          last_post_at?: string;
          last_post_number?: number;
          lock_reason?: string | null;
          locked_at?: string | null;
          locked_by_user_id?: string | null;
          thread_number?: never;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          bumped_at?: string;
          created_at?: string;
          deleted_at?: string | null;
          forum_id?: string;
          id?: string;
          is_sticky?: boolean;
          last_post_at?: string;
          last_post_number?: number;
          lock_reason?: string | null;
          locked_at?: string | null;
          locked_by_user_id?: string | null;
          thread_number?: never;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'forum_threads_forum_id_fkey';
            columns: ['forum_id'];
            isOneToOne: false;
            referencedRelation: 'forums';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'forum_threads_locked_by_user_id_fkey';
            columns: ['locked_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'forum_threads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      forums: {
        Row: {
          accent: Database['public']['Enums']['forum_accent'];
          created_at: string;
          deleted_at: string | null;
          doodle: string | null;
          id: string;
          is_pinned: boolean;
          level: number;
          parent_id: string | null;
          position: number;
          slug: string;
          space_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          accent?: Database['public']['Enums']['forum_accent'];
          created_at?: string;
          deleted_at?: string | null;
          doodle?: string | null;
          id?: string;
          is_pinned?: boolean;
          level?: number;
          parent_id?: string | null;
          position?: number;
          slug: string;
          space_id?: string | null;
          updated_at?: string;
        };
        Update: {
          accent?: Database['public']['Enums']['forum_accent'];
          created_at?: string;
          deleted_at?: string | null;
          doodle?: string | null;
          id?: string;
          is_pinned?: boolean;
          level?: number;
          parent_id?: string | null;
          position?: number;
          slug?: string;
          space_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'forums_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'forums';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'forums_space_id_fkey';
            columns: ['space_id'];
            isOneToOne: true;
            referencedRelation: 'spaces';
            referencedColumns: ['id'];
          },
        ];
      };
      identity_link_requests: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          provider: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          provider: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          provider?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'identity_link_requests_user_id_fkey';
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
            foreignKeyName: 'invites_space_id_fkey';
            columns: ['space_id'];
            isOneToOne: false;
            referencedRelation: 'spaces';
            referencedColumns: ['id'];
          },
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
      landing_page_reminders: {
        Row: {
          created_at: string;
          id: string;
          notified_at: string | null;
          page_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          notified_at?: string | null;
          page_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          notified_at?: string | null;
          page_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'landing_page_reminders_page_id_fkey';
            columns: ['page_id'];
            isOneToOne: false;
            referencedRelation: 'landing_pages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'landing_page_reminders_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      landing_page_versions: {
        Row: {
          content: NonNullable<Json>;
          created_at: string;
          id: string;
          page_id: string;
          published_at: string | null;
          show_from: string | null;
          status: string;
          take_down_on: string | null;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          content?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          page_id: string;
          published_at?: string | null;
          show_from?: string | null;
          status?: string;
          take_down_on?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          content?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          page_id?: string;
          published_at?: string | null;
          show_from?: string | null;
          status?: string;
          take_down_on?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'landing_page_versions_page_id_fkey';
            columns: ['page_id'];
            isOneToOne: false;
            referencedRelation: 'landing_pages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'landing_page_versions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      landing_pages: {
        Row: {
          archived_at: string | null;
          created_at: string;
          id: string;
          page_type: string;
          slug: string;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          page_type: string;
          slug: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          page_type?: string;
          slug?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'landing_pages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
      manual_age_checks: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decision_reason: string | null;
          id: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decision_reason?: string | null;
          id?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          decision_reason?: string | null;
          id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'manual_age_checks_user_id_fkey';
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
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
          sanction_id: string | null;
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
          sanction_id?: string | null;
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
          sanction_id?: string | null;
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
            foreignKeyName: 'moderated_items_sanction_id_fkey';
            columns: ['sanction_id'];
            isOneToOne: false;
            referencedRelation: 'sanctions';
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
          change_request_id: string | null;
          chapter_id: string | null;
          comment_id: string | null;
          created_at: string;
          data_request_id: string | null;
          decision: Database['public']['Enums']['moderation_action'] | null;
          group_key: string | null;
          id: string;
          is_required: boolean;
          kind: Database['public']['Enums']['notification_kind'];
          landing_page_id: string | null;
          mail_thread_id: string | null;
          read_at: string | null;
          space_id: string | null;
          statement_id: string | null;
          story_id: string | null;
          story_revision_id: string | null;
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
          change_request_id?: string | null;
          chapter_id?: string | null;
          comment_id?: string | null;
          created_at?: string;
          data_request_id?: string | null;
          decision?: Database['public']['Enums']['moderation_action'] | null;
          group_key?: string | null;
          id?: string;
          is_required?: boolean;
          kind: Database['public']['Enums']['notification_kind'];
          landing_page_id?: string | null;
          mail_thread_id?: string | null;
          read_at?: string | null;
          space_id?: string | null;
          statement_id?: string | null;
          story_id?: string | null;
          story_revision_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          actor_count?: number;
          actor_user_ids?: string[];
          appeal_id?: string | null;
          case_id?: string | null;
          change_request_id?: string | null;
          chapter_id?: string | null;
          comment_id?: string | null;
          created_at?: string;
          data_request_id?: string | null;
          decision?: Database['public']['Enums']['moderation_action'] | null;
          group_key?: string | null;
          id?: string;
          is_required?: boolean;
          kind?: Database['public']['Enums']['notification_kind'];
          landing_page_id?: string | null;
          mail_thread_id?: string | null;
          read_at?: string | null;
          space_id?: string | null;
          statement_id?: string | null;
          story_id?: string | null;
          story_revision_id?: string | null;
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
            foreignKeyName: 'notifications_change_request_id_fkey';
            columns: ['change_request_id'];
            isOneToOne: false;
            referencedRelation: 'customisation_change_requests';
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
            foreignKeyName: 'notifications_data_request_id_fkey';
            columns: ['data_request_id'];
            isOneToOne: false;
            referencedRelation: 'data_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_landing_page_id_fkey';
            columns: ['landing_page_id'];
            isOneToOne: false;
            referencedRelation: 'landing_pages';
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
            foreignKeyName: 'notifications_space_id_fkey';
            columns: ['space_id'];
            isOneToOne: false;
            referencedRelation: 'spaces';
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
            foreignKeyName: 'notifications_story_revision_id_fkey';
            columns: ['story_revision_id'];
            isOneToOne: false;
            referencedRelation: 'story_revisions';
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
      paragraph_shares: {
        Row: {
          chapter_id: string;
          paragraph_key: string;
          shared_on: string;
          total: number;
        };
        ComputedFields: never;
        Insert: {
          chapter_id: string;
          paragraph_key: string;
          shared_on: string;
          total?: number;
        };
        Update: {
          chapter_id?: string;
          paragraph_key?: string;
          shared_on?: string;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'paragraph_shares_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
        ];
      };
      parental_consents: {
        Row: {
          created_at: string;
          decided_at: string | null;
          id: string;
          is_guardian_confirmed: boolean;
          language: string;
          parent_email: string;
          privacy_version_id: string | null;
          status: string;
          terms_version_id: string | null;
          token_hash: string;
          updated_at: string;
          user_id: string;
          withdrawn_at: string | null;
          withdrawn_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          is_guardian_confirmed?: boolean;
          language: string;
          parent_email: string;
          privacy_version_id?: string | null;
          status?: string;
          terms_version_id?: string | null;
          token_hash: string;
          updated_at?: string;
          user_id: string;
          withdrawn_at?: string | null;
          withdrawn_by?: string | null;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          is_guardian_confirmed?: boolean;
          language?: string;
          parent_email?: string;
          privacy_version_id?: string | null;
          status?: string;
          terms_version_id?: string | null;
          token_hash?: string;
          updated_at?: string;
          user_id?: string;
          withdrawn_at?: string | null;
          withdrawn_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'parental_consents_privacy_version_id_fkey';
            columns: ['privacy_version_id'];
            isOneToOne: false;
            referencedRelation: 'legal_document_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'parental_consents_terms_version_id_fkey';
            columns: ['terms_version_id'];
            isOneToOne: false;
            referencedRelation: 'legal_document_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'parental_consents_user_id_fkey';
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
          file_sha256: string | null;
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
          uploader_ip_period: string | null;
          uploader_ip_scrambled: string | null;
          user_id: string;
          open_picture_review_case: string | null;
          picture_needs_person: boolean | null;
          picture_state_json: Json | null;
          show_passed_avatar: undefined | null;
        };
        ComputedFields:
          | 'open_picture_review_case'
          | 'picture_needs_person'
          | 'picture_state_json'
          | 'show_passed_avatar';
        Insert: {
          attempts?: number;
          bucket: string;
          case_id?: string | null;
          chapter_id?: string | null;
          checked_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          file_sha256?: string | null;
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
          uploader_ip_period?: string | null;
          uploader_ip_scrambled?: string | null;
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
          file_sha256?: string | null;
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
          uploader_ip_period?: string | null;
          uploader_ip_scrambled?: string | null;
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
          adults_may_message: boolean;
          age_check_method: Database['public']['Enums']['age_check_method'] | null;
          age_check_result: Database['public']['Enums']['age_check_result'];
          age_checked_at: string | null;
          avatar_picture_id: string | null;
          avatar_recipe: Json | null;
          bio: string;
          birth_month: number | null;
          birth_year: number | null;
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
          last_active_at: string | null;
          library_visible_to: Database['public']['Enums']['library_audience'];
          locale: string;
          marketing_email_opt_in: boolean;
          messages_from: Database['public']['Enums']['message_audience'] | null;
          onboarded_at: string | null;
          pen_name: string | null;
          pen_name_changed_at: string | null;
          profile_visible_to: Database['public']['Enums']['profile_audience'] | null;
          region_code: string | null;
          shows_online_status: boolean;
          signature: string | null;
          signature_picture_id: string | null;
          teacher_badge_since: string | null;
          updated_at: string;
          age_check_can_ask_manual: boolean | null;
          age_check_can_start_for: boolean | null;
          age_check_threshold_for: number | null;
          bio_for_caller: string | null;
          message_age_group: string | null;
          message_audience_of: Database['public']['Enums']['message_audience'] | null;
          profile_audience_of: Database['public']['Enums']['profile_audience'] | null;
          teacher_check_can_ask: boolean | null;
        };
        ComputedFields:
          | 'age_check_can_ask_manual'
          | 'age_check_can_start_for'
          | 'age_check_threshold_for'
          | 'bio_for_caller'
          | 'message_age_group'
          | 'message_audience_of'
          | 'profile_audience_of'
          | 'teacher_check_can_ask';
        Insert: {
          adults_may_message?: boolean;
          age_check_method?: Database['public']['Enums']['age_check_method'] | null;
          age_check_result?: Database['public']['Enums']['age_check_result'];
          age_checked_at?: string | null;
          avatar_picture_id?: string | null;
          avatar_recipe?: Json | null;
          bio?: string;
          birth_month?: number | null;
          birth_year?: number | null;
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
          last_active_at?: string | null;
          library_visible_to?: Database['public']['Enums']['library_audience'];
          locale?: string;
          marketing_email_opt_in?: boolean;
          messages_from?: Database['public']['Enums']['message_audience'] | null;
          onboarded_at?: string | null;
          pen_name?: string | null;
          pen_name_changed_at?: string | null;
          profile_visible_to?: Database['public']['Enums']['profile_audience'] | null;
          region_code?: string | null;
          shows_online_status?: boolean;
          signature?: string | null;
          signature_picture_id?: string | null;
          teacher_badge_since?: string | null;
          updated_at?: string;
        };
        Update: {
          adults_may_message?: boolean;
          age_check_method?: Database['public']['Enums']['age_check_method'] | null;
          age_check_result?: Database['public']['Enums']['age_check_result'];
          age_checked_at?: string | null;
          avatar_picture_id?: string | null;
          avatar_recipe?: Json | null;
          bio?: string;
          birth_month?: number | null;
          birth_year?: number | null;
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
          last_active_at?: string | null;
          library_visible_to?: Database['public']['Enums']['library_audience'];
          locale?: string;
          marketing_email_opt_in?: boolean;
          messages_from?: Database['public']['Enums']['message_audience'] | null;
          onboarded_at?: string | null;
          pen_name?: string | null;
          pen_name_changed_at?: string | null;
          profile_visible_to?: Database['public']['Enums']['profile_audience'] | null;
          region_code?: string | null;
          shows_online_status?: boolean;
          signature?: string | null;
          signature_picture_id?: string | null;
          teacher_badge_since?: string | null;
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
          {
            foreignKeyName: 'profiles_region_code_fkey';
            columns: ['region_code'];
            isOneToOne: false;
            referencedRelation: 'regions';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'profiles_signature_picture_id_fkey';
            columns: ['signature_picture_id'];
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
          support_ticket_id: string | null;
          support_ticket_number: number | null;
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
          support_ticket_id?: string | null;
          support_ticket_number?: number | null;
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
          support_ticket_id?: string | null;
          support_ticket_number?: number | null;
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
          {
            foreignKeyName: 'public_notices_support_ticket_id_fkey';
            columns: ['support_ticket_id'];
            isOneToOne: false;
            referencedRelation: 'support_tickets';
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
      reading_habits: {
        Row: {
          created_at: string;
          daily_target_minutes: number | null;
          id: string;
          last_reminded_on: string | null;
          reminder_time: string | null;
          reminders_on: boolean;
          time_zone: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          daily_target_minutes?: number | null;
          id?: string;
          last_reminded_on?: string | null;
          reminder_time?: string | null;
          reminders_on?: boolean;
          time_zone: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          daily_target_minutes?: number | null;
          id?: string;
          last_reminded_on?: string | null;
          reminder_time?: string | null;
          reminders_on?: boolean;
          time_zone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reading_habits_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reading_minutes: {
        Row: {
          created_at: string;
          id: string;
          minutes: number;
          read_on: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          minutes: number;
          read_on: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          minutes?: number;
          read_on?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reading_minutes_user_id_fkey';
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
      reading_preferences: {
        Row: {
          category_id: string | null;
          created_at: string;
          id: string;
          preference_kind: string;
          tag_id: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          category_id?: string | null;
          created_at?: string;
          id?: string;
          preference_kind: string;
          tag_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          id?: string;
          preference_kind?: string;
          tag_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reading_preferences_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reading_preferences_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reading_preferences_user_id_fkey';
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
          night_by_clock: boolean;
          night_from: string | null;
          night_until: string | null;
          reading_ruler: boolean;
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
          night_by_clock?: boolean;
          night_from?: string | null;
          night_until?: string | null;
          reading_ruler?: boolean;
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
          night_by_clock?: boolean;
          night_from?: string | null;
          night_until?: string | null;
          reading_ruler?: boolean;
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
      regions: {
        Row: {
          code: string;
          country_code: string;
          created_at: string;
          name_en: string;
          name_ro: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          country_code: string;
          created_at?: string;
          name_en: string;
          name_ro: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          country_code?: string;
          created_at?: string;
          name_en?: string;
          name_ro?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      removed_passages: {
        Row: {
          case_id: string | null;
          case_is_safeguarding: boolean;
          chapter_id: string;
          created_at: string;
          id: string;
          marker: string;
          marker_starts_at: number;
          put_back_at: string | null;
          removed_by_user_id: string;
          removed_text: string;
          story_id: string;
          story_revision_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          case_id?: string | null;
          case_is_safeguarding?: boolean;
          chapter_id: string;
          created_at?: string;
          id?: string;
          marker: string;
          marker_starts_at: number;
          put_back_at?: string | null;
          removed_by_user_id: string;
          removed_text: string;
          story_id: string;
          story_revision_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          case_id?: string | null;
          case_is_safeguarding?: boolean;
          chapter_id?: string;
          created_at?: string;
          id?: string;
          marker?: string;
          marker_starts_at?: number;
          put_back_at?: string | null;
          removed_by_user_id?: string;
          removed_text?: string;
          story_id?: string;
          story_revision_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'removed_passages_case_id_fkey';
            columns: ['case_id'];
            isOneToOne: false;
            referencedRelation: 'cases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'removed_passages_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'removed_passages_removed_by_user_id_fkey';
            columns: ['removed_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'removed_passages_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'removed_passages_story_revision_id_fkey';
            columns: ['story_revision_id'];
            isOneToOne: true;
            referencedRelation: 'story_revisions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'removed_passages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
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
      retention_runs: {
        Row: {
          created_at: string;
          id: string;
          job_name: string;
          ran_at: string;
          rows_removed: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          job_name: string;
          ran_at?: string;
          rows_removed: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          job_name?: string;
          ran_at?: string;
          rows_removed?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      retired_certificate_codes: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
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
          hide_banned_account: number | null;
        };
        ComputedFields: 'hide_banned_account';
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
      sign_up_ips: {
        Row: {
          created_at: string;
          id: string;
          ip_period: string;
          ip_scrambled: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          ip_period: string;
          ip_scrambled: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          ip_period?: string;
          ip_scrambled?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sign_up_ips_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      space_members: {
        Row: {
          created_at: string;
          id: string;
          joined_at: string | null;
          powers: Database['public']['Enums']['space_power'][];
          requested_at: string;
          role: Database['public']['Enums']['space_member_role'];
          space_id: string;
          status: Database['public']['Enums']['space_member_status'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          joined_at?: string | null;
          powers?: Database['public']['Enums']['space_power'][];
          requested_at?: string;
          role?: Database['public']['Enums']['space_member_role'];
          space_id: string;
          status?: Database['public']['Enums']['space_member_status'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          joined_at?: string | null;
          powers?: Database['public']['Enums']['space_power'][];
          requested_at?: string;
          role?: Database['public']['Enums']['space_member_role'];
          space_id?: string;
          status?: Database['public']['Enums']['space_member_status'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'space_members_space_id_fkey';
            columns: ['space_id'];
            isOneToOne: false;
            referencedRelation: 'spaces';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'space_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      space_moderation_log: {
        Row: {
          action: string;
          by_platform: boolean;
          created_at: string;
          details: NonNullable<Json>;
          id: string;
          note: string | null;
          space_id: string;
          target_user_id: string | null;
          thread_id: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          by_platform?: boolean;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: string;
          note?: string | null;
          space_id: string;
          target_user_id?: string | null;
          thread_id?: string | null;
          user_id: string;
        };
        Update: {
          action?: string;
          by_platform?: boolean;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: string;
          note?: string | null;
          space_id?: string;
          target_user_id?: string | null;
          thread_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'space_moderation_log_space_id_fkey';
            columns: ['space_id'];
            isOneToOne: false;
            referencedRelation: 'spaces';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'space_moderation_log_target_user_id_fkey';
            columns: ['target_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'space_moderation_log_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'forum_threads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'space_moderation_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      spaces: {
        Row: {
          age_group: Database['public']['Enums']['space_age_group'];
          archived_at: string | null;
          banner: Database['public']['Enums']['space_banner'];
          banner_picture_id: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string;
          id: string;
          joining: Database['public']['Enums']['space_joining'];
          kind: Database['public']['Enums']['space_kind'];
          locks_at: string | null;
          name: string;
          name_key: string;
          posting: Database['public']['Enums']['space_posting'];
          readers: Database['public']['Enums']['space_readers'];
          rules: string;
          school_name: string | null;
          slug: string;
          updated_at: string;
          user_id: string;
          check_certificate_class: undefined | null;
          space_acts_as_platform: boolean | null;
          space_card_visible: boolean | null;
          space_is_in_class: boolean | null;
          space_is_locked: boolean | null;
          space_json: Json | null;
          space_latest_activity: string | null;
          space_may_join: boolean | null;
          space_may_post: boolean | null;
          space_may_read: boolean | null;
          space_powers_of_caller: Database['public']['Enums']['space_power'][] | null;
          space_viewer_json: Json | null;
        };
        ComputedFields:
          | 'check_certificate_class'
          | 'space_acts_as_platform'
          | 'space_card_visible'
          | 'space_is_in_class'
          | 'space_is_locked'
          | 'space_json'
          | 'space_latest_activity'
          | 'space_may_join'
          | 'space_may_post'
          | 'space_may_read'
          | 'space_powers_of_caller'
          | 'space_viewer_json';
        Insert: {
          age_group: Database['public']['Enums']['space_age_group'];
          archived_at?: string | null;
          banner?: Database['public']['Enums']['space_banner'];
          banner_picture_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description: string;
          id?: string;
          joining?: Database['public']['Enums']['space_joining'];
          kind?: Database['public']['Enums']['space_kind'];
          locks_at?: string | null;
          name: string;
          name_key: string;
          posting?: Database['public']['Enums']['space_posting'];
          readers?: Database['public']['Enums']['space_readers'];
          rules?: string;
          school_name?: string | null;
          slug: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          age_group?: Database['public']['Enums']['space_age_group'];
          archived_at?: string | null;
          banner?: Database['public']['Enums']['space_banner'];
          banner_picture_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          joining?: Database['public']['Enums']['space_joining'];
          kind?: Database['public']['Enums']['space_kind'];
          locks_at?: string | null;
          name?: string;
          name_key?: string;
          posting?: Database['public']['Enums']['space_posting'];
          readers?: Database['public']['Enums']['space_readers'];
          rules?: string;
          school_name?: string | null;
          slug?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'spaces_banner_picture_id_fkey';
            columns: ['banner_picture_id'];
            isOneToOne: false;
            referencedRelation: 'picture_checks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'spaces_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      staff_interns: {
        Row: {
          created_at: string;
          id: string;
          marked_by_user_id: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          marked_by_user_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          marked_by_user_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_interns_marked_by_user_id_fkey';
            columns: ['marked_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_interns_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
          card_colour: string | null;
          category_id: string;
          class_only: boolean;
          class_space_id: string | null;
          classic_author_id: string | null;
          comments_enabled: boolean;
          completion_status: Database['public']['Enums']['completion_status'];
          content_note: string;
          cover_accent: string | null;
          cover_background: string | null;
          cover_design: string | null;
          cover_hidden_at: string | null;
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
          title_hidden_at: string | null;
          updated_at: string;
          user_id: string;
          admin_story_cover_json: Json | null;
          admin_story_row: Json | null;
          admin_story_settings_json: Json | null;
          admin_story_status: string | null;
          story_as_shown: {
            ai_disclosure: Database['public']['Enums']['ai_disclosure'];
            ai_undisclosed_labelled_at: string | null;
            blurb: string;
            card_colour: string | null;
            category_id: string;
            class_only: boolean;
            class_space_id: string | null;
            classic_author_id: string | null;
            comments_enabled: boolean;
            completion_status: Database['public']['Enums']['completion_status'];
            content_note: string;
            cover_accent: string | null;
            cover_background: string | null;
            cover_design: string | null;
            cover_hidden_at: string | null;
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
            title_hidden_at: string | null;
            updated_at: string;
            user_id: string;
          } | null;
        };
        ComputedFields:
          | 'admin_story_cover_json'
          | 'admin_story_row'
          | 'admin_story_settings_json'
          | 'admin_story_status'
          | 'story_as_shown';
        Insert: {
          ai_disclosure?: Database['public']['Enums']['ai_disclosure'];
          ai_undisclosed_labelled_at?: string | null;
          blurb?: string;
          card_colour?: string | null;
          category_id: string;
          class_only?: boolean;
          class_space_id?: string | null;
          classic_author_id?: string | null;
          comments_enabled?: boolean;
          completion_status?: Database['public']['Enums']['completion_status'];
          content_note?: string;
          cover_accent?: string | null;
          cover_background?: string | null;
          cover_design?: string | null;
          cover_hidden_at?: string | null;
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
          title_hidden_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ai_disclosure?: Database['public']['Enums']['ai_disclosure'];
          ai_undisclosed_labelled_at?: string | null;
          blurb?: string;
          card_colour?: string | null;
          category_id?: string;
          class_only?: boolean;
          class_space_id?: string | null;
          classic_author_id?: string | null;
          comments_enabled?: boolean;
          completion_status?: Database['public']['Enums']['completion_status'];
          content_note?: string;
          cover_accent?: string | null;
          cover_background?: string | null;
          cover_design?: string | null;
          cover_hidden_at?: string | null;
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
          title_hidden_at?: string | null;
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
            foreignKeyName: 'stories_class_space_id_fkey';
            columns: ['class_space_id'];
            isOneToOne: false;
            referencedRelation: 'spaces';
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
      story_bible_entries: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          is_private: boolean;
          section_id: string;
          show_from_chapter_id: string | null;
          story_id: string;
          tags: string[];
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string;
          created_at?: string;
          id?: string;
          is_private?: boolean;
          section_id: string;
          show_from_chapter_id?: string | null;
          story_id: string;
          tags?: string[];
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          is_private?: boolean;
          section_id?: string;
          show_from_chapter_id?: string | null;
          story_id?: string;
          tags?: string[];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_bible_entries_section_id_fkey';
            columns: ['section_id'];
            isOneToOne: false;
            referencedRelation: 'story_bible_sections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_bible_entries_show_from_chapter_id_fkey';
            columns: ['show_from_chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_bible_entries_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'story_plans';
            referencedColumns: ['story_id'];
          },
          {
            foreignKeyName: 'story_bible_entries_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      story_bible_sections: {
        Row: {
          created_at: string;
          id: string;
          is_private: boolean;
          name: string;
          position: number;
          preset: string | null;
          story_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_private?: boolean;
          name?: string;
          position: number;
          preset?: string | null;
          story_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_private?: boolean;
          name?: string;
          position?: number;
          preset?: string | null;
          story_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_bible_sections_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'story_plans';
            referencedColumns: ['story_id'];
          },
          {
            foreignKeyName: 'story_bible_sections_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      story_character_fields: {
        Row: {
          created_at: string;
          hidden_at: string | null;
          id: string;
          name: string;
          position: number;
          story_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          hidden_at?: string | null;
          id?: string;
          name: string;
          position: number;
          story_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          hidden_at?: string | null;
          id?: string;
          name?: string;
          position?: number;
          story_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_character_fields_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'story_plans';
            referencedColumns: ['story_id'];
          },
          {
            foreignKeyName: 'story_character_fields_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      story_character_relationships: {
        Row: {
          created_at: string;
          custom_label: string;
          from_character_id: string;
          id: string;
          is_private: boolean;
          kind: string;
          note: string;
          story_id: string;
          to_character_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          custom_label?: string;
          from_character_id: string;
          id?: string;
          is_private?: boolean;
          kind: string;
          note?: string;
          story_id: string;
          to_character_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          custom_label?: string;
          from_character_id?: string;
          id?: string;
          is_private?: boolean;
          kind?: string;
          note?: string;
          story_id?: string;
          to_character_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_character_relationships_from_character_id_fkey';
            columns: ['from_character_id'];
            isOneToOne: false;
            referencedRelation: 'story_characters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_character_relationships_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'story_plans';
            referencedColumns: ['story_id'];
          },
          {
            foreignKeyName: 'story_character_relationships_to_character_id_fkey';
            columns: ['to_character_id'];
            isOneToOne: false;
            referencedRelation: 'story_characters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_character_relationships_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      story_characters: {
        Row: {
          created_at: string;
          custom_values: NonNullable<Json>;
          first_appearance_chapter_id: string | null;
          id: string;
          is_private: boolean;
          name: string;
          picture_alt: string;
          picture_id: string | null;
          public_sheet_parts: string[];
          role: string;
          sheet: NonNullable<Json>;
          show_from_chapter_id: string | null;
          story_id: string;
          updated_at: string;
          user_id: string;
          character_json: Json | null;
          character_link_names: string[] | null;
        };
        ComputedFields: 'character_json' | 'character_link_names';
        Insert: {
          created_at?: string;
          custom_values?: NonNullable<Json>;
          first_appearance_chapter_id?: string | null;
          id?: string;
          is_private?: boolean;
          name: string;
          picture_alt?: string;
          picture_id?: string | null;
          public_sheet_parts?: string[];
          role?: string;
          sheet?: NonNullable<Json>;
          show_from_chapter_id?: string | null;
          story_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          custom_values?: NonNullable<Json>;
          first_appearance_chapter_id?: string | null;
          id?: string;
          is_private?: boolean;
          name?: string;
          picture_alt?: string;
          picture_id?: string | null;
          public_sheet_parts?: string[];
          role?: string;
          sheet?: NonNullable<Json>;
          show_from_chapter_id?: string | null;
          story_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_characters_first_appearance_chapter_id_fkey';
            columns: ['first_appearance_chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_characters_picture_id_fkey';
            columns: ['picture_id'];
            isOneToOne: false;
            referencedRelation: 'picture_checks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_characters_show_from_chapter_id_fkey';
            columns: ['show_from_chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_characters_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'story_plans';
            referencedColumns: ['story_id'];
          },
          {
            foreignKeyName: 'story_characters_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      story_events: {
        Row: {
          created_at: string;
          description: string;
          display_date: string;
          id: string;
          is_private: boolean;
          show_from_chapter_id: string | null;
          sort_value: number;
          story_id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string;
          display_date?: string;
          id?: string;
          is_private?: boolean;
          show_from_chapter_id?: string | null;
          sort_value: number;
          story_id: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          display_date?: string;
          id?: string;
          is_private?: boolean;
          show_from_chapter_id?: string | null;
          sort_value?: number;
          story_id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_events_show_from_chapter_id_fkey';
            columns: ['show_from_chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_events_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'story_plans';
            referencedColumns: ['story_id'];
          },
          {
            foreignKeyName: 'story_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      story_ideas: {
        Row: {
          body: string;
          created_at: string;
          done_at: string | null;
          id: string;
          kind: string;
          outcome: string;
          story_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          created_at?: string;
          done_at?: string | null;
          id?: string;
          kind?: string;
          outcome?: string;
          story_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          done_at?: string | null;
          id?: string;
          kind?: string;
          outcome?: string;
          story_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_ideas_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'story_plans';
            referencedColumns: ['story_id'];
          },
          {
            foreignKeyName: 'story_ideas_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      story_marketing: {
        Row: {
          back_cover_blurb: string;
          comparable_titles: string;
          created_at: string;
          hooks_keywords: string;
          launch_notes: string;
          query_pitch: string;
          story_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          back_cover_blurb?: string;
          comparable_titles?: string;
          created_at?: string;
          hooks_keywords?: string;
          launch_notes?: string;
          query_pitch?: string;
          story_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          back_cover_blurb?: string;
          comparable_titles?: string;
          created_at?: string;
          hooks_keywords?: string;
          launch_notes?: string;
          query_pitch?: string;
          story_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_marketing_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: true;
            referencedRelation: 'story_plans';
            referencedColumns: ['story_id'];
          },
          {
            foreignKeyName: 'story_marketing_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      story_plan_acts: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          position: number;
          story_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          position: number;
          story_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          position?: number;
          story_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_plan_acts_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'story_plans';
            referencedColumns: ['story_id'];
          },
          {
            foreignKeyName: 'story_plan_acts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      story_plans: {
        Row: {
          created_at: string;
          linked_project_label: string;
          linked_project_url: string;
          logline: string;
          public_areas: string[];
          publishing_route: string;
          series_name: string;
          story_id: string;
          updated_at: string;
          user_id: string;
          word_target: number;
          writing_status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          linked_project_label?: string;
          linked_project_url?: string;
          logline?: string;
          public_areas?: string[];
          publishing_route?: string;
          series_name?: string;
          story_id: string;
          updated_at?: string;
          user_id: string;
          word_target?: number;
          writing_status?: string;
        };
        Update: {
          created_at?: string;
          linked_project_label?: string;
          linked_project_url?: string;
          logline?: string;
          public_areas?: string[];
          publishing_route?: string;
          series_name?: string;
          story_id?: string;
          updated_at?: string;
          user_id?: string;
          word_target?: number;
          writing_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_plans_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: true;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_plans_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      story_restrictions: {
        Row: {
          created_at: string;
          id: string;
          lifted_at: string | null;
          lifted_by_user_id: string | null;
          reason: string;
          restricted_by_user_id: string;
          story_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          lifted_at?: string | null;
          lifted_by_user_id?: string | null;
          reason: string;
          restricted_by_user_id: string;
          story_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          lifted_at?: string | null;
          lifted_by_user_id?: string | null;
          reason?: string;
          restricted_by_user_id?: string;
          story_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_restrictions_lifted_by_user_id_fkey';
            columns: ['lifted_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_restrictions_restricted_by_user_id_fkey';
            columns: ['restricted_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_restrictions_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_restrictions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      story_revisions: {
        Row: {
          after_values: NonNullable<Json>;
          audit_log_id: string | null;
          before_values: NonNullable<Json>;
          change_kind: string;
          changed_by_user_id: string;
          chapter_id: string | null;
          created_at: string;
          id: string;
          reason_code: string;
          reason_text: string;
          restores_revision_id: string | null;
          story_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          after_values: NonNullable<Json>;
          audit_log_id?: string | null;
          before_values: NonNullable<Json>;
          change_kind: string;
          changed_by_user_id: string;
          chapter_id?: string | null;
          created_at?: string;
          id?: string;
          reason_code: string;
          reason_text: string;
          restores_revision_id?: string | null;
          story_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          after_values?: NonNullable<Json>;
          audit_log_id?: string | null;
          before_values?: NonNullable<Json>;
          change_kind?: string;
          changed_by_user_id?: string;
          chapter_id?: string | null;
          created_at?: string;
          id?: string;
          reason_code?: string;
          reason_text?: string;
          restores_revision_id?: string | null;
          story_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'story_revisions_changed_by_user_id_fkey';
            columns: ['changed_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_revisions_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_revisions_restores_revision_id_fkey';
            columns: ['restores_revision_id'];
            isOneToOne: false;
            referencedRelation: 'story_revisions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_revisions_story_id_fkey';
            columns: ['story_id'];
            isOneToOne: false;
            referencedRelation: 'stories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'story_revisions_user_id_fkey';
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
      support_canned_replies: {
        Row: {
          body_en: string;
          body_ro: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          title: string;
          updated_at: string;
          updated_by_user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          body_en: string;
          body_ro: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          title: string;
          updated_at?: string;
          updated_by_user_id?: string | null;
        };
        Update: {
          body_en?: string;
          body_ro?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          title?: string;
          updated_at?: string;
          updated_by_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'support_canned_replies_updated_by_user_id_fkey';
            columns: ['updated_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      support_ticket_emails: {
        Row: {
          attempts: number;
          claimed_at: string | null;
          created_at: string;
          id: string;
          kind: string;
          message_id: string | null;
          message_token: string;
          sent_at: string | null;
          ticket_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          claimed_at?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          message_id?: string | null;
          message_token?: string;
          sent_at?: string | null;
          ticket_id: string;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          claimed_at?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          message_id?: string | null;
          message_token?: string;
          sent_at?: string | null;
          ticket_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'support_ticket_emails_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'support_ticket_messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_ticket_emails_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'support_tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      support_ticket_events: {
        Row: {
          actor_user_id: string | null;
          change: string;
          created_at: string;
          id: string;
          ticket_id: string;
          updated_at: string;
          value_after: Json | null;
          value_before: Json | null;
        };
        ComputedFields: never;
        Insert: {
          actor_user_id?: string | null;
          change: string;
          created_at?: string;
          id?: string;
          ticket_id: string;
          updated_at?: string;
          value_after?: Json | null;
          value_before?: Json | null;
        };
        Update: {
          actor_user_id?: string | null;
          change?: string;
          created_at?: string;
          id?: string;
          ticket_id?: string;
          updated_at?: string;
          value_after?: Json | null;
          value_before?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'support_ticket_events_actor_user_id_fkey';
            columns: ['actor_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_ticket_events_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'support_tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      support_ticket_messages: {
        Row: {
          author_user_id: string | null;
          body: string;
          channel: Database['public']['Enums']['support_ticket_channel'];
          created_at: string;
          email_message_id: string | null;
          id: string;
          kind: Database['public']['Enums']['support_message_kind'];
          ticket_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          author_user_id?: string | null;
          body: string;
          channel: Database['public']['Enums']['support_ticket_channel'];
          created_at?: string;
          email_message_id?: string | null;
          id?: string;
          kind: Database['public']['Enums']['support_message_kind'];
          ticket_id: string;
          updated_at?: string;
        };
        Update: {
          author_user_id?: string | null;
          body?: string;
          channel?: Database['public']['Enums']['support_ticket_channel'];
          created_at?: string;
          email_message_id?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['support_message_kind'];
          ticket_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'support_ticket_messages_author_user_id_fkey';
            columns: ['author_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_ticket_messages_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'support_tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      support_tickets: {
        Row: {
          assigned_to_user_id: string | null;
          category: Database['public']['Enums']['support_ticket_category'];
          channel: Database['public']['Enums']['support_ticket_channel'];
          closed_at: string | null;
          created_at: string;
          first_replied_at: string | null;
          follow_up_of_ticket_id: string | null;
          id: string;
          is_spam: boolean;
          language: string;
          last_message_at: string;
          marked_spam_at: string | null;
          merged_into_ticket_id: string | null;
          number: number;
          priority: Database['public']['Enums']['support_ticket_priority'];
          requester_email: string | null;
          requester_user_id: string | null;
          solved_at: string | null;
          status: Database['public']['Enums']['support_ticket_status'];
          subject: string;
          tags: string[];
          updated_at: string;
          support_ticket_address: string | null;
        };
        ComputedFields: 'support_ticket_address';
        Insert: {
          assigned_to_user_id?: string | null;
          category?: Database['public']['Enums']['support_ticket_category'];
          channel: Database['public']['Enums']['support_ticket_channel'];
          closed_at?: string | null;
          created_at?: string;
          first_replied_at?: string | null;
          follow_up_of_ticket_id?: string | null;
          id?: string;
          is_spam?: boolean;
          language?: string;
          last_message_at?: string;
          marked_spam_at?: string | null;
          merged_into_ticket_id?: string | null;
          number?: number;
          priority?: Database['public']['Enums']['support_ticket_priority'];
          requester_email?: string | null;
          requester_user_id?: string | null;
          solved_at?: string | null;
          status?: Database['public']['Enums']['support_ticket_status'];
          subject: string;
          tags?: string[];
          updated_at?: string;
        };
        Update: {
          assigned_to_user_id?: string | null;
          category?: Database['public']['Enums']['support_ticket_category'];
          channel?: Database['public']['Enums']['support_ticket_channel'];
          closed_at?: string | null;
          created_at?: string;
          first_replied_at?: string | null;
          follow_up_of_ticket_id?: string | null;
          id?: string;
          is_spam?: boolean;
          language?: string;
          last_message_at?: string;
          marked_spam_at?: string | null;
          merged_into_ticket_id?: string | null;
          number?: number;
          priority?: Database['public']['Enums']['support_ticket_priority'];
          requester_email?: string | null;
          requester_user_id?: string | null;
          solved_at?: string | null;
          status?: Database['public']['Enums']['support_ticket_status'];
          subject?: string;
          tags?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'support_tickets_assigned_to_user_id_fkey';
            columns: ['assigned_to_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_tickets_follow_up_of_ticket_id_fkey';
            columns: ['follow_up_of_ticket_id'];
            isOneToOne: false;
            referencedRelation: 'support_tickets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_tickets_merged_into_ticket_id_fkey';
            columns: ['merged_into_ticket_id'];
            isOneToOne: false;
            referencedRelation: 'support_tickets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'support_tickets_requester_user_id_fkey';
            columns: ['requester_user_id'];
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
      teacher_checks: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decision_reason: string | null;
          id: string;
          link_expires_at: string | null;
          proof_path: string | null;
          school_domain: string | null;
          status: string;
          token_hash: string | null;
          updated_at: string;
          user_id: string;
          way: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decision_reason?: string | null;
          id?: string;
          link_expires_at?: string | null;
          proof_path?: string | null;
          school_domain?: string | null;
          status: string;
          token_hash?: string | null;
          updated_at?: string;
          user_id: string;
          way: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          decision_reason?: string | null;
          id?: string;
          link_expires_at?: string | null;
          proof_path?: string | null;
          school_domain?: string | null;
          status?: string;
          token_hash?: string | null;
          updated_at?: string;
          user_id?: string;
          way?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_checks_user_id_fkey';
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
      writer_ranks: {
        Row: {
          chapter_count: number;
          created_at: string;
          rank: Database['public']['Enums']['writer_rank'];
          updated_at: string;
          user_id: string;
          word_count: number;
        };
        ComputedFields: never;
        Insert: {
          chapter_count: number;
          created_at?: string;
          rank: Database['public']['Enums']['writer_rank'];
          updated_at?: string;
          user_id: string;
          word_count: number;
        };
        Update: {
          chapter_count?: number;
          created_at?: string;
          rank?: Database['public']['Enums']['writer_rank'];
          updated_at?: string;
          user_id?: string;
          word_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'writer_ranks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
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
      abuse_image_file_may_go: { Args: { bucket: string; path: string }; Returns: boolean };
      accept_current_legal_versions: {
        Args: { document_slugs: string[]; reading_language?: string };
        Returns: number;
      };
      account_deletion_rules: {
        Args: Record<PropertyKey, never>;
        Returns: {
          action: string;
          step: number;
          table_name: string;
          why: string;
        }[];
      };
      account_for_email: { Args: { address: string }; Returns: string };
      account_is_new: { Args: { target_user_id: string }; Returns: boolean };
      account_set_up_before_now: { Args: { target_user_id: string }; Returns: boolean };
      account_signed_in_recently: { Args: Record<PropertyKey, never>; Returns: boolean };
      account_state: {
        Args: { target_user_id: string };
        Returns: Database['public']['Enums']['account_status'];
      };
      act_of_story: { Args: { act_id: string; target_story_id: string }; Returns: string };
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
      add_bible_section: { Args: { section_name: string; story_slug: string }; Returns: Json };
      add_chapter_scene: { Args: { chapter_code: string; scene_title: string }; Returns: Json };
      add_chapter_share: { Args: { target_chapter_id: string }; Returns: undefined };
      add_chapter_to_act: { Args: { act_id: string; story_slug: string }; Returns: Json };
      add_character_field: { Args: { field_name: string; story_slug: string }; Returns: Json };
      add_character_relationship: {
        Args: {
          custom_label: string;
          from_character_id: string;
          note: string;
          relationship_kind: string;
          to_character_id: string;
        };
        Returns: Json;
      };
      add_copied_work_note: {
        Args: {
          target: Omit<
            Database['public']['Tables']['cases']['Row'],
            Database['public']['Tables']['cases']['ComputedFields']
          >;
        };
        Returns: undefined;
      };
      add_email_to_support_ticket: {
        Args: {
          body: string;
          email_message_id: string;
          ticket: Omit<
            Database['public']['Tables']['support_tickets']['Row'],
            Database['public']['Tables']['support_tickets']['ComputedFields']
          >;
        };
        Returns: number;
      };
      add_reading_minute: { Args: Record<PropertyKey, never>; Returns: number };
      add_story_event: {
        Args: {
          description: string;
          display_date: string;
          event_title: string;
          sort_value: number;
          story_slug: string;
        };
        Returns: Json;
      };
      add_story_idea: {
        Args: { idea_body: string; idea_kind: string; story_slug: string };
        Returns: Json;
      };
      admin_abuse_image_evidence: { Args: { target_case_id: string }; Returns: Json };
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
      admin_add_nudge_word: {
        Args: { new_phrase: string; word_language: string };
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
      admin_apply_story_settings: {
        Args: {
          changes: Json;
          story_row: Omit<
            Database['public']['Tables']['stories']['Row'],
            Database['public']['Tables']['stories']['ComputedFields']
          >;
        };
        Returns: undefined;
      };
      admin_approve_picture: {
        Args: {
          new_rating?: Database['public']['Enums']['story_rating'];
          note_text: string;
          target_case_id: string;
        };
        Returns: boolean;
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
      admin_archive_landing_page: { Args: { target_page_id: string }; Returns: undefined };
      admin_ask_data_request_confirmation: { Args: { target_request_id: string }; Returns: Json };
      admin_ask_data_request_parent: {
        Args: { signature: string; target_request_id: string; token_hash: string };
        Returns: Json;
      };
      admin_assign_mail: {
        Args: { assignee_handle: string; thread_reference: string };
        Returns: boolean;
      };
      admin_build_evidence_pack: {
        Args: { reason_given: string; target_case_id: string };
        Returns: Json;
      };
      admin_case_account_links: { Args: { target_case_id: string }; Returns: Json };
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
      admin_case_message: { Args: { target_case_id: string }; Returns: Json };
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
      admin_certificate: { Args: { code: string }; Returns: Json };
      admin_change_story_settings: {
        Args: { changes: Json; reason_code: string; reason_text: string; target_story_id: string };
        Returns: Json;
      };
      admin_chapter_text: { Args: { target_chapter_id: string }; Returns: Json };
      admin_claim_case: { Args: { target_case_id: string }; Returns: boolean };
      admin_class_spaces: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_classic_chapter: { Args: { target_chapter_code: string }; Returns: Json };
      admin_classic_suggestions: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_close_account_for_abuse_image: {
        Args: { account_message: string; note_text: string; target_case_id: string };
        Returns: boolean;
      };
      admin_close_data_request: {
        Args: { outcome: string; target_request_id: string };
        Returns: Json;
      };
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
      admin_contest_entries: { Args: { target_contest_id: string }; Returns: Json };
      admin_contest_problems: { Args: { target_contest_id: string }; Returns: string[] };
      admin_convert_ticket_to_report: {
        Args: {
          content_address: string;
          explanation: string;
          reason: Database['public']['Enums']['report_reason'];
          ticket_number: number;
        };
        Returns: Json;
      };
      admin_create_class_space: {
        Args: { description: string; name: string; school_name: string; teacher_handle: string };
        Returns: Json;
      };
      admin_create_contest: { Args: { landing_slug: string }; Returns: string };
      admin_create_invite: {
        Args: { admits?: number; private_note?: string; valid_days?: number };
        Returns: {
          code: string;
          expires_at: string;
          invite_id: string;
        }[];
      };
      admin_create_landing_page: {
        Args: { new_page_type: string; new_slug: string };
        Returns: string;
      };
      admin_data_request: { Args: { target_request_id: string }; Returns: Json };
      admin_data_request_copy_target: {
        Args: { target_request_id: string };
        Returns: {
          channel: Database['public']['Enums']['data_request_channel'];
          closed_at: string | null;
          copies_sent: NonNullable<Json>;
          created_at: string;
          created_by_user_id: string;
          due_on: string;
          extended_at: string | null;
          extended_to: string | null;
          extension_reason: string | null;
          goes_to_parent: boolean;
          handled_by_user_id: string;
          id: string;
          identity: Database['public']['Enums']['data_request_identity'];
          identity_answered_at: string | null;
          identity_asked_at: string | null;
          note: string;
          outcome: string | null;
          parent_check_token_hash: string | null;
          parent_copy_opened_at: string | null;
          parent_copy_sent_at: string | null;
          parent_copy_token_hash: string | null;
          received_on: string;
          reference: string;
          request_type: Database['public']['Enums']['data_request_type'];
          state: Database['public']['Enums']['data_request_state'];
          support_ticket_id: string | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'data_requests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_data_request_export: { Args: { target_request_id: string }; Returns: Json };
      admin_data_request_target: {
        Args: { must_be_open: boolean; target_request_id: string };
        Returns: {
          channel: Database['public']['Enums']['data_request_channel'];
          closed_at: string | null;
          copies_sent: NonNullable<Json>;
          created_at: string;
          created_by_user_id: string;
          due_on: string;
          extended_at: string | null;
          extended_to: string | null;
          extension_reason: string | null;
          goes_to_parent: boolean;
          handled_by_user_id: string;
          id: string;
          identity: Database['public']['Enums']['data_request_identity'];
          identity_answered_at: string | null;
          identity_asked_at: string | null;
          note: string;
          outcome: string | null;
          parent_check_token_hash: string | null;
          parent_copy_opened_at: string | null;
          parent_copy_sent_at: string | null;
          parent_copy_token_hash: string | null;
          received_on: string;
          reference: string;
          request_type: Database['public']['Enums']['data_request_type'];
          state: Database['public']['Enums']['data_request_state'];
          support_ticket_id: string | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'data_requests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_data_requests: { Args: { only_open: boolean }; Returns: Json };
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
      admin_decide_manual_age_check: {
        Args: { decision: string; reason: string; request_id: string };
        Returns: Json;
      };
      admin_decide_teacher_check: {
        Args: { check_id: string; decision: string; reason: string };
        Returns: Json;
      };
      admin_delete_canned_reply: { Args: { reply_id: string }; Returns: boolean };
      admin_delete_forum: { Args: { forum_id: string; reason: string }; Returns: undefined };
      admin_describe_abuse_image: {
        Args: { description_text: string; evidence_id: string };
        Returns: boolean;
      };
      admin_disqualify_contest_entry: {
        Args: { reason: string; target_entry_id: string };
        Returns: string;
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
      admin_end_story_visibility_state: {
        Args: {
          item_id: string;
          item_type: Database['public']['Enums']['reportable_type'];
          leaving_state: string;
          reason_text: string;
        };
        Returns: undefined;
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
      admin_extend_data_request: {
        Args: { extra_months: number; reason: string; target_request_id: string };
        Returns: Json;
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
      admin_finish_data_request_copy: { Args: { target_request_id: string }; Returns: Json };
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
      admin_issue_contest_certificates: { Args: { target_contest_id: string }; Returns: Json };
      admin_landing_picture_states: { Args: { target_page_id: string }; Returns: Json };
      admin_lift_sanction: {
        Args: { reason_given: string; target_sanction_id: string };
        Returns: boolean;
      };
      admin_link_returning_user: {
        Args: { other_handle: string; reason_given: string; target_case_id: string };
        Returns: string;
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
      admin_list_forums: {
        Args: Record<PropertyKey, never>;
        Returns: {
          accent: Database['public']['Enums']['forum_accent'];
          doodle: string;
          id: string;
          is_pinned: boolean;
          level: number;
          missing_languages: string[];
          names: Json;
          parent_id: string;
          position: number;
          slug: string;
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
          is_intern: boolean;
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
      admin_lock_forum_thread: {
        Args: { reason: string; thread_number: number };
        Returns: undefined;
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
      admin_manual_age_checks: {
        Args: Record<PropertyKey, never>;
        Returns: {
          age_band: Database['public']['Enums']['age_band'];
          age_check_result: Database['public']['Enums']['age_check_result'];
          answer_by: string;
          attempts: Json;
          birth_month: number;
          birth_year: number;
          handle: string;
          request_id: string;
          requested_at: string;
        }[];
      };
      admin_march_numbers: { Args: { days?: number }; Returns: Json };
      admin_mark_contest_prize_sent: {
        Args: { parent_consent_on_file: boolean; target_entry_id: string };
        Returns: undefined;
      };
      admin_mark_decision_emails_sent: { Args: { notice_ids: string[] }; Returns: number };
      admin_mark_safeguarding: {
        Args: { reason_given: string; target_case_id: string };
        Returns: boolean;
      };
      admin_mark_support_spam: { Args: { spam: boolean; ticket_number: number }; Returns: boolean };
      admin_merge_support_tickets: {
        Args: { source_number: number; target_number: number };
        Returns: number;
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
      admin_open_contest: { Args: { target_contest_id: string }; Returns: undefined };
      admin_open_data_request: {
        Args: {
          channel: Database['public']['Enums']['data_request_channel'];
          note: string;
          received_on: string;
          request_type: Database['public']['Enums']['data_request_type'];
          target_user_id: string;
        };
        Returns: Json;
      };
      admin_open_data_request_copy: {
        Args: { files: Json; target_request_id: string };
        Returns: Json;
      };
      admin_open_data_request_file: {
        Args: { target_export_id: string; target_request_id: string };
        Returns: string;
      };
      admin_open_teacher_proof: { Args: { check_id: string }; Returns: string };
      admin_open_ticket_data_request: {
        Args: {
          request_type: Database['public']['Enums']['data_request_type'];
          ticket_number: number;
        };
        Returns: Json;
      };
      admin_order_timeline: { Args: { target_case_id: string }; Returns: Json };
      admin_passage_case: {
        Args: { case_reference: string };
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
      admin_passage_place: {
        Args: { full_text: string; occurrence: number; passage: string };
        Returns: number;
      };
      admin_pause_reporting: {
        Args: { note_text?: string; reporter_handle: string; source_case_id?: string };
        Returns: string;
      };
      admin_picture_reject_reasons: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_pictures_to_check: { Args: Record<PropertyKey, never>; Returns: Json[] };
      admin_publish_classic: { Args: { target_story_id: string }; Returns: Json };
      admin_publish_cms_version: { Args: { version_id: string }; Returns: string };
      admin_publish_contest_results: { Args: { target_contest_id: string }; Returns: undefined };
      admin_publish_interface_text: { Args: { version_id: string }; Returns: string };
      admin_publish_landing_page: { Args: { version_id: string }; Returns: string };
      admin_put_back_passage: {
        Args: {
          reason_code: string;
          reason_text: string;
          removal: Omit<
            Database['public']['Tables']['story_revisions']['Row'],
            Database['public']['Tables']['story_revisions']['ComputedFields']
          >;
          story_row: Omit<
            Database['public']['Tables']['stories']['Row'],
            Database['public']['Tables']['stories']['ComputedFields']
          >;
        };
        Returns: string;
      };
      admin_raise_story_rating: {
        Args: {
          new_rating: Database['public']['Enums']['story_rating'];
          reason_given: string;
          target_story_id: string;
        };
        Returns: string;
      };
      admin_recent_picture_openings: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_record_story_change: {
        Args: {
          change_kind: string;
          reason_code: string;
          reason_text: string;
          statement_action: Database['public']['Enums']['statement_action'];
          story_row: Omit<
            Database['public']['Tables']['stories']['Row'],
            Database['public']['Tables']['stories']['ComputedFields']
          >;
          target_chapter_id: string;
          values_after: Json;
          values_before: Json;
        };
        Returns: string;
      };
      admin_reject_picture: {
        Args: {
          account_message?: string;
          message_to_person: string;
          note_text: string;
          police_description?: string;
          reason_key: string;
          target_case_id: string;
        };
        Returns: boolean;
      };
      admin_reject_tag: { Args: { reason: string; tag_id: string }; Returns: number };
      admin_release_case: { Args: { target_case_id: string }; Returns: boolean };
      admin_remove_chapter_passage: {
        Args: {
          case_reference: string;
          occurrence: number;
          passage: string;
          reason_code: string;
          reason_text: string;
          target_chapter_id: string;
        };
        Returns: string;
      };
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
      admin_remove_nudge_word: { Args: { target_word_id: string }; Returns: boolean };
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
      admin_remove_teacher_badge: {
        Args: { reason: string; teacher_handle: string };
        Returns: Json;
      };
      admin_removed_passage: { Args: { target_revision_id: string }; Returns: Json };
      admin_reply_mail: {
        Args: { body: string; is_note?: boolean; thread_reference: string };
        Returns: boolean;
      };
      admin_reply_support_ticket: {
        Args: { body: string; is_note?: boolean; ticket_number: number };
        Returns: boolean;
      };
      admin_request_customisation_change: {
        Args: { item: string; reason: string; reference: string };
        Returns: string;
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
      admin_restore_landing_page_version: { Args: { version_id: string }; Returns: string };
      admin_restore_story_revision: {
        Args: { reason_code: string; reason_text: string; target_revision_id: string };
        Returns: string;
      };
      admin_reveal_email: { Args: { target_user_id: string }; Returns: string };
      admin_reveal_ticket_email: { Args: { ticket_number: number }; Returns: string };
      admin_revoke_certificate: { Args: { code: string; reason: string }; Returns: Json };
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
      admin_save_canned_reply: {
        Args: { body_en: string; body_ro: string; reply_id: string; title: string };
        Returns: string;
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
      admin_save_contest: { Args: { details: Json; target_contest_id: string }; Returns: string[] };
      admin_save_forum: {
        Args: {
          accent: Database['public']['Enums']['forum_accent'];
          doodle: string;
          forum_id: string;
          is_pinned: boolean;
          names: Json;
          parent_id: string;
          slug: string;
          sort_position: number;
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
      admin_save_landing_page_draft: {
        Args: {
          new_content: Json;
          new_show_from?: string;
          new_take_down_on?: string;
          target_page_id: string;
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
      admin_search_stories: {
        Args: {
          category_slug?: string;
          language_code?: string;
          only_minor_writers?: boolean;
          only_open_reports?: boolean;
          page_number?: number;
          readable_by?: string;
          search_text?: string;
          story_status?: string;
          wanted_rating?: Database['public']['Enums']['story_rating'];
        };
        Returns: Json;
      };
      admin_send_data_request_parent_copy: {
        Args: { signature: string; target_request_id: string; token_hash: string };
        Returns: Json;
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
      admin_set_chapter_visibility: {
        Args: {
          reason_code: string;
          reason_text: string;
          target_chapter_id: string;
          wanted_visibility: string;
        };
        Returns: string;
      };
      admin_set_class_school: { Args: { school_name: string; slug: string }; Returns: Json };
      admin_set_classic_chapters: {
        Args: { chapter_list: Json; target_story_id: string };
        Returns: Json;
      };
      admin_set_contest_placing: {
        Args: { target_entry_id: string; wanted_placing: string };
        Returns: undefined;
      };
      admin_set_evidence_hold: {
        Args: { evidence_id: string; reason_given: string; should_hold: boolean };
        Returns: boolean;
      };
      admin_set_flag: { Args: { flag_key: string; turn_on: boolean }; Returns: boolean };
      admin_set_forum_thread_sticky: {
        Args: { is_sticky: boolean; reason: string; thread_number: number };
        Returns: undefined;
      };
      admin_set_intern: {
        Args: { reason_given: string; should_be_intern: boolean; target_user_id: string };
        Returns: boolean;
      };
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
      admin_set_story_presentation: {
        Args: {
          reason_code: string;
          reason_text: string;
          story_part: string;
          target_story_id: string;
          wanted_state: string;
        };
        Returns: string;
      };
      admin_set_story_visibility: {
        Args: {
          reason_code: string;
          reason_text: string;
          target_story_id: string;
          wanted_visibility: string;
        };
        Returns: string;
      };
      admin_sign_out_everywhere: {
        Args: { reason_given: string; target_user_id: string };
        Returns: number;
      };
      admin_story_change_target: {
        Args: { reason_code: string; reason_text: string; target_story_id: string };
        Returns: {
          ai_disclosure: Database['public']['Enums']['ai_disclosure'];
          ai_undisclosed_labelled_at: string | null;
          blurb: string;
          card_colour: string | null;
          category_id: string;
          class_only: boolean;
          class_space_id: string | null;
          classic_author_id: string | null;
          comments_enabled: boolean;
          completion_status: Database['public']['Enums']['completion_status'];
          content_note: string;
          cover_accent: string | null;
          cover_background: string | null;
          cover_design: string | null;
          cover_hidden_at: string | null;
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
          title_hidden_at: string | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'stories';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_story_cover_json: {
        Args: {
          story_row: Omit<
            Database['public']['Tables']['stories']['Row'],
            Database['public']['Tables']['stories']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      admin_story_history_json: { Args: { target_story_id: string }; Returns: Json };
      admin_story_matches: {
        Args: {
          target: Omit<
            Database['public']['Tables']['stories']['Row'],
            Database['public']['Tables']['stories']['ComputedFields']
          >;
          wanted: string;
        };
        Returns: boolean;
      };
      admin_story_overview: { Args: { target_story_id: string }; Returns: Json };
      admin_story_owner_is_minor: { Args: { owner_id: string }; Returns: boolean };
      admin_story_part_state: {
        Args: {
          story_part: string;
          story_row: Omit<
            Database['public']['Tables']['stories']['Row'],
            Database['public']['Tables']['stories']['ComputedFields']
          >;
        };
        Returns: string;
      };
      admin_story_reason_ground: {
        Args: { reason_code: string };
        Returns: Database['public']['Enums']['statement_ground'];
      };
      admin_story_report_counts: { Args: { target_story_id: string }; Returns: Json };
      admin_story_row: {
        Args: {
          target: Omit<
            Database['public']['Tables']['stories']['Row'],
            Database['public']['Tables']['stories']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      admin_story_settings_json: {
        Args: {
          target: Omit<
            Database['public']['Tables']['stories']['Row'],
            Database['public']['Tables']['stories']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      admin_story_status: {
        Args: {
          target: Omit<
            Database['public']['Tables']['stories']['Row'],
            Database['public']['Tables']['stories']['ComputedFields']
          >;
        };
        Returns: string;
      };
      admin_story_visibility: { Args: { target_story_id: string }; Returns: string };
      admin_support_inbox: {
        Args: { assigned_filter?: string; status_filter?: string };
        Returns: {
          assigned_handle: string;
          assigned_to_me: boolean;
          category: Database['public']['Enums']['support_ticket_category'];
          channel: Database['public']['Enums']['support_ticket_channel'];
          created_at: string;
          email_only: boolean;
          first_replied_at: string;
          first_reply_due_at: string;
          last_message_at: string;
          message_count: number;
          number: number;
          priority: Database['public']['Enums']['support_ticket_priority'];
          requester_handle: string;
          status: Database['public']['Enums']['support_ticket_status'];
          subject: string;
        }[];
      };
      admin_support_ticket: { Args: { ticket_number: number }; Returns: Json };
      admin_support_view_counts: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_swap_chapter_words: {
        Args: {
          chapter_row: Omit<
            Database['public']['Tables']['chapters']['Row'],
            Database['public']['Tables']['chapters']['ComputedFields']
          >;
          original: string;
          replacement: string;
          starts_at: number;
        };
        Returns: undefined;
      };
      admin_teacher_checks: {
        Args: Record<PropertyKey, never>;
        Returns: {
          check_id: string;
          display_name: string;
          handle: string;
          has_proof: boolean;
          requested_at: string;
          school_domain: string;
          way: string;
        }[];
      };
      admin_teachers: {
        Args: Record<PropertyKey, never>;
        Returns: {
          badge_since: string;
          display_name: string;
          handle: string;
        }[];
      };
      admin_ticket_links: { Args: { ticket_number: number }; Returns: Json };
      admin_unlink_returning_user: {
        Args: { link_id: string; reason_given: string };
        Returns: boolean;
      };
      admin_unlock_forum_thread: {
        Args: { reason: string; thread_number: number };
        Returns: undefined;
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
      admin_update_support_ticket: {
        Args: { changes: Json; ticket_number: number };
        Returns: boolean;
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
      admin_withdraw_parental_consent: {
        Args: { reason_given: string; target_user_id: string };
        Returns: boolean;
      };
      ads_are_barred: { Args: { context: Json }; Returns: boolean };
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
      age_band_of: {
        Args: { person_id: string };
        Returns: Database['public']['Enums']['age_band'];
      };
      age_check_attempt_history: { Args: { target_user_id: string }; Returns: Json };
      age_check_can_ask_manual: {
        Args: {
          person: Omit<
            Database['public']['Tables']['profiles']['Row'],
            Database['public']['Tables']['profiles']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      age_check_can_start_for: {
        Args: {
          person: Omit<
            Database['public']['Tables']['profiles']['Row'],
            Database['public']['Tables']['profiles']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      age_check_is_signed: { Args: { payload: string; signature: string }; Returns: boolean };
      age_check_numbers: { Args: Record<PropertyKey, never>; Returns: Json };
      age_check_result_value: {
        Args: {
          current_result: Database['public']['Enums']['age_check_result'];
          passed: boolean;
          threshold: number;
        };
        Returns: Database['public']['Enums']['age_check_result'];
      };
      age_check_threshold_for: {
        Args: {
          person: Omit<
            Database['public']['Tables']['profiles']['Row'],
            Database['public']['Tables']['profiles']['ComputedFields']
          >;
        };
        Returns: number;
      };
      ages_allow_messages: {
        Args: {
          first_person: Omit<
            Database['public']['Tables']['profiles']['Row'],
            Database['public']['Tables']['profiles']['ComputedFields']
          >;
          second_person: Omit<
            Database['public']['Tables']['profiles']['Row'],
            Database['public']['Tables']['profiles']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      another_appeals_decider_exists: { Args: Record<PropertyKey, never>; Returns: boolean };
      answer_data_request: {
        Args: { is_mine: boolean; request_reference: string };
        Returns: string;
      };
      answer_data_request_parent: { Args: { is_ours: boolean; token: string }; Returns: Json };
      answer_message_request: {
        Args: { sender_handle: string; should_accept: boolean };
        Returns: Json;
      };
      answer_parental_consent: {
        Args: { decision: string; page_language: string; signature: string; token: string };
        Returns: Json;
      };
      answer_report_detail_request: {
        Args: { answer_text: string; target_request_id: string };
        Returns: undefined;
      };
      apply_support_change: {
        Args: {
          after_value: Json;
          before_value: Json;
          field: string;
          ticket: Omit<
            Database['public']['Tables']['support_tickets']['Row'],
            Database['public']['Tables']['support_tickets']['ComputedFields']
          >;
        };
        Returns: undefined;
      };
      archive_class_space: { Args: { slug: string }; Returns: Json };
      atlas_fold: { Args: { value: string }; Returns: string };
      atlas_picture_file_may_go: { Args: { object_name: string }; Returns: boolean };
      atlas_picture_is_public: { Args: { object_name: string }; Returns: boolean };
      atlas_picture_upload_allowed: { Args: { object_name: string }; Returns: boolean };
      atlas_snippet: { Args: { haystack: string; needle: string }; Returns: string };
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
      auto_solve_support_tickets: { Args: Record<PropertyKey, never>; Returns: number };
      avatar_recipe_valid: { Args: { recipe: Json }; Returns: boolean };
      avatar_upload_allowed: { Args: { object_name: string }; Returns: boolean };
      banned_account_items: {
        Args: { target_user_id: string };
        Returns: {
          item_id: string;
          item_type: Database['public']['Enums']['reportable_type'];
        }[];
      };
      banned_email_hash: { Args: { email: string }; Returns: string };
      begin_age_check: {
        Args: { signature: string; threshold: number; yoti_session_id: string };
        Returns: Json;
      };
      begin_parental_consent: {
        Args: { language: string; parent_email: string; signature: string; token_hash: string };
        Returns: Json;
      };
      begin_teacher_email_check: {
        Args: { school_domain: string; signature: string; token_hash: string };
        Returns: Json;
      };
      bio_for_caller: {
        Args: {
          person: Omit<
            Database['public']['Tables']['profiles']['Row'],
            Database['public']['Tables']['profiles']['ComputedFields']
          >;
        };
        Returns: string;
      };
      birth_year_needs_month: { Args: { birth_year: number; on_date: string }; Returns: boolean };
      blank_old_scrambled_ips: { Args: Record<PropertyKey, never>; Returns: number };
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
      caller_profile_for_teacher_check: {
        Args: Record<PropertyKey, never>;
        Returns: {
          adults_may_message: boolean;
          age_check_method: Database['public']['Enums']['age_check_method'] | null;
          age_check_result: Database['public']['Enums']['age_check_result'];
          age_checked_at: string | null;
          avatar_picture_id: string | null;
          avatar_recipe: Json | null;
          bio: string;
          birth_month: number | null;
          birth_year: number | null;
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
          last_active_at: string | null;
          library_visible_to: Database['public']['Enums']['library_audience'];
          locale: string;
          marketing_email_opt_in: boolean;
          messages_from: Database['public']['Enums']['message_audience'] | null;
          onboarded_at: string | null;
          pen_name: string | null;
          pen_name_changed_at: string | null;
          profile_visible_to: Database['public']['Enums']['profile_audience'] | null;
          region_code: string | null;
          shows_online_status: boolean;
          signature: string | null;
          signature_picture_id: string | null;
          teacher_badge_since: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      can_message: { Args: { recipient_id: string; sender_id: string }; Returns: boolean };
      cancel_account_deletion: { Args: Record<PropertyKey, never>; Returns: Json };
      cancel_schedule: { Args: { chapter_code: string }; Returns: Json };
      cancel_social_sign_up: { Args: Record<PropertyKey, never>; Returns: undefined };
      case_for_links: {
        Args: { must_act: boolean; target_case_id: string };
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
      certificate_name_deleted_on: {
        Args: {
          target: Omit<
            Database['public']['Tables']['certificates']['Row'],
            Database['public']['Tables']['certificates']['ComputedFields']
          >;
        };
        Returns: string;
      };
      certificate_result_from: {
        Args: { typed: string };
        Returns: Database['public']['Enums']['certificate_result'];
      };
      certificate_status: {
        Args: {
          target: Omit<
            Database['public']['Tables']['certificates']['Row'],
            Database['public']['Tables']['certificates']['ComputedFields']
          >;
        };
        Returns: string;
      };
      certificate_student_id: {
        Args: {
          space: Omit<
            Database['public']['Tables']['spaces']['Row'],
            Database['public']['Tables']['spaces']['ComputedFields']
          >;
          typed_handle: string;
        };
        Returns: string;
      };
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
      chapter_of_story: {
        Args: { chapter_code: string; target_story_id: string };
        Returns: string;
      };
      chapter_paragraphs: {
        Args: { body: string };
        Returns: {
          block_number: number;
          paragraph_key: string;
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
      chapter_plan: { Args: { chapter_code: string }; Returns: Json };
      chapter_publish_now: {
        Args: {
          chapter: Omit<
            Database['public']['Tables']['chapters']['Row'],
            Database['public']['Tables']['chapters']['ComputedFields']
          >;
        };
        Returns: undefined;
      };
      chapter_scenes_json: { Args: { target_chapter_id: string }; Returns: Json };
      character_appearances: { Args: { character_id: string }; Returns: Json };
      character_json: {
        Args: {
          target_character: Omit<
            Database['public']['Tables']['story_characters']['Row'],
            Database['public']['Tables']['story_characters']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      character_link_names: {
        Args: {
          target_character: Omit<
            Database['public']['Tables']['story_characters']['Row'],
            Database['public']['Tables']['story_characters']['ComputedFields']
          >;
        };
        Returns: string[];
      };
      character_mentions: { Args: { character_id: string }; Returns: Json };
      character_of_story: {
        Args: { character_id: string; target_story_id: string };
        Returns: string;
      };
      character_part_keys: { Args: { parts: string[] }; Returns: string[] };
      character_sheet_keys: { Args: Record<PropertyKey, never>; Returns: string[] };
      chat_cleared_at: { Args: { chat_id: string; person_id: string }; Returns: string };
      check_bible_text: { Args: { body: string }; Returns: string };
      check_birthday: { Args: { wanted_day: number; wanted_month: number }; Returns: undefined };
      check_certificate_class: {
        Args: {
          space: Omit<
            Database['public']['Tables']['spaces']['Row'],
            Database['public']['Tables']['spaces']['ComputedFields']
          >;
        };
        Returns: undefined;
      };
      check_chapter_embeds: { Args: { body: string; owner_id: string }; Returns: undefined };
      check_chapter_pictures: { Args: { body: string; owner_id: string }; Returns: undefined };
      check_chapter_text: { Args: { body: string }; Returns: string };
      check_character_texts: { Args: { allowed_keys: string[]; texts: Json }; Returns: undefined };
      check_comment_text: { Args: { body: string }; Returns: string };
      check_custom_value_keys: {
        Args: { custom: Json; target_story_id: string };
        Returns: undefined;
      };
      check_forum_post_text: { Args: { body: string }; Returns: string };
      check_forum_thread_title: { Args: { title: string }; Returns: string };
      check_handle: { Args: { candidate: string }; Returns: string };
      check_invite: { Args: { code: string }; Returns: string };
      check_pen_name: { Args: { candidate: string }; Returns: string };
      check_space_text: { Args: { field: string; value: string }; Returns: string };
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
      class_certificates: { Args: { slug: string }; Returns: Json };
      class_invite: { Args: { slug: string }; Returns: Json };
      class_invite_preview: { Args: { code: string }; Returns: Json };
      class_invite_row: {
        Args: { code: string };
        Returns: {
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
        SetofOptions: {
          from: '*';
          to: 'invites';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      class_space_for_invites: {
        Args: { target_slug: string };
        Returns: {
          age_group: Database['public']['Enums']['space_age_group'];
          archived_at: string | null;
          banner: Database['public']['Enums']['space_banner'];
          banner_picture_id: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string;
          id: string;
          joining: Database['public']['Enums']['space_joining'];
          kind: Database['public']['Enums']['space_kind'];
          locks_at: string | null;
          name: string;
          name_key: string;
          posting: Database['public']['Enums']['space_posting'];
          readers: Database['public']['Enums']['space_readers'];
          rules: string;
          school_name: string | null;
          slug: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'spaces';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      class_space_stories: { Args: { slug: string }; Returns: Json };
      class_waiting_members: { Args: { slug: string }; Returns: Json };
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
      clean_bible_tags: { Args: { raw_tags: Json }; Returns: string[] };
      clean_certificate_code: { Args: { typed: string }; Returns: string };
      clean_mail_text: { Args: { longest: number; raw_text: string }; Returns: string };
      clear_my_sign_in_failures: { Args: Record<PropertyKey, never>; Returns: undefined };
      close_account_for_abuse_image: {
        Args: {
          account_message: string;
          found_case: Omit<
            Database['public']['Tables']['cases']['Row'],
            Database['public']['Tables']['cases']['ComputedFields']
          >;
          note_text: string;
        };
        Returns: boolean;
      };
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
      comment_paragraph_json: {
        Args: {
          body: string;
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
      confirm_teacher_email: { Args: { token: string }; Returns: Json };
      contact_topic_subject: { Args: { language: string; topic: string }; Returns: string };
      content_is_held_for_moderation: {
        Args: { item_id: string; item_type: Database['public']['Enums']['reportable_type'] };
        Returns: boolean;
      };
      contest_detail_problems: {
        Args: {
          target: Omit<
            Database['public']['Tables']['contests']['Row'],
            Database['public']['Tables']['contests']['ComputedFields']
          >;
        };
        Returns: string[];
      };
      contest_details_from_json: {
        Args: {
          current_row: Omit<
            Database['public']['Tables']['contests']['Row'],
            Database['public']['Tables']['contests']['ComputedFields']
          >;
          details: Json;
        };
        Returns: {
          age_groups: string[];
          created_at: string;
          entries_close_on: string | null;
          entries_open_on: string | null;
          id: string;
          judges: string;
          landing_page_id: string;
          language_codes: string[];
          market_codes: string[];
          name_en: string;
          name_ro: string;
          opened_at: string | null;
          prize_delivered_by: string;
          prize_en: string;
          prize_ro: string;
          results_on: string | null;
          results_published_at: string | null;
          rules_page_key: string | null;
          updated_at: string;
          user_id: string | null;
          what_counts_en: string;
          what_counts_ro: string;
          word_limit: number | null;
        };
        SetofOptions: {
          from: '*';
          to: 'contests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      contest_entries_have_closed: {
        Args: {
          target: Omit<
            Database['public']['Tables']['contests']['Row'],
            Database['public']['Tables']['contests']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      contest_entry_options: { Args: { story_slug: string }; Returns: Json };
      contest_landing_problems: {
        Args: {
          target: Omit<
            Database['public']['Tables']['contests']['Row'],
            Database['public']['Tables']['contests']['ComputedFields']
          >;
        };
        Returns: string[];
      };
      contest_problems: {
        Args: {
          target: Omit<
            Database['public']['Tables']['contests']['Row'],
            Database['public']['Tables']['contests']['ComputedFields']
          >;
        };
        Returns: string[];
      };
      contest_results_json: { Args: { content: Json; target_page_id: string }; Returns: Json };
      contest_rules_are_published: {
        Args: {
          target: Omit<
            Database['public']['Tables']['contests']['Row'],
            Database['public']['Tables']['contests']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      contest_story_problems: {
        Args: {
          story: Omit<
            Database['public']['Tables']['stories']['Row'],
            Database['public']['Tables']['stories']['ComputedFields']
          >;
          target: Omit<
            Database['public']['Tables']['contests']['Row'],
            Database['public']['Tables']['contests']['ComputedFields']
          >;
        };
        Returns: string[];
      };
      contest_takes_entries_today: {
        Args: {
          target: Omit<
            Database['public']['Tables']['contests']['Row'],
            Database['public']['Tables']['contests']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      contest_writer_fits: {
        Args: {
          target: Omit<
            Database['public']['Tables']['contests']['Row'],
            Database['public']['Tables']['contests']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      conversation_between: {
        Args: { first_user_id: string; second_user_id: string };
        Returns: {
          accepted_at: string | null;
          created_at: string;
          id: string;
          last_message_at: string;
          recipient_user_id: string;
          status: Database['public']['Enums']['conversation_status'];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'conversations';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      conversation_can_send: {
        Args: {
          chat: Omit<
            Database['public']['Tables']['conversations']['Row'],
            Database['public']['Tables']['conversations']['ComputedFields']
          >;
          other_id: string;
          writer_id: string;
        };
        Returns: boolean;
      };
      conversation_messages_json: { Args: { chat_id: string; reader_id: string }; Returns: Json };
      conversation_with: { Args: { other_handle: string }; Returns: Json };
      count_links: { Args: { body: string }; Returns: number };
      count_words: { Args: { body: string }; Returns: number };
      cover_upload_allowed: { Args: { object_name: string }; Returns: boolean };
      create_bible_entry: { Args: { entry_title: string; section_id: string }; Returns: Json };
      create_chapter: { Args: { story_slug: string }; Returns: Json };
      create_class_space: {
        Args: {
          banner?: Database['public']['Enums']['space_banner'];
          description: string;
          name: string;
          rules?: string;
        };
        Returns: Json;
      };
      create_monthly_safety_checks: { Args: Record<PropertyKey, never>; Returns: number };
      create_my_support_ticket: {
        Args: {
          body: string;
          category?: Database['public']['Enums']['support_ticket_category'];
          subject: string;
        };
        Returns: Json;
      };
      create_profile_from_sign_up: {
        Args: { new_user_id: string; sign_up_data: Json };
        Returns: undefined;
      };
      create_space: {
        Args: {
          banner?: Database['public']['Enums']['space_banner'];
          description: string;
          joining?: Database['public']['Enums']['space_joining'];
          name: string;
          posting?: Database['public']['Enums']['space_posting'];
          readers?: Database['public']['Enums']['space_readers'];
          rules?: string;
        };
        Returns: Json;
      };
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
      create_story_character: {
        Args: { character_name: string; character_role: string; story_slug: string };
        Returns: Json;
      };
      current_seasonal_doodle: {
        Args: { on_date: string; place: string };
        Returns: {
          doodle: Database['public']['Enums']['seasonal_doodle'];
        }[];
      };
      data_export_tables: {
        Args: Record<PropertyKey, never>;
        Returns: {
          is_included: boolean;
          table_name: string;
          why_left_out: string;
        }[];
      };
      data_request_by_parent_token: {
        Args: { raw_token: string };
        Returns: {
          channel: Database['public']['Enums']['data_request_channel'];
          closed_at: string | null;
          copies_sent: NonNullable<Json>;
          created_at: string;
          created_by_user_id: string;
          due_on: string;
          extended_at: string | null;
          extended_to: string | null;
          extension_reason: string | null;
          goes_to_parent: boolean;
          handled_by_user_id: string;
          id: string;
          identity: Database['public']['Enums']['data_request_identity'];
          identity_answered_at: string | null;
          identity_asked_at: string | null;
          note: string;
          outcome: string | null;
          parent_check_token_hash: string | null;
          parent_copy_opened_at: string | null;
          parent_copy_sent_at: string | null;
          parent_copy_token_hash: string | null;
          received_on: string;
          reference: string;
          request_type: Database['public']['Enums']['data_request_type'];
          state: Database['public']['Enums']['data_request_state'];
          support_ticket_id: string | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'data_requests';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      data_request_deadline: {
        Args: {
          request: Omit<
            Database['public']['Tables']['data_requests']['Row'],
            Database['public']['Tables']['data_requests']['ComputedFields']
          >;
        };
        Returns: string;
      };
      data_request_files_json: {
        Args: { target_request_id: string; with_file_name: boolean };
        Returns: Json;
      };
      data_request_json: {
        Args: {
          request: Omit<
            Database['public']['Tables']['data_requests']['Row'],
            Database['public']['Tables']['data_requests']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      data_request_parent_consent: {
        Args: { person_id: string };
        Returns: {
          created_at: string;
          decided_at: string | null;
          id: string;
          is_guardian_confirmed: boolean;
          language: string;
          parent_email: string;
          privacy_version_id: string | null;
          status: string;
          terms_version_id: string | null;
          token_hash: string;
          updated_at: string;
          user_id: string;
          withdrawn_at: string | null;
          withdrawn_by: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'parental_consents';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      data_request_parent_copy_state: {
        Args: {
          request: Omit<
            Database['public']['Tables']['data_requests']['Row'],
            Database['public']['Tables']['data_requests']['ComputedFields']
          >;
        };
        Returns: string;
      };
      data_request_parent_email: {
        Args: {
          consent: Omit<
            Database['public']['Tables']['parental_consents']['Row'],
            Database['public']['Tables']['parental_consents']['ComputedFields']
          >;
          request: Omit<
            Database['public']['Tables']['data_requests']['Row'],
            Database['public']['Tables']['data_requests']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      data_request_parent_is_signed: {
        Args: { purpose: string; signature: string; target_request_id: string; token_hash: string };
        Returns: boolean;
      };
      data_request_parent_link: { Args: { token: string }; Returns: Json };
      data_request_person_is_under_16: { Args: { person_id: string }; Returns: boolean };
      data_request_urgency: {
        Args: {
          request: Omit<
            Database['public']['Tables']['data_requests']['Row'],
            Database['public']['Tables']['data_requests']['ComputedFields']
          >;
        };
        Returns: string;
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
      decide_space_join_request: {
        Args: { approve: boolean; handle: string; slug: string };
        Returns: Json;
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
      delete_account_conversation: { Args: { target_user_id: string }; Returns: undefined };
      delete_account_data: { Args: { target_user_id: string }; Returns: undefined };
      delete_account_forum_posts: { Args: { target_user_id: string }; Returns: undefined };
      delete_account_stories: { Args: { target_user_id: string }; Returns: undefined };
      delete_bible_entry: { Args: { entry_id: string }; Returns: Json };
      delete_bible_section: { Args: { section_id: string }; Returns: Json };
      delete_chapter: { Args: { chapter_code: string }; Returns: Json };
      delete_chapter_scene: { Args: { scene_id: string }; Returns: Json };
      delete_character_relationship: { Args: { relationship_id: string }; Returns: Json };
      delete_comment: { Args: { comment_id: string }; Returns: boolean };
      delete_conversation: { Args: { other_handle: string }; Returns: Json };
      delete_forum_post: { Args: { post_id: string }; Returns: Json };
      delete_my_story: { Args: { story_slug: string }; Returns: Json };
      delete_story_character: { Args: { character_id: string }; Returns: Json };
      delete_story_event: { Args: { event_id: string }; Returns: Json };
      delete_story_idea: { Args: { idea_id: string }; Returns: Json };
      disconnect_canva: { Args: Record<PropertyKey, never>; Returns: boolean };
      display_name: { Args: { handle: string; pen_name: string }; Returns: string };
      downvote_comment: {
        Args: { comment_id: string; should_downvote: boolean };
        Returns: boolean;
      };
      edit_forum_post: { Args: { body: string; post_id: string; title?: string }; Returns: Json };
      email_delivery_for: {
        Args: { kind: Database['public']['Enums']['notification_kind']; target_user_id: string };
        Returns: string;
      };
      email_domain_allowed: { Args: { email: string }; Returns: boolean };
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
      end_class_invite: { Args: { slug: string }; Returns: boolean };
      end_live_class_invites: { Args: { target_space_id: string }; Returns: number };
      end_my_session: { Args: { target_session_id: string }; Returns: boolean };
      enter_contest: {
        Args: { story_slug: string; target_contest_id: string };
        Returns: undefined;
      };
      erase_closed_account: { Args: { target_user_id: string }; Returns: undefined };
      erase_unchecked_account: { Args: { target_user_id: string }; Returns: undefined };
      erase_unchecked_accounts: { Args: Record<PropertyKey, never>; Returns: number };
      escalate_on_call_alerts: { Args: Record<PropertyKey, never>; Returns: number };
      expect_identity_link: { Args: { wanted_provider: string }; Returns: undefined };
      export_account_of: { Args: { owner_id: string }; Returns: Json };
      export_download_allowed: { Args: { object_name: string }; Returns: boolean };
      export_file_extension: {
        Args: {
          choices: boolean[];
          document_format: string;
          kind: Database['public']['Enums']['export_kind'];
          story_id: string;
        };
        Returns: string;
      };
      export_library_of: { Args: { owner_id: string }; Returns: Json };
      export_parent_link_open_allowed: { Args: { object_name: string }; Returns: boolean };
      export_row_for_owner: { Args: { stored_row: Json }; Returns: Json };
      export_staff_open_allowed: { Args: { object_name: string }; Returns: boolean };
      export_staff_upload_allowed: { Args: { object_name: string }; Returns: boolean };
      export_support_tickets_of: { Args: { owner_id: string }; Returns: Json };
      export_tables_of: { Args: { owner_id: string }; Returns: Json };
      export_upload_allowed: { Args: { object_name: string }; Returns: boolean };
      finish_data_export: { Args: { export_id: string; story_count: number }; Returns: Json };
      finish_onboarding: { Args: Record<PropertyKey, never>; Returns: undefined };
      finish_social_sign_up: { Args: { sign_up_data: Json }; Returns: Json };
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
      flag_possible_returning_user: { Args: { new_user_id: string }; Returns: string };
      fold_look_alike_characters: { Args: { name: string }; Returns: string };
      fold_old_daily_totals: { Args: Record<PropertyKey, never>; Returns: number };
      follow_story: { Args: { should_follow: boolean; story_slug: string }; Returns: Json };
      follow_writer: { Args: { should_follow: boolean; target_handle: string }; Returns: Json };
      follower_count_of: { Args: { writer_id: string }; Returns: number };
      forget_character_picture: { Args: { old_picture_id: string }; Returns: Json };
      forget_old_activity: { Args: Record<PropertyKey, never>; Returns: number };
      forum_and_children: { Args: { top_forum_id: string }; Returns: string[] };
      forum_as_json: { Args: { target_forum_id: string }; Returns: Json };
      forum_first_unread_post: {
        Args: {
          target: Omit<
            Database['public']['Tables']['forum_threads']['Row'],
            Database['public']['Tables']['forum_threads']['ComputedFields']
          >;
        };
        Returns: number;
      };
      forum_has_unread: { Args: { target_forum_id: string }; Returns: boolean };
      forum_index: {
        Args: { language_code: string };
        Returns: {
          accent: Database['public']['Enums']['forum_accent'];
          description: string;
          doodle: string;
          has_unread: boolean;
          id: string;
          is_pinned: boolean;
          latest_activity_at: string;
          latest_post: Json;
          level: number;
          name: string;
          parent_id: string;
          position: number;
          post_count: number;
          slug: string;
          thread_count: number;
        }[];
      };
      forum_live_post_count: { Args: { target_thread_id: string }; Returns: number };
      forum_name_in: {
        Args: { target_forum_id: string; wanted_language: string };
        Returns: {
          description: string;
          name: string;
        }[];
      };
      forum_name_problems: { Args: { names: Json }; Returns: string[] };
      forum_new_for_you: { Args: { how_many?: number; language_code?: string }; Returns: Json };
      forum_person_json: { Args: { person_id: string }; Returns: Json };
      forum_post_history: { Args: { post_id: string }; Returns: Json };
      forum_post_json: {
        Args: {
          starter_id: string;
          target: Omit<
            Database['public']['Tables']['forum_posts']['Row'],
            Database['public']['Tables']['forum_posts']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      forum_post_search_text: {
        Args: {
          target: Omit<
            Database['public']['Tables']['forum_posts']['Row'],
            Database['public']['Tables']['forum_posts']['ComputedFields']
          >;
          thread_title: string;
        };
        Returns: string;
      };
      forum_post_state_for_caller: {
        Args: {
          target: Omit<
            Database['public']['Tables']['forum_posts']['Row'],
            Database['public']['Tables']['forum_posts']['ComputedFields']
          >;
        };
        Returns: string;
      };
      forum_post_wait_minutes: { Args: { author_id: string }; Returns: number };
      forum_quote_json: { Args: { quoted_post_id: string }; Returns: Json };
      forum_quotes_for_reply: {
        Args: { target_thread_id: string; wanted: string[] };
        Returns: string[];
      };
      forum_read_since: { Args: { target_forum_id: string }; Returns: string };
      forum_search_snippet: { Args: { body: string }; Returns: string };
      forum_thread: {
        Args: { after_post?: number; thread_number: number; up_to_post?: number };
        Returns: Json;
      };
      forum_thread_for_moderation: {
        Args: { reason: string; thread_number: number };
        Returns: {
          bumped_at: string;
          created_at: string;
          deleted_at: string | null;
          forum_id: string;
          id: string;
          is_sticky: boolean;
          last_post_at: string;
          last_post_number: number;
          lock_reason: string | null;
          locked_at: string | null;
          locked_by_user_id: string | null;
          thread_number: number;
          title: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'forum_threads';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      forum_thread_header_json: {
        Args: {
          target: Omit<
            Database['public']['Tables']['forum_threads']['Row'],
            Database['public']['Tables']['forum_threads']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      forum_thread_is_shown: {
        Args: {
          target: Omit<
            Database['public']['Tables']['forum_threads']['Row'],
            Database['public']['Tables']['forum_threads']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      forum_thread_list: { Args: { forum_slug: string; older_than?: string }; Returns: Json };
      forum_thread_summary_json: {
        Args: {
          target: Omit<
            Database['public']['Tables']['forum_threads']['Row'],
            Database['public']['Tables']['forum_threads']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      forum_unread_post_count: {
        Args: {
          target: Omit<
            Database['public']['Tables']['forum_threads']['Row'],
            Database['public']['Tables']['forum_threads']['ComputedFields']
          >;
        };
        Returns: number;
      };
      generate_invite_code: { Args: Record<PropertyKey, never>; Returns: string };
      get_chapter: { Args: { chapter_code: string; story_slug: string }; Returns: Json };
      get_link_preview: { Args: { chapter_code?: string; story_slug: string }; Returns: Json };
      get_public_story_plan: { Args: { story_slug: string }; Returns: Json };
      get_shared_passage: {
        Args: { chapter_code: string; first_block: number; last_block: number; story_slug: string };
        Returns: Json;
      };
      get_story_page: { Args: { story_slug: string }; Returns: Json };
      get_writer_profile: { Args: { wanted_handle: string }; Returns: Json };
      grant_teacher_badge: { Args: { target_user_id: string }; Returns: undefined };
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
      has_parental_consent: { Args: { target_user_id: string }; Returns: boolean };
      hash_email: { Args: { email: string }; Returns: string };
      held_message_ids: {
        Args: Record<PropertyKey, never>;
        Returns: {
          message_id: string;
        }[];
      };
      hidden_title_marker: { Args: { language_code: string }; Returns: string };
      hide_banned_account: {
        Args: {
          ban: Omit<
            Database['public']['Tables']['sanctions']['Row'],
            Database['public']['Tables']['sanctions']['ComputedFields']
          >;
        };
        Returns: number;
      };
      house_ad_candidates: {
        Args: { page_key: string };
        Returns: {
          ad_key: string;
          ad_rank: number;
          kind: string;
          page_slug: string;
          title_en: string;
          title_ro: string;
        }[];
      };
      insert_class_space: {
        Args: {
          banner: Database['public']['Enums']['space_banner'];
          description: string;
          name: string;
          owner_id: string;
          rules: string;
          school: string;
        };
        Returns: {
          age_group: Database['public']['Enums']['space_age_group'];
          archived_at: string | null;
          banner: Database['public']['Enums']['space_banner'];
          banner_picture_id: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string;
          id: string;
          joining: Database['public']['Enums']['space_joining'];
          kind: Database['public']['Enums']['space_kind'];
          locks_at: string | null;
          name: string;
          name_key: string;
          posting: Database['public']['Enums']['space_posting'];
          readers: Database['public']['Enums']['space_readers'];
          rules: string;
          school_name: string | null;
          slug: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'spaces';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
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
      invite_new_adults_to_age_check: { Args: Record<PropertyKey, never>; Returns: number };
      is_active_member: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_blocked_with: { Args: { other_user_id: string }; Returns: boolean };
      is_email_banned: { Args: { email: string }; Returns: boolean };
      is_feature_enabled: { Args: { flag_key: string }; Returns: boolean };
      is_in_quiet_hours: { Args: { time_of_day: string }; Returns: boolean };
      is_known_time_zone: { Args: { zone_name: string }; Returns: boolean };
      is_moderated_away: {
        Args: { item_id: string; item_type: Database['public']['Enums']['reportable_type'] };
        Returns: boolean;
      };
      is_personal_email_domain: { Args: { domain: string }; Returns: boolean };
      is_picture_reviewer: { Args: { person_id: string }; Returns: boolean };
      is_school_domain_trusted: { Args: { domain: string }; Returns: boolean };
      is_social_provider: { Args: { provider: string }; Returns: boolean };
      is_staff: {
        Args: { required_role?: Database['public']['Enums']['staff_role'] };
        Returns: boolean;
      };
      is_staff_session: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_story_list_kind: { Args: { list_kind: string }; Returns: boolean };
      is_story_restricted: { Args: { target_story_id: string }; Returns: boolean };
      is_under_18_or_unknown: { Args: { person_id: string }; Returns: boolean };
      issue_class_certificates: {
        Args: { programme_name: string; results: Json; slug: string };
        Returns: Json;
      };
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
      join_class_space: { Args: { code: string }; Returns: Json };
      join_space: { Args: { slug: string }; Returns: Json };
      jsonb_values_text: { Args: { document: Json }; Returns: string };
      keep_setting: { Args: { default_value: number; setting_key: string }; Returns: number };
      landing_block_extra_problems: {
        Args: { block: Json; block_path: string };
        Returns: string[];
      };
      landing_block_field_rules: {
        Args: Record<PropertyKey, never>;
        Returns: {
          block_kind: string;
          field_name: string;
          is_required: boolean;
          longest: number;
        }[];
      };
      landing_entries_open_on: { Args: { content: Json }; Returns: string };
      landing_featured_cards: { Args: { content: Json }; Returns: Json };
      landing_featured_problems: { Args: { block: Json; block_path: string }; Returns: string[] };
      landing_page: { Args: { page_slug: string }; Returns: Json };
      landing_page_live_version: {
        Args: { target_page_id: string };
        Returns: {
          content: NonNullable<Json>;
          created_at: string;
          id: string;
          page_id: string;
          published_at: string | null;
          show_from: string | null;
          status: string;
          take_down_on: string | null;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'landing_page_versions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      landing_page_pictures: { Args: { content: Json }; Returns: Json };
      landing_page_problems: { Args: { content: Json; page_type: string }; Returns: string[] };
      landing_page_slug_problem: { Args: { wanted_slug: string }; Returns: string };
      landing_picture_problems: { Args: { block: Json; block_path: string }; Returns: string[] };
      landing_picture_upload_allowed: { Args: { object_name: string }; Returns: boolean };
      landing_reminder_json: { Args: { content: Json; target_page_id: string }; Returns: Json };
      landing_text_problem: {
        Args: {
          block: Json;
          field_name: string;
          field_path: string;
          is_required: boolean;
          language_code: string;
          longest: number;
        };
        Returns: string;
      };
      landing_youngest_ratings: {
        Args: { content: Json };
        Returns: Database['public']['Enums']['story_rating'][];
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
      latest_legal_version: {
        Args: { document_slug: string; wanted_language: string };
        Returns: string;
      };
      latest_manual_age_check: { Args: { target_user_id: string }; Returns: Json };
      latest_material_legal_version: { Args: { target_document_id: string }; Returns: string };
      latest_place_json: { Args: { target_story_id: string }; Returns: Json };
      launch_task: { Args: Record<PropertyKey, never>; Returns: Json };
      leave_space: { Args: { slug: string }; Returns: undefined };
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
      library_is_open_to: {
        Args: {
          owner: Omit<
            Database['public']['Tables']['profiles']['Row'],
            Database['public']['Tables']['profiles']['ComputedFields']
          >;
          viewer_id: string;
        };
        Returns: boolean;
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
          card_colour: string | null;
          category_id: string;
          class_only: boolean;
          class_space_id: string | null;
          classic_author_id: string | null;
          comments_enabled: boolean;
          completion_status: Database['public']['Enums']['completion_status'];
          content_note: string;
          cover_accent: string | null;
          cover_background: string | null;
          cover_design: string | null;
          cover_hidden_at: string | null;
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
          title_hidden_at: string | null;
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
      log_space_action: {
        Args: {
          about_thread_id: string;
          about_user_id: string;
          action_taken: string;
          details?: Json;
          note: string;
          target: Omit<
            Database['public']['Tables']['spaces']['Row'],
            Database['public']['Tables']['spaces']['ComputedFields']
          >;
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
      log_thread_moderation: {
        Args: {
          action_taken: string;
          reason: string;
          thread: Omit<
            Database['public']['Tables']['forum_threads']['Row'],
            Database['public']['Tables']['forum_threads']['ComputedFields']
          >;
          values_after: Json;
          values_before: Json;
        };
        Returns: undefined;
      };
      make_bible_sections: {
        Args: { plan_story_id: string; writer_id: string };
        Returns: undefined;
      };
      make_class_invite: {
        Args: { admits?: number; slug: string; valid_days?: number };
        Returns: Json;
      };
      make_quote_card: { Args: { chapter_code: string; story_slug: string }; Returns: Json };
      manual_decision_result: {
        Args: { current_result: Database['public']['Enums']['age_check_result']; decision: string };
        Returns: Database['public']['Enums']['age_check_result'];
      };
      mark_conversation_read: { Args: { other_handle: string }; Returns: undefined };
      mark_forum_thread_read: {
        Args: { thread_number: number; up_to_post: number };
        Returns: undefined;
      };
      mark_forums_read: { Args: { forum_slug?: string }; Returns: undefined };
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
      masked_email: { Args: { address: string }; Returns: string };
      may_keep_writing: { Args: { other_id: string; writer_id: string }; Returns: boolean };
      may_review_pictures: { Args: Record<PropertyKey, never>; Returns: boolean };
      may_see_case: { Args: { case_is_safeguarding: boolean }; Returns: boolean };
      may_see_march_numbers: { Args: Record<PropertyKey, never>; Returns: boolean };
      message_age_group: {
        Args: {
          person: Omit<
            Database['public']['Tables']['profiles']['Row'],
            Database['public']['Tables']['profiles']['ComputedFields']
          >;
        };
        Returns: string;
      };
      message_audience_of: {
        Args: {
          person: Omit<
            Database['public']['Tables']['profiles']['Row'],
            Database['public']['Tables']['profiles']['ComputedFields']
          >;
        };
        Returns: Database['public']['Enums']['message_audience'];
      };
      message_body_for: {
        Args: {
          message: Omit<
            Database['public']['Tables']['messages']['Row'],
            Database['public']['Tables']['messages']['ComputedFields']
          >;
          reader_id: string;
        };
        Returns: string;
      };
      message_with_context: { Args: { reported_message_id: string }; Returns: Json };
      messaging_partner: {
        Args: { wanted_handle: string };
        Returns: {
          adults_may_message: boolean;
          age_check_method: Database['public']['Enums']['age_check_method'] | null;
          age_check_result: Database['public']['Enums']['age_check_result'];
          age_checked_at: string | null;
          avatar_picture_id: string | null;
          avatar_recipe: Json | null;
          bio: string;
          birth_month: number | null;
          birth_year: number | null;
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
          last_active_at: string | null;
          library_visible_to: Database['public']['Enums']['library_audience'];
          locale: string;
          marketing_email_opt_in: boolean;
          messages_from: Database['public']['Enums']['message_audience'] | null;
          onboarded_at: string | null;
          pen_name: string | null;
          pen_name_changed_at: string | null;
          profile_visible_to: Database['public']['Enums']['profile_audience'] | null;
          region_code: string | null;
          shows_online_status: boolean;
          signature: string | null;
          signature_picture_id: string | null;
          teacher_badge_since: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
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
      move_bible_section: { Args: { new_position: number; section_id: string }; Returns: Json };
      move_chapter: { Args: { chapter_code: string; direction: number }; Returns: Json };
      move_chapter_scene: { Args: { new_position: number; scene_id: string }; Returns: Json };
      my_account_deletion: { Args: Record<PropertyKey, never>; Returns: Json };
      my_age_check: { Args: Record<PropertyKey, never>; Returns: Json };
      my_bible_entry: {
        Args: { target_entry_id: string };
        Returns: {
          body: string;
          created_at: string;
          id: string;
          is_private: boolean;
          section_id: string;
          show_from_chapter_id: string | null;
          story_id: string;
          tags: string[];
          title: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'story_bible_entries';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      my_bible_section: {
        Args: { target_section_id: string };
        Returns: {
          created_at: string;
          id: string;
          is_private: boolean;
          name: string;
          position: number;
          preset: string | null;
          story_id: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'story_bible_sections';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      my_blocked_accounts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          blocked_at: string;
          display_name: string;
          handle: string;
        }[];
      };
      my_certificates: { Args: Record<PropertyKey, never>; Returns: Json };
      my_chapter_plan: {
        Args: { chapter_code: string };
        Returns: {
          act_id: string | null;
          chapter_id: string;
          created_at: string;
          kind: string;
          location: string;
          planning_status: string;
          pov_character_id: string | null;
          story_id: string;
          summary: string;
          updated_at: string;
          user_id: string;
          word_target: number | null;
          world_date: string;
          world_sort: number | null;
        };
        SetofOptions: {
          from: '*';
          to: 'chapter_plans';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      my_chapter_scene: {
        Args: { target_scene_id: string };
        Returns: {
          chapter_id: string;
          created_at: string;
          id: string;
          position: number;
          pov_character_id: string | null;
          status: string;
          story_id: string;
          summary: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'chapter_scenes';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      my_class_choices: { Args: Record<PropertyKey, never>; Returns: Json };
      my_conversations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          has_unread: boolean;
          is_request_to_me: boolean;
          last_message_at: string;
          last_message_from_me: boolean;
          last_message_preview: string;
          other_display_name: string;
          other_handle: string;
          status: Database['public']['Enums']['conversation_status'];
        }[];
      };
      my_data_export: { Args: Record<PropertyKey, never>; Returns: Json };
      my_data_requests: { Args: Record<PropertyKey, never>; Returns: Json };
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
      my_login_methods: { Args: Record<PropertyKey, never>; Returns: Json };
      my_message_settings: { Args: Record<PropertyKey, never>; Returns: Json };
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
      my_onboarding: { Args: Record<PropertyKey, never>; Returns: Json };
      my_parental_consent: { Args: Record<PropertyKey, never>; Returns: Json };
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
      my_plan_item_kind: { Args: { target_item_id: string }; Returns: string };
      my_planned_story_id: { Args: { story_slug: string }; Returns: string };
      my_privacy_settings: { Args: Record<PropertyKey, never>; Returns: Json };
      my_reading_habit: { Args: Record<PropertyKey, never>; Returns: Json };
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
      my_signature: { Args: Record<PropertyKey, never>; Returns: Json };
      my_space_age_group: {
        Args: Record<PropertyKey, never>;
        Returns: Database['public']['Enums']['space_age_group'];
      };
      my_staff_areas: {
        Args: Record<PropertyKey, never>;
        Returns: {
          access: string;
          area: string;
        }[];
      };
      my_statements: { Args: Record<PropertyKey, never>; Returns: Json };
      my_story_character: {
        Args: { target_character_id: string };
        Returns: {
          created_at: string;
          custom_values: NonNullable<Json>;
          first_appearance_chapter_id: string | null;
          id: string;
          is_private: boolean;
          name: string;
          picture_alt: string;
          picture_id: string | null;
          public_sheet_parts: string[];
          role: string;
          sheet: NonNullable<Json>;
          show_from_chapter_id: string | null;
          story_id: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'story_characters';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      my_story_event: {
        Args: { target_event_id: string };
        Returns: {
          created_at: string;
          description: string;
          display_date: string;
          id: string;
          is_private: boolean;
          show_from_chapter_id: string | null;
          sort_value: number;
          story_id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'story_events';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      my_story_idea: {
        Args: { target_idea_id: string };
        Returns: {
          body: string;
          created_at: string;
          done_at: string | null;
          id: string;
          kind: string;
          outcome: string;
          story_id: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'story_ideas';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      my_support_ticket: { Args: { ticket_number: number }; Returns: Json };
      my_support_tickets: {
        Args: Record<PropertyKey, never>;
        Returns: {
          category: Database['public']['Enums']['support_ticket_category'];
          created_at: string;
          last_message_at: string;
          number: number;
          status: Database['public']['Enums']['support_ticket_status'];
          subject: string;
          team_replied_last: boolean;
        }[];
      };
      my_teacher_check: { Args: Record<PropertyKey, never>; Returns: Json };
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
      new_certificate_code: { Args: Record<PropertyKey, never>; Returns: string };
      next_class_lock_at: { Args: Record<PropertyKey, never>; Returns: string };
      next_notice_reference: { Args: { notice_kind: string }; Returns: string };
      normalise_invite_code: { Args: { code: string }; Returns: string };
      normalise_pen_name: { Args: { typed_name: string }; Returns: string };
      normalise_romanian_letters: { Args: { input_text: string }; Returns: string };
      normalise_tag: { Args: { tag_name: string }; Returns: string };
      normalised_email: { Args: { email: string }; Returns: string };
      note_i_am_online: { Args: Record<PropertyKey, never>; Returns: undefined };
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
      notification_staff_change_json: { Args: { target_revision_id: string }; Returns: Json };
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
      onboarding_is_due: { Args: { target_user_id: string }; Returns: boolean };
      onboarding_topics: {
        Args: { wanted_language: string };
        Returns: {
          name: string;
          tag_id: string;
        }[];
      };
      open_data_request_parent_copy: { Args: { token: string }; Returns: Json };
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
      open_picture_review_case: {
        Args: {
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
      own_forum_post_for_change: {
        Args: { post_id: string };
        Returns: {
          body: string;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          post_number: number;
          quoted_post_ids: string[];
          thread_id: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'forum_posts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      owned_space_for_change: {
        Args: { target_slug: string };
        Returns: {
          age_group: Database['public']['Enums']['space_age_group'];
          archived_at: string | null;
          banner: Database['public']['Enums']['space_banner'];
          banner_picture_id: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string;
          id: string;
          joining: Database['public']['Enums']['space_joining'];
          kind: Database['public']['Enums']['space_kind'];
          locks_at: string | null;
          name: string;
          name_key: string;
          posting: Database['public']['Enums']['space_posting'];
          readers: Database['public']['Enums']['space_readers'];
          rules: string;
          school_name: string | null;
          slug: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'spaces';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      page_ads: { Args: { context?: Json; page_key: string }; Returns: Json };
      paragraph_comment_counts: {
        Args: { chapter_code: string; story_slug: string };
        Returns: Json;
      };
      paragraph_comments: {
        Args: { block_number?: number; chapter_code: string; story_slug: string };
        Returns: Json;
      };
      paragraph_excerpt: { Args: { block_text: string }; Returns: string };
      paragraph_key_of: { Args: { block_text: string }; Returns: string };
      paragraph_now: { Args: { body: string; key: string; number: number }; Returns: number };
      parental_consent_agree: {
        Args: {
          page_language: string;
          request: Omit<
            Database['public']['Tables']['parental_consents']['Row'],
            Database['public']['Tables']['parental_consents']['ComputedFields']
          >;
        };
        Returns: undefined;
      };
      parental_consent_by_token: {
        Args: { raw_token: string };
        Returns: {
          created_at: string;
          decided_at: string | null;
          id: string;
          is_guardian_confirmed: boolean;
          language: string;
          parent_email: string;
          privacy_version_id: string | null;
          status: string;
          terms_version_id: string | null;
          token_hash: string;
          updated_at: string;
          user_id: string;
          withdrawn_at: string | null;
          withdrawn_by: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'parental_consents';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      parental_consent_deadline: { Args: { target_user_id: string }; Returns: string };
      parental_consent_is_signed: {
        Args: { payload: string; signature: string };
        Returns: boolean;
      };
      parental_consent_request: { Args: { token: string }; Returns: Json };
      picture_check_is_signed: { Args: { payload: string; signature: string }; Returns: boolean };
      picture_is_visible: { Args: { bucket: string; path: string }; Returns: boolean };
      picture_item_content: { Args: { picture_id: string }; Returns: Json };
      picture_needs_person: {
        Args: {
          picture: Omit<
            Database['public']['Tables']['picture_checks']['Row'],
            Database['public']['Tables']['picture_checks']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      picture_open_alert_recipients: { Args: Record<PropertyKey, never>; Returns: string[] };
      picture_reader_may_see: { Args: { bucket: string; path: string }; Returns: boolean };
      picture_review_case: {
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
      picture_state_json: {
        Args: {
          picture: Omit<
            Database['public']['Tables']['picture_checks']['Row'],
            Database['public']['Tables']['picture_checks']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      place_chapter_on_board: {
        Args: { act_id: string; chapter_code: string; chapter_codes: string[]; confirmed: boolean };
        Returns: Json;
      };
      plan_area_names: { Args: Record<PropertyKey, never>; Returns: string[] };
      plan_guard_json: { Args: { as_preview: boolean; show_from: string }; Returns: Json };
      plan_item_address: { Args: { target_item_id: string }; Returns: string };
      plan_item_area_is_public: { Args: { areas: string[]; item_kind: string }; Returns: boolean };
      plan_item_content: { Args: { target_item_id: string }; Returns: Json };
      plan_item_is_public: { Args: { target_item_id: string }; Returns: boolean };
      plan_item_row: {
        Args: { target_item_id: string };
        Returns: {
          item_is_private: boolean;
          item_kind: string;
          owner_user_id: string;
          story_id: string;
          title: string;
        }[];
      };
      plan_item_shows: {
        Args: { as_preview: boolean; item_id: string; item_is_private: boolean; show_from: string };
        Returns: boolean;
      };
      plan_story_readable: { Args: { target_story_id: string }; Returns: boolean };
      plan_text: { Args: { raw_text: string }; Returns: string };
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
      post_paragraph_comment: {
        Args: {
          block_number: number;
          body: string;
          chapter_code: string;
          is_spoiler?: boolean;
          story_slug: string;
        };
        Returns: Json;
      };
      preview_story_plan: { Args: { story_slug: string }; Returns: Json };
      profile_audience_of: {
        Args: {
          person: Omit<
            Database['public']['Tables']['profiles']['Row'],
            Database['public']['Tables']['profiles']['ComputedFields']
          >;
        };
        Returns: Database['public']['Enums']['profile_audience'];
      };
      profile_avatar_picture: { Args: { profile_handle: string }; Returns: Json };
      profile_avatar_recipe: { Args: { profile_handle: string }; Returns: Json };
      profile_for_handle: {
        Args: { wanted_handle: string };
        Returns: {
          adults_may_message: boolean;
          age_check_method: Database['public']['Enums']['age_check_method'] | null;
          age_check_result: Database['public']['Enums']['age_check_result'];
          age_checked_at: string | null;
          avatar_picture_id: string | null;
          avatar_recipe: Json | null;
          bio: string;
          birth_month: number | null;
          birth_year: number | null;
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
          last_active_at: string | null;
          library_visible_to: Database['public']['Enums']['library_audience'];
          locale: string;
          marketing_email_opt_in: boolean;
          messages_from: Database['public']['Enums']['message_audience'] | null;
          onboarded_at: string | null;
          pen_name: string | null;
          pen_name_changed_at: string | null;
          profile_visible_to: Database['public']['Enums']['profile_audience'] | null;
          region_code: string | null;
          shows_online_status: boolean;
          signature: string | null;
          signature_picture_id: string | null;
          teacher_badge_since: string | null;
          updated_at: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      profile_is_open_to: {
        Args: {
          owner: Omit<
            Database['public']['Tables']['profiles']['Row'],
            Database['public']['Tables']['profiles']['ComputedFields']
          >;
          viewer_id: string;
        };
        Returns: boolean;
      };
      profile_rank: { Args: { wanted_handle: string }; Returns: Json };
      profile_signature: { Args: { wanted_handle: string }; Returns: Json };
      profile_story_cards: { Args: { is_owner: boolean; writer_id: string }; Returns: Json };
      public_character_json: {
        Args: {
          as_preview: boolean;
          target_character: Omit<
            Database['public']['Tables']['story_characters']['Row'],
            Database['public']['Tables']['story_characters']['ComputedFields']
          >;
          with_sheet: boolean;
        };
        Returns: Json;
      };
      public_notice_payload_is_signed: {
        Args: { payload: string; signature: string };
        Returns: boolean;
      };
      public_plan_bible: {
        Args: { areas: string[]; as_preview: boolean; target_story_id: string };
        Returns: Json;
      };
      public_plan_characters: {
        Args: { areas: string[]; as_preview: boolean; target_story_id: string };
        Returns: Json;
      };
      public_plan_events: {
        Args: { areas: string[]; as_preview: boolean; target_story_id: string };
        Returns: Json;
      };
      public_plan_fields: {
        Args: { areas: string[]; as_preview: boolean; target_story_id: string };
        Returns: Json;
      };
      public_plan_json: { Args: { as_preview: boolean; target_story_id: string }; Returns: Json };
      public_plan_relationships: {
        Args: { areas: string[]; as_preview: boolean; target_story_id: string };
        Returns: Json;
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
      published_order: {
        Args: { chapter_codes: string[]; target_story_id: string };
        Returns: string[];
      };
      purge_abuse_image_evidence: { Args: Record<PropertyKey, never>; Returns: number };
      purge_class_certificate_names: { Args: Record<PropertyKey, never>; Returns: number };
      purge_closed_accounts: { Args: Record<PropertyKey, never>; Returns: number };
      purge_deleted_chapters: { Args: Record<PropertyKey, never>; Returns: number };
      purge_deleted_chats: { Args: Record<PropertyKey, never>; Returns: number };
      purge_deleted_comments: { Args: Record<PropertyKey, never>; Returns: number };
      purge_deleted_forum_posts: { Args: Record<PropertyKey, never>; Returns: number };
      purge_deleted_pictures: { Args: Record<PropertyKey, never>; Returns: number };
      purge_deleted_stories: { Args: Record<PropertyKey, never>; Returns: number };
      purge_expired_age_check_sessions: { Args: Record<PropertyKey, never>; Returns: number };
      purge_expired_exports: { Args: Record<PropertyKey, never>; Returns: number };
      purge_old_age_check_attempts: { Args: Record<PropertyKey, never>; Returns: number };
      purge_old_audit_log: { Args: Record<PropertyKey, never>; Returns: number };
      purge_old_client_errors: { Args: Record<PropertyKey, never>; Returns: number };
      purge_old_notifications: { Args: Record<PropertyKey, never>; Returns: number };
      purge_old_public_notices: { Args: Record<PropertyKey, never>; Returns: number };
      purge_old_reading_minutes: { Args: Record<PropertyKey, never>; Returns: number };
      purge_old_staff_records: { Args: Record<PropertyKey, never>; Returns: number };
      purge_old_support_tickets: { Args: Record<PropertyKey, never>; Returns: number };
      purge_rate_limit_events: { Args: Record<PropertyKey, never>; Returns: number };
      purge_sent_emails: { Args: Record<PropertyKey, never>; Returns: number };
      purge_unconfirmed_accounts: { Args: Record<PropertyKey, never>; Returns: number };
      purge_unfinished_social_sign_ups: { Args: Record<PropertyKey, never>; Returns: number };
      queue_daily_digests: { Args: Record<PropertyKey, never>; Returns: number };
      quote_card_state: { Args: { chapter_code: string; story_slug: string }; Returns: Json };
      raise_rating_for_picture: {
        Args: {
          new_rating: Database['public']['Enums']['story_rating'];
          picture: Omit<
            Database['public']['Tables']['picture_checks']['Row'],
            Database['public']['Tables']['picture_checks']['ComputedFields']
          >;
          reason_given: string;
        };
        Returns: undefined;
      };
      rank_for: {
        Args: { chapter_count: number; word_count: number };
        Returns: Database['public']['Enums']['writer_rank'];
      };
      rank_of: { Args: { person_id: string }; Returns: string };
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
      reader_reached_chapter: { Args: { target_chapter_id: string }; Returns: boolean };
      reader_visible_story: {
        Args: { story_slug: string };
        Returns: {
          ai_disclosure: Database['public']['Enums']['ai_disclosure'];
          ai_undisclosed_labelled_at: string | null;
          blurb: string;
          card_colour: string | null;
          category_id: string;
          class_only: boolean;
          class_space_id: string | null;
          classic_author_id: string | null;
          comments_enabled: boolean;
          completion_status: Database['public']['Enums']['completion_status'];
          content_note: string;
          cover_accent: string | null;
          cover_background: string | null;
          cover_design: string | null;
          cover_hidden_at: string | null;
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
          title_hidden_at: string | null;
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
      receive_support_email: { Args: { payload: string; signature: string }; Returns: Json };
      recently_banned_ip_matches: {
        Args: { new_user_id: string };
        Returns: {
          banned_user_id: string;
        }[];
      };
      record_abuse_image_evidence: {
        Args: {
          described_by: string;
          description_text: string;
          found_by: string;
          found_case: Omit<
            Database['public']['Tables']['cases']['Row'],
            Database['public']['Tables']['cases']['ComputedFields']
          >;
          picture: Omit<
            Database['public']['Tables']['picture_checks']['Row'],
            Database['public']['Tables']['picture_checks']['ComputedFields']
          >;
        };
        Returns: string;
      };
      record_age_check_result: {
        Args: {
          method: Database['public']['Enums']['age_check_method'];
          outcome: string;
          signature: string;
          yoti_session_id: string;
        };
        Returns: Json;
      };
      record_chapter_read: { Args: { chapter_code: string; story_slug: string }; Returns: boolean };
      record_chapter_share: {
        Args: { chapter_code: string; story_slug: string };
        Returns: boolean;
      };
      record_passage_share: {
        Args: { chapter_code: string; first_block: number; last_block: number; story_slug: string };
        Returns: boolean;
      };
      record_picture_check: {
        Args: { payload: string; signature: string };
        Returns: Database['public']['Enums']['picture_status'];
      };
      record_picture_opened: { Args: { picture_id: string; place: string }; Returns: undefined };
      record_retention_run: {
        Args: { removed_count: number; run_job_name: string };
        Returns: undefined;
      };
      record_sign_in_failure: { Args: { email_hash: string }; Returns: string };
      record_sign_up_consent: {
        Args: { accepted_version_id: string; document_slug: string; new_user_id: string };
        Returns: undefined;
      };
      record_sign_up_ips: { Args: { new_user_id: string; token: string }; Returns: undefined };
      record_support_event: {
        Args: {
          after_value: Json;
          before_value: Json;
          target_ticket_id: string;
          what_changed: string;
        };
        Returns: undefined;
      };
      refresh_writer_rank: { Args: { person_id: string }; Returns: undefined };
      register_atlas_picture: { Args: { target_path: string }; Returns: string };
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
      register_chapter_picture: { Args: { target_path: string }; Returns: string };
      register_landing_picture: { Args: { target_path: string }; Returns: string };
      register_picture: {
        Args: {
          picture_kind: Database['public']['Enums']['picture_kind'];
          target_bucket: string;
          target_path: string;
        };
        Returns: string;
      };
      register_signature_picture: { Args: { target_path: string }; Returns: string };
      register_space_banner: { Args: { target_path: string }; Returns: string };
      removal_order_log_rows: { Args: Record<PropertyKey, never>; Returns: Json[] };
      remove_character_picture: { Args: { character_id: string }; Returns: Json };
      remove_space_member: {
        Args: { handle: string; reason?: string; slug: string };
        Returns: undefined;
      };
      remove_unchanged_customisations: { Args: Record<PropertyKey, never>; Returns: number };
      removed_passage_marker: { Args: { language_code: string }; Returns: string };
      rename_bible_section: { Args: { section_id: string; section_name: string }; Returns: Json };
      rename_chapter: { Args: { chapter_code: string; title: string }; Returns: Json };
      renumber_story_chapters: { Args: { target_story_id: string }; Returns: undefined };
      replace_sent_teacher_link: { Args: { target_user_id: string }; Returns: undefined };
      reply_moderator_mail: { Args: { body: string; thread_reference: string }; Returns: boolean };
      reply_my_support_ticket: { Args: { body: string; ticket_number: number }; Returns: boolean };
      reply_to_forum_thread: {
        Args: { body: string; bump?: boolean; quoted_posts?: string[]; thread_number: number };
        Returns: Json;
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
      request_account_deletion: { Args: Record<PropertyKey, never>; Returns: Json };
      request_data_export: { Args: Record<PropertyKey, never>; Returns: Json };
      request_manual_age_check: { Args: Record<PropertyKey, never>; Returns: Json };
      request_stories_export: {
        Args: {
          chosen_chapter_ids?: string[];
          chosen_story_id?: string;
          document_format?: string;
          include_chapters?: boolean;
          include_data?: boolean;
          include_plan?: boolean;
        };
        Returns: Json;
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
      require_contest_staff: { Args: Record<PropertyKey, never>; Returns: undefined };
      require_forum_staff: { Args: Record<PropertyKey, never>; Returns: undefined };
      require_forum_writer: { Args: Record<PropertyKey, never>; Returns: string };
      require_live_profile: { Args: Record<PropertyKey, never>; Returns: string };
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
      require_messaging_caller: { Args: Record<PropertyKey, never>; Returns: string };
      require_not_last_owner: {
        Args: { removed_role: Database['public']['Enums']['staff_role']; target_user_id: string };
        Returns: undefined;
      };
      require_picture_reviewer: { Args: Record<PropertyKey, never>; Returns: undefined };
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
      require_space_starter: { Args: Record<PropertyKey, never>; Returns: string };
      require_support_ticket_for_staff: {
        Args: { ticket_number: number };
        Returns: {
          assigned_to_user_id: string | null;
          category: Database['public']['Enums']['support_ticket_category'];
          channel: Database['public']['Enums']['support_ticket_channel'];
          closed_at: string | null;
          created_at: string;
          first_replied_at: string | null;
          follow_up_of_ticket_id: string | null;
          id: string;
          is_spam: boolean;
          language: string;
          last_message_at: string;
          marked_spam_at: string | null;
          merged_into_ticket_id: string | null;
          number: number;
          priority: Database['public']['Enums']['support_ticket_priority'];
          requester_email: string | null;
          requester_user_id: string | null;
          solved_at: string | null;
          status: Database['public']['Enums']['support_ticket_status'];
          subject: string;
          tags: string[];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'support_tickets';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      require_tag_staff: { Args: Record<PropertyKey, never>; Returns: undefined };
      require_teacher_checks_access: { Args: Record<PropertyKey, never>; Returns: undefined };
      require_website_staff: { Args: Record<PropertyKey, never>; Returns: undefined };
      restore_chapter: { Args: { chapter_code: string }; Returns: Json };
      restore_my_story: { Args: { story_slug: string }; Returns: Json };
      return_rate_on: { Args: { for_day: string }; Returns: number };
      reusable_stories_export: {
        Args: {
          current_fingerprint: string;
          owner_id: string;
          wanted: Omit<
            Database['public']['Tables']['exports']['Row'],
            Database['public']['Tables']['exports']['ComputedFields']
          >;
        };
        Returns: {
          chapter_ids: string[] | null;
          content_fingerprint: string | null;
          created_at: string;
          data_request_id: string | null;
          display_name: string | null;
          document_format: string;
          expires_at: string | null;
          file_name: string;
          file_size: number | null;
          id: string;
          include_chapters: boolean;
          include_data: boolean;
          include_plan: boolean;
          kind: Database['public']['Enums']['export_kind'];
          ready_at: string | null;
          state: Database['public']['Enums']['export_state'];
          story_count: number | null;
          story_id: string | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'exports';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      romania_today: { Args: Record<PropertyKey, never>; Returns: string };
      run_daily_metrics: { Args: Record<PropertyKey, never>; Returns: number };
      run_email_worker: { Args: Record<PropertyKey, never>; Returns: boolean };
      run_notification_jobs: { Args: Record<PropertyKey, never>; Returns: number };
      run_retention_jobs: { Args: Record<PropertyKey, never>; Returns: number };
      run_storage_sweep: { Args: Record<PropertyKey, never>; Returns: boolean };
      run_support_email_worker: { Args: Record<PropertyKey, never>; Returns: boolean };
      safeguarding_evidence_target: {
        Args: { evidence_id: string };
        Returns: {
          case_id: string | null;
          case_reference: string;
          created_at: string;
          described_by_user_id: string | null;
          description: string;
          file_sha256: string | null;
          id: string;
          keep_until: string;
          legal_hold: boolean;
          legal_hold_reason: string | null;
          picture_id: string | null;
          picture_kind: Database['public']['Enums']['picture_kind'];
          reported_at: string;
          source: string;
          updated_at: string;
          uploaded_at: string;
          uploader_ip_period: string | null;
          uploader_ip_scrambled: string | null;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'abuse_image_evidence';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
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
      save_my_preferences: {
        Args: { read_categories: string[]; topic_tag_ids: string[]; write_categories: string[] };
        Returns: undefined;
      };
      save_my_region: { Args: { wanted_region?: string }; Returns: undefined };
      save_reading_habit: {
        Args: {
          device_time_zone: string;
          wanted_reminder_time: string;
          wanted_reminders_on: boolean;
          wanted_target: number;
        };
        Returns: undefined;
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
          wanted_night_by_clock?: boolean;
          wanted_night_from?: string;
          wanted_night_until?: string;
          wanted_reading_ruler?: boolean;
          wanted_text_size: number;
          wanted_theme: Database['public']['Enums']['reading_theme'];
        };
        Returns: undefined;
      };
      schedule_chapter: { Args: { chapter_code: string; publish_at: string }; Returns: Json };
      scrub_error_text: { Args: { max_length: number; raw_text: string }; Returns: string };
      scrub_route_path: { Args: { raw_path: string }; Returns: string };
      search_fold: { Args: { raw_text: string }; Returns: string };
      search_forum_posts: {
        Args: {
          author_handle?: string;
          forum_slug?: string;
          language_code?: string;
          skip?: number;
          term: string;
        };
        Returns: Json;
      };
      search_like_pattern: { Args: { term: string }; Returns: string };
      search_query: { Args: { term: string }; Returns: unknown };
      search_story: { Args: { query: string; story_slug: string }; Returns: Json };
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
      send_finished_thanks: { Args: { story_slug: string }; Returns: Json };
      send_landing_reminders: { Args: Record<PropertyKey, never>; Returns: number };
      send_message: { Args: { body: string; recipient_handle: string }; Returns: Json };
      send_moderator_mail: {
        Args: { body: string; statement_reference?: string; subject: string };
        Returns: Json;
      };
      send_reading_reminders: { Args: Record<PropertyKey, never>; Returns: number };
      set_adults_may_message: { Args: { allowed: boolean }; Returns: undefined };
      set_block: { Args: { should_block: boolean; target_handle: string }; Returns: Json };
      set_certificate_printed_name: {
        Args: { certificate_id: string; printed_name: string };
        Returns: Json;
      };
      set_chapter_character_present: {
        Args: { chapter_code: string; character_id: string; is_present: boolean };
        Returns: Json;
      };
      set_chapter_order: { Args: { chapter_codes: string[]; story_slug: string }; Returns: Json };
      set_character_picture: {
        Args: { character_id: string; new_picture_id: string };
        Returns: Json;
      };
      set_character_public_parts: {
        Args: { character_id: string; parts: string[] };
        Returns: Json;
      };
      set_class_lock: { Args: { new_locks_at?: string; slug: string }; Returns: Json };
      set_landing_reminder: { Args: { page_slug: string; wanted: boolean }; Returns: Json };
      set_library_audience: {
        Args: { audience: Database['public']['Enums']['library_audience'] };
        Returns: undefined;
      };
      set_library_shelf: {
        Args: { story_slug: string; wanted_shelf: Database['public']['Enums']['library_shelf'] };
        Returns: Json;
      };
      set_marketing_email_opt_in: { Args: { wanted: boolean }; Returns: undefined };
      set_message_audience: {
        Args: { audience: Database['public']['Enums']['message_audience'] };
        Returns: undefined;
      };
      set_my_avatar_recipe: { Args: { recipe: Json }; Returns: Json };
      set_my_bio: { Args: { new_bio: string }; Returns: string };
      set_my_birthday: { Args: { wanted_day?: number; wanted_month?: number }; Returns: Json };
      set_my_handle: { Args: { new_handle: string }; Returns: string };
      set_my_locale: { Args: { new_locale: string }; Returns: string };
      set_my_pen_name: { Args: { new_pen_name: string }; Returns: string };
      set_my_signature: { Args: { picture_id?: string; signature_text: string }; Returns: Json };
      set_notification_email: {
        Args: {
          delivery: Database['public']['Enums']['email_delivery'];
          kind: Database['public']['Enums']['notification_kind'];
        };
        Returns: undefined;
      };
      set_plan_item_privacy: { Args: { item_id: string; keep_private: boolean }; Returns: Json };
      set_plan_item_show_from: { Args: { chapter_code: string; item_id: string }; Returns: Json };
      set_profile_audience: {
        Args: { audience: Database['public']['Enums']['profile_audience'] };
        Returns: undefined;
      };
      set_rank_badge_tags: { Args: { story_slug: string; tag_names: string[] }; Returns: Json };
      set_shows_online_status: { Args: { should_show: boolean }; Returns: undefined };
      set_space_banner_picture: { Args: { picture_id?: string; slug: string }; Returns: Json };
      set_space_moderator: {
        Args: {
          handle: string;
          powers: Database['public']['Enums']['space_power'][];
          slug: string;
        };
        Returns: Json;
      };
      set_story_class: { Args: { class_slug?: string; story_slug: string }; Returns: Json };
      set_story_public_areas: { Args: { areas: string[]; story_slug: string }; Returns: Json };
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
      sign_up_rule_of: { Args: { message: string }; Returns: string };
      sign_ups_by_age_group: { Args: Record<PropertyKey, never>; Returns: Json };
      signature_json: { Args: { person_id: string }; Returns: Json };
      signature_picture_file_may_go: { Args: { object_name: string }; Returns: boolean };
      signed_up_reader_count: { Args: { for_day: string }; Returns: number };
      space_acts_as_platform: {
        Args: {
          target: Omit<
            Database['public']['Tables']['spaces']['Row'],
            Database['public']['Tables']['spaces']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      space_age_group_of_caller: {
        Args: Record<PropertyKey, never>;
        Returns: Database['public']['Enums']['space_age_group'];
      };
      space_age_group_of_person: {
        Args: { person_id: string };
        Returns: Database['public']['Enums']['space_age_group'];
      };
      space_banner_change_request: { Args: { slug: string }; Returns: Json };
      space_banner_file_may_go: { Args: { object_name: string }; Returns: boolean };
      space_banner_upload_allowed: { Args: { object_name: string }; Returns: boolean };
      space_card_visible: {
        Args: {
          target: Omit<
            Database['public']['Tables']['spaces']['Row'],
            Database['public']['Tables']['spaces']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      space_for_power: {
        Args: { target_slug: string; wanted: Database['public']['Enums']['space_power'] };
        Returns: {
          age_group: Database['public']['Enums']['space_age_group'];
          archived_at: string | null;
          banner: Database['public']['Enums']['space_banner'];
          banner_picture_id: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string;
          id: string;
          joining: Database['public']['Enums']['space_joining'];
          kind: Database['public']['Enums']['space_kind'];
          locks_at: string | null;
          name: string;
          name_key: string;
          posting: Database['public']['Enums']['space_posting'];
          readers: Database['public']['Enums']['space_readers'];
          rules: string;
          school_name: string | null;
          slug: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'spaces';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      space_forum_id: { Args: { target_space_id: string }; Returns: string };
      space_is_in_class: {
        Args: {
          target: Omit<
            Database['public']['Tables']['spaces']['Row'],
            Database['public']['Tables']['spaces']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      space_is_locked: {
        Args: {
          target: Omit<
            Database['public']['Tables']['spaces']['Row'],
            Database['public']['Tables']['spaces']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      space_is_member: { Args: { target_space_id: string }; Returns: boolean };
      space_join_requests: { Args: { slug: string }; Returns: Json };
      space_json: {
        Args: {
          target: Omit<
            Database['public']['Tables']['spaces']['Row'],
            Database['public']['Tables']['spaces']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      space_latest_activity: {
        Args: {
          target: Omit<
            Database['public']['Tables']['spaces']['Row'],
            Database['public']['Tables']['spaces']['ComputedFields']
          >;
        };
        Returns: string;
      };
      space_list: { Args: { how_many?: number; skip?: number }; Returns: Json };
      space_log: { Args: { skip?: number; slug: string }; Returns: Json };
      space_may_act: {
        Args: {
          target: Omit<
            Database['public']['Tables']['spaces']['Row'],
            Database['public']['Tables']['spaces']['ComputedFields']
          >;
          wanted: Database['public']['Enums']['space_power'];
        };
        Returns: boolean;
      };
      space_may_join: {
        Args: {
          target: Omit<
            Database['public']['Tables']['spaces']['Row'],
            Database['public']['Tables']['spaces']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      space_may_post: {
        Args: {
          target: Omit<
            Database['public']['Tables']['spaces']['Row'],
            Database['public']['Tables']['spaces']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      space_may_read: {
        Args: {
          target: Omit<
            Database['public']['Tables']['spaces']['Row'],
            Database['public']['Tables']['spaces']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      space_member_by_handle: {
        Args: { handle: string; target_space_id: string };
        Returns: {
          created_at: string;
          id: string;
          joined_at: string | null;
          powers: Database['public']['Enums']['space_power'][];
          requested_at: string;
          role: Database['public']['Enums']['space_member_role'];
          space_id: string;
          status: Database['public']['Enums']['space_member_status'];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'space_members';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      space_member_list: { Args: { slug: string }; Returns: Json };
      space_membership_of_caller: {
        Args: { target_space_id: string };
        Returns: {
          created_at: string;
          id: string;
          joined_at: string | null;
          powers: Database['public']['Enums']['space_power'][];
          requested_at: string;
          role: Database['public']['Enums']['space_member_role'];
          space_id: string;
          status: Database['public']['Enums']['space_member_status'];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'space_members';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      space_moderators: { Args: { slug: string }; Returns: Json };
      space_name_available: { Args: { name: string }; Returns: Json };
      space_name_key: { Args: { name: string }; Returns: string };
      space_of_forum: {
        Args: { target_forum_id: string };
        Returns: {
          age_group: Database['public']['Enums']['space_age_group'];
          archived_at: string | null;
          banner: Database['public']['Enums']['space_banner'];
          banner_picture_id: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string;
          id: string;
          joining: Database['public']['Enums']['space_joining'];
          kind: Database['public']['Enums']['space_kind'];
          locks_at: string | null;
          name: string;
          name_key: string;
          posting: Database['public']['Enums']['space_posting'];
          readers: Database['public']['Enums']['space_readers'];
          rules: string;
          school_name: string | null;
          slug: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'spaces';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      space_page: { Args: { slug: string }; Returns: Json };
      space_powers_of_caller: {
        Args: {
          target: Omit<
            Database['public']['Tables']['spaces']['Row'],
            Database['public']['Tables']['spaces']['ComputedFields']
          >;
        };
        Returns: Database['public']['Enums']['space_power'][];
      };
      space_slug_for: { Args: { name: string }; Returns: string };
      space_viewer_json: {
        Args: {
          target: Omit<
            Database['public']['Tables']['spaces']['Row'],
            Database['public']['Tables']['spaces']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      staff_may: { Args: { target_area: string; wanted_access?: string }; Returns: boolean };
      staff_session_started_at: { Args: Record<PropertyKey, never>; Returns: string };
      staff_signed_in_recently: { Args: Record<PropertyKey, never>; Returns: boolean };
      start_conversation: {
        Args: { recipient_id: string; sender_id: string };
        Returns: {
          accepted_at: string | null;
          created_at: string;
          id: string;
          last_message_at: string;
          recipient_user_id: string;
          status: Database['public']['Enums']['conversation_status'];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'conversations';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      start_email_support_ticket: {
        Args: {
          body: string;
          email_message_id: string;
          follow_up_of: string;
          is_automatic: boolean;
          sender: string;
          subject: string;
        };
        Returns: Json;
      };
      start_forum_thread: {
        Args: { body: string; forum_slug: string; title: string };
        Returns: Json;
      };
      start_reading_habit: { Args: { device_time_zone: string }; Returns: undefined };
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
      stop_reading_habit: { Args: Record<PropertyKey, never>; Returns: undefined };
      storage_files_to_sweep: {
        Args: { max_files?: number };
        Returns: {
          bucket_id: string;
          name: string;
        }[];
      };
      stories_export_choice_problem: {
        Args: {
          anything_chosen: boolean;
          chosen_chapter_ids: string[];
          chosen_story_id: string;
          owner_id: string;
        };
        Returns: string;
      };
      stories_fingerprint: { Args: { chosen_story_id: string; owner_id: string }; Returns: string };
      story_as_shown: {
        Args: {
          target: Omit<
            Database['public']['Tables']['stories']['Row'],
            Database['public']['Tables']['stories']['ComputedFields']
          >;
        };
        Returns: {
          ai_disclosure: Database['public']['Enums']['ai_disclosure'];
          ai_undisclosed_labelled_at: string | null;
          blurb: string;
          card_colour: string | null;
          category_id: string;
          class_only: boolean;
          class_space_id: string | null;
          classic_author_id: string | null;
          comments_enabled: boolean;
          completion_status: Database['public']['Enums']['completion_status'];
          content_note: string;
          cover_accent: string | null;
          cover_background: string | null;
          cover_design: string | null;
          cover_hidden_at: string | null;
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
          title_hidden_at: string | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: 'stories';
          to: 'stories';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      story_bible: { Args: { story_slug: string }; Returns: Json };
      story_card_json: { Args: { target_story_id: string }; Returns: Json };
      story_cast: { Args: { story_slug: string }; Returns: Json };
      story_chapter_progress: { Args: { story_slug: string }; Returns: Json };
      story_class_allows: {
        Args: { is_class_only: boolean; target_space_id: string; writer_id: string };
        Returns: boolean;
      };
      story_class_share: { Args: { story_slug: string }; Returns: Json };
      story_classic_author: { Args: { target_story_id: string }; Returns: Json };
      story_comment_total: { Args: { target_story_id: string }; Returns: number };
      story_cover_picture: { Args: { story_slug: string }; Returns: Json };
      story_follow_state: { Args: { story_slug: string }; Returns: Json };
      story_follower_count_of: { Args: { target_story_id: string }; Returns: number };
      story_has_copied_work_note: { Args: { target_story_id: string }; Returns: boolean };
      story_has_readable_chapter: { Args: { target_story_id: string }; Returns: boolean };
      story_ideas: { Args: { story_slug: string }; Returns: Json };
      story_language_choices: {
        Args: Record<PropertyKey, never>;
        Returns: {
          code: string;
          is_open: boolean;
        }[];
      };
      story_library_state: { Args: { story_slug: string }; Returns: Json };
      story_like_total: { Args: { target_story_id: string }; Returns: number };
      story_link_targets: { Args: { story_slug: string }; Returns: Json };
      story_marketing: { Args: { story_slug: string }; Returns: Json };
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
      story_plan: { Args: { story_slug: string }; Returns: Json };
      story_plan_chapters: { Args: { plan_story_id: string }; Returns: Json };
      story_plan_visibility: { Args: { story_slug: string }; Returns: Json };
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
      story_search_texts: {
        Args: { target_story_id: string };
        Returns: {
          chapter: string;
          haystack: string;
          kind: string;
          ref: string;
          title: string;
        }[];
      };
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
      story_shares_this_week: { Args: { target_story_id: string }; Returns: number };
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
      story_storyline: { Args: { story_slug: string }; Returns: Json };
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
      storyline_chapters_json: { Args: { target_story_id: string }; Returns: Json };
      strip_combining_marks: { Args: { name: string }; Returns: string };
      submit_appeal: { Args: { explanation: string; statement_reference: string }; Returns: Json };
      submit_contact_ticket: { Args: { payload: string; signature: string }; Returns: number };
      submit_public_notice: {
        Args: { payload: string; signature: string };
        Returns: {
          notice_reference: string;
          received_at: string;
        }[];
      };
      submit_teacher_proof: { Args: { proof_path: string }; Returns: Json };
      support_assignee_id: { Args: { assignee_handle: string }; Returns: string };
      support_email_json: {
        Args: {
          address: string;
          queued: Omit<
            Database['public']['Tables']['support_ticket_emails']['Row'],
            Database['public']['Tables']['support_ticket_emails']['ComputedFields']
          >;
          ticket: Omit<
            Database['public']['Tables']['support_tickets']['Row'],
            Database['public']['Tables']['support_tickets']['ComputedFields']
          >;
        };
        Returns: Json;
      };
      support_email_worker_claim: {
        Args: { batch_size?: number; worker_key: string };
        Returns: Json;
      };
      support_email_worker_mark_sent: {
        Args: { email_ids: string[]; worker_key: string };
        Returns: number;
      };
      support_first_reply_due: { Args: { arrived_at: string }; Returns: string };
      support_message_email_state: { Args: { message_id: string }; Returns: string };
      support_payload_is_signed: { Args: { payload: string; signature: string }; Returns: boolean };
      support_sender_is_spam: {
        Args: { sender: string; sender_account: string };
        Returns: boolean;
      };
      support_ticket_address: {
        Args: {
          ticket: Omit<
            Database['public']['Tables']['support_tickets']['Row'],
            Database['public']['Tables']['support_tickets']['ComputedFields']
          >;
        };
        Returns: string;
      };
      support_ticket_for_email: {
        Args: { email_sender: string; email_subject: string; thread_headers: string };
        Returns: {
          assigned_to_user_id: string | null;
          category: Database['public']['Enums']['support_ticket_category'];
          channel: Database['public']['Enums']['support_ticket_channel'];
          closed_at: string | null;
          created_at: string;
          first_replied_at: string | null;
          follow_up_of_ticket_id: string | null;
          id: string;
          is_spam: boolean;
          language: string;
          last_message_at: string;
          marked_spam_at: string | null;
          merged_into_ticket_id: string | null;
          number: number;
          priority: Database['public']['Enums']['support_ticket_priority'];
          requester_email: string | null;
          requester_user_id: string | null;
          solved_at: string | null;
          status: Database['public']['Enums']['support_ticket_status'];
          subject: string;
          tags: string[];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'support_tickets';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      support_ticket_history: { Args: { target_ticket_id: string }; Returns: Json };
      tag_for_name: {
        Args: { include_waiting?: boolean; preferred_language?: string; typed_name: string };
        Returns: string;
      };
      tag_name_problems: { Args: { names: Json; target_tag_id: string }; Returns: string[] };
      take_rate_limit: { Args: { action: string }; Returns: undefined };
      teacher_check_can_ask: {
        Args: {
          person: Omit<
            Database['public']['Tables']['profiles']['Row'],
            Database['public']['Tables']['profiles']['ComputedFields']
          >;
        };
        Returns: boolean;
      };
      teacher_check_is_signed: { Args: { payload: string; signature: string }; Returns: boolean };
      teacher_proof_upload_allowed: { Args: { object_name: string }; Returns: boolean };
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
      unfinished_social_account: { Args: { target_user_id: string }; Returns: boolean };
      unpublish_chapter: { Args: { chapter_code: string }; Returns: Json };
      unread_message_count: { Args: Record<PropertyKey, never>; Returns: number };
      unsubscribe_from_emails: { Args: { unsubscribe_key: string }; Returns: boolean };
      update_bible_entry: { Args: { changes: Json; entry_id: string }; Returns: Json };
      update_chapter_plan: { Args: { changes: Json; chapter_code: string }; Returns: Json };
      update_chapter_scene: { Args: { changes: Json; scene_id: string }; Returns: Json };
      update_character_field: { Args: { changes: Json; field_id: string }; Returns: Json };
      update_my_story: { Args: { changes: Json; story_slug: string }; Returns: Json };
      update_published_chapter: { Args: { chapter_code: string }; Returns: Json };
      update_space: {
        Args: {
          banner?: Database['public']['Enums']['space_banner'];
          description: string;
          joining?: Database['public']['Enums']['space_joining'];
          name: string;
          posting?: Database['public']['Enums']['space_posting'];
          readers?: Database['public']['Enums']['space_readers'];
          rules?: string;
          slug: string;
        };
        Returns: Json;
      };
      update_story_character: { Args: { changes: Json; character_id: string }; Returns: Json };
      update_story_event: { Args: { changes: Json; event_id: string }; Returns: Json };
      update_story_idea: { Args: { changes: Json; idea_id: string }; Returns: Json };
      update_story_marketing: { Args: { changes: Json; story_slug: string }; Returns: Json };
      update_story_plan: { Args: { changes: Json; story_slug: string }; Returns: Json };
      use_platform_invite: { Args: { code: string; new_user_id: string }; Returns: undefined };
      username_skeleton: { Args: { name: string }; Returns: string };
      verified_signup_country: { Args: { token: string }; Returns: string };
      verified_signup_ips: {
        Args: { token: string };
        Returns: {
          ip_period: string;
          ip_scrambled: string;
        }[];
      };
      verify_certificate: { Args: { code: string }; Returns: Json };
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
      who_is_online: { Args: { wanted_handles: string[] }; Returns: string[] };
      with_comma_below: { Args: { value: string }; Returns: string };
      withdraw_contest_entry: { Args: { target_contest_id: string }; Returns: undefined };
      word_total: { Args: { any_text: string }; Returns: number };
      working_days_after: { Args: { day_count: number; start_moment: string }; Returns: string };
      write_class_certificate: {
        Args: {
          clean_programme: string;
          space: Omit<
            Database['public']['Tables']['spaces']['Row'],
            Database['public']['Tables']['spaces']['ComputedFields']
          >;
          student_id: string;
          teacher_display: string;
          wanted_result: Database['public']['Enums']['certificate_result'];
        };
        Returns: string;
      };
      write_contest_certificate: {
        Args: {
          contest: Omit<
            Database['public']['Tables']['contests']['Row'],
            Database['public']['Tables']['contests']['ComputedFields']
          >;
          entry: Omit<
            Database['public']['Tables']['contest_entries']['Row'],
            Database['public']['Tables']['contest_entries']['ComputedFields']
          >;
        };
        Returns: string;
      };
      write_forum_names: { Args: { names: Json; target_forum_id: string }; Returns: undefined };
      write_space_forum_names: {
        Args: { name: string; target_space_id: string };
        Returns: undefined;
      };
      writer_chapter_insights: {
        Args: { chapter_code: string; story_slug: string };
        Returns: Json;
      };
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
      writer_loved_lines: { Args: { target_chapter_id: string; writer_id: string }; Returns: Json };
      writer_reader_stops: {
        Args: { target_chapter_id: string; writer_id: string };
        Returns: Json;
      };
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
      ad_format: 'wide' | 'portrait' | 'side_box' | 'list_card';
      ad_label: 'sponsored' | 'ad' | 'house';
      age_band: 'under_13' | '13_to_15' | '16_to_17' | '18_plus' | 'unknown';
      age_check_method: 'facial_estimation' | 'id_document' | 'manual';
      age_check_result: 'pending' | '13_or_over' | '18_or_over' | 'failed';
      ai_disclosure: 'no_ai' | 'ai_brainstorming' | 'partly_ai_written';
      appeal_status: 'open' | 'upheld' | 'overturned';
      audit_actor: 'person' | 'system';
      case_source:
        | 'report'
        | 'authority_order'
        | 'picture_check'
        | 'downvotes'
        | 'picture_review'
        | 'returning_user';
      case_status: 'open' | 'decided';
      case_tier: 'one_hour' | 'same_day' | 'two_days' | 'seven_days';
      certificate_result: 'participant' | 'finalist' | 'winner';
      chapter_status: 'draft' | 'scheduled' | 'published';
      classic_kind: 'novel' | 'short_story' | 'fairy_tale' | 'poem' | 'play' | 'essay';
      comment_deleted_by: 'author' | 'writer';
      completion_status: 'ongoing' | 'completed';
      compliance_entry_kind: 'authority_order' | 'legal_request' | 'launch_notice';
      conversation_status: 'request' | 'accepted' | 'declined';
      cover_kind: 'automatic' | 'drawn' | 'upload';
      data_request_channel: 'in_app' | 'email' | 'post';
      data_request_identity: 'not_needed' | 'not_asked' | 'asked' | 'confirmed' | 'denied';
      data_request_state: 'open' | 'closed';
      data_request_type: 'copy' | 'move' | 'correct' | 'delete' | 'other';
      email_delivery: 'instant' | 'daily' | 'off';
      embed_service: 'youtube' | 'vimeo' | 'loom' | 'spotify' | 'apple_music';
      export_kind: 'all_my_data' | 'my_stories' | 'data_request';
      export_state: 'building' | 'ready';
      forum_accent: 'plum' | 'sky' | 'blush' | 'sage' | 'gold';
      language_status: 'open' | 'ready' | 'closed';
      legal_check_status: 'not_started' | 'in_progress' | 'done';
      library_audience: 'only_me' | 'people_i_follow' | 'everyone';
      library_shelf: 'reading' | 'saved' | 'finished';
      market_status: 'open' | 'ready' | 'closed';
      message_audience: 'everyone' | 'people_i_follow' | 'nobody';
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
        | 'tag_rejected'
        | 'age_check_decided'
        | 'age_check_18_invite'
        | 'parental_consent_agreed'
        | 'parental_consent_withdrawn'
        | 'login_method_added'
        | 'login_method_removed'
        | 'teacher_check_decided'
        | 'teacher_badge_removed'
        | 'data_export_ready'
        | 'stories_export_ready'
        | 'reading_reminder'
        | 'story_finished'
        | 'space_join_request'
        | 'space_join_approved'
        | 'customisation_change_requested'
        | 'certificate_issued'
        | 'class_archived'
        | 'story_changed_by_staff'
        | 'data_request_confirm'
        | 'data_request_extended'
        | 'data_request_copy_ready'
        | 'picture_opened_by_staff'
        | 'landing_entries_open';
      picture_kind:
        | 'cover'
        | 'avatar'
        | 'chapter_picture'
        | 'drawing'
        | 'quote_card'
        | 'space_banner'
        | 'atlas_image'
        | 'signature_picture'
        | 'landing_picture';
      picture_status: 'pending' | 'passed' | 'held' | 'approved' | 'removed';
      profile_audience: 'everyone' | 'members' | 'people_i_follow';
      reaction_kind: 'heart' | 'fire' | 'laugh' | 'wow' | 'sad' | 'star';
      reading_font: 'sans' | 'serif' | 'dyslexia_friendly' | 'atkinson_hyperlegible';
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
      reportable_type:
        | 'profile'
        | 'story'
        | 'chapter'
        | 'comment'
        | 'picture'
        | 'embed'
        | 'atlas_item'
        | 'message'
        | 'forum_thread'
        | 'forum_post'
        | 'space';
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
      space_age_group: 'under_16' | '16_plus';
      space_banner: 'plum' | 'night' | 'forest' | 'gold';
      space_joining: 'approve' | 'open';
      space_kind: 'open' | 'class';
      space_member_role: 'owner' | 'member' | 'moderator';
      space_member_status: 'pending' | 'active';
      space_posting: 'anyone' | 'members';
      space_power: 'posts' | 'members' | 'settings' | 'mail';
      space_readers: 'members' | 'everybody';
      staff_permission: 'safeguarding' | 'teacher_checks' | 'on_call' | 'picture_review';
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
        | 'ai_label_added'
        | 'title_hidden'
        | 'cover_hidden'
        | 'contest_disqualified';
      statement_ground: 'terms' | 'law';
      story_rating: 'all_ages' | '13_plus' | '16_plus' | '18_plus';
      support_message_kind: 'from_requester' | 'staff_reply' | 'internal_note';
      support_ticket_category:
        | 'account'
        | 'writing'
        | 'reading'
        | 'safety_question'
        | 'school_or_university'
        | 'bug'
        | 'other';
      support_ticket_channel: 'email' | 'contact_form' | 'in_app';
      support_ticket_priority: 'low' | 'normal' | 'high' | 'urgent';
      support_ticket_status: 'new' | 'open' | 'pending_on_user' | 'on_hold' | 'solved' | 'closed';
      tag_status: 'waiting' | 'approved' | 'rejected';
      writer_rank: 'new_writer' | 'writer' | 'storyteller' | 'novelist';
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
      ad_format: ['wide', 'portrait', 'side_box', 'list_card'],
      ad_label: ['sponsored', 'ad', 'house'],
      age_band: ['under_13', '13_to_15', '16_to_17', '18_plus', 'unknown'],
      age_check_method: ['facial_estimation', 'id_document', 'manual'],
      age_check_result: ['pending', '13_or_over', '18_or_over', 'failed'],
      ai_disclosure: ['no_ai', 'ai_brainstorming', 'partly_ai_written'],
      appeal_status: ['open', 'upheld', 'overturned'],
      audit_actor: ['person', 'system'],
      case_source: [
        'report',
        'authority_order',
        'picture_check',
        'downvotes',
        'picture_review',
        'returning_user',
      ],
      case_status: ['open', 'decided'],
      case_tier: ['one_hour', 'same_day', 'two_days', 'seven_days'],
      certificate_result: ['participant', 'finalist', 'winner'],
      chapter_status: ['draft', 'scheduled', 'published'],
      classic_kind: ['novel', 'short_story', 'fairy_tale', 'poem', 'play', 'essay'],
      comment_deleted_by: ['author', 'writer'],
      completion_status: ['ongoing', 'completed'],
      compliance_entry_kind: ['authority_order', 'legal_request', 'launch_notice'],
      conversation_status: ['request', 'accepted', 'declined'],
      cover_kind: ['automatic', 'drawn', 'upload'],
      data_request_channel: ['in_app', 'email', 'post'],
      data_request_identity: ['not_needed', 'not_asked', 'asked', 'confirmed', 'denied'],
      data_request_state: ['open', 'closed'],
      data_request_type: ['copy', 'move', 'correct', 'delete', 'other'],
      email_delivery: ['instant', 'daily', 'off'],
      embed_service: ['youtube', 'vimeo', 'loom', 'spotify', 'apple_music'],
      export_kind: ['all_my_data', 'my_stories', 'data_request'],
      export_state: ['building', 'ready'],
      forum_accent: ['plum', 'sky', 'blush', 'sage', 'gold'],
      language_status: ['open', 'ready', 'closed'],
      legal_check_status: ['not_started', 'in_progress', 'done'],
      library_audience: ['only_me', 'people_i_follow', 'everyone'],
      library_shelf: ['reading', 'saved', 'finished'],
      market_status: ['open', 'ready', 'closed'],
      message_audience: ['everyone', 'people_i_follow', 'nobody'],
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
        'age_check_decided',
        'age_check_18_invite',
        'parental_consent_agreed',
        'parental_consent_withdrawn',
        'login_method_added',
        'login_method_removed',
        'teacher_check_decided',
        'teacher_badge_removed',
        'data_export_ready',
        'stories_export_ready',
        'reading_reminder',
        'story_finished',
        'space_join_request',
        'space_join_approved',
        'customisation_change_requested',
        'certificate_issued',
        'class_archived',
        'story_changed_by_staff',
        'data_request_confirm',
        'data_request_extended',
        'data_request_copy_ready',
        'picture_opened_by_staff',
        'landing_entries_open',
      ],
      picture_kind: [
        'cover',
        'avatar',
        'chapter_picture',
        'drawing',
        'quote_card',
        'space_banner',
        'atlas_image',
        'signature_picture',
        'landing_picture',
      ],
      picture_status: ['pending', 'passed', 'held', 'approved', 'removed'],
      profile_audience: ['everyone', 'members', 'people_i_follow'],
      reaction_kind: ['heart', 'fire', 'laugh', 'wow', 'sad', 'star'],
      reading_font: ['sans', 'serif', 'dyslexia_friendly', 'atkinson_hyperlegible'],
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
      reportable_type: [
        'profile',
        'story',
        'chapter',
        'comment',
        'picture',
        'embed',
        'atlas_item',
        'message',
        'forum_thread',
        'forum_post',
        'space',
      ],
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
      space_age_group: ['under_16', '16_plus'],
      space_banner: ['plum', 'night', 'forest', 'gold'],
      space_joining: ['approve', 'open'],
      space_kind: ['open', 'class'],
      space_member_role: ['owner', 'member', 'moderator'],
      space_member_status: ['pending', 'active'],
      space_posting: ['anyone', 'members'],
      space_power: ['posts', 'members', 'settings', 'mail'],
      space_readers: ['members', 'everybody'],
      staff_permission: ['safeguarding', 'teacher_checks', 'on_call', 'picture_review'],
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
        'title_hidden',
        'cover_hidden',
        'contest_disqualified',
      ],
      statement_ground: ['terms', 'law'],
      story_rating: ['all_ages', '13_plus', '16_plus', '18_plus'],
      support_message_kind: ['from_requester', 'staff_reply', 'internal_note'],
      support_ticket_category: [
        'account',
        'writing',
        'reading',
        'safety_question',
        'school_or_university',
        'bug',
        'other',
      ],
      support_ticket_channel: ['email', 'contact_form', 'in_app'],
      support_ticket_priority: ['low', 'normal', 'high', 'urgent'],
      support_ticket_status: ['new', 'open', 'pending_on_user', 'on_hold', 'solved', 'closed'],
      tag_status: ['waiting', 'approved', 'rejected'],
      writer_rank: ['new_writer', 'writer', 'storyteller', 'novelist'],
    },
  },
} as const;
