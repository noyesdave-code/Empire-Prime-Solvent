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
      abandoned_carts: {
        Row: {
          email: string
          id: string
          metadata: Json
          opened_at: string
          product: string | null
          recovered_at: string | null
          recovery_sent_at: string | null
          session_id: string | null
          tier: string | null
        }
        Insert: {
          email: string
          id?: string
          metadata?: Json
          opened_at?: string
          product?: string | null
          recovered_at?: string | null
          recovery_sent_at?: string | null
          session_id?: string | null
          tier?: string | null
        }
        Update: {
          email?: string
          id?: string
          metadata?: Json
          opened_at?: string
          product?: string | null
          recovered_at?: string | null
          recovery_sent_at?: string | null
          session_id?: string | null
          tier?: string | null
        }
        Relationships: []
      }
      ai_compositions: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          id: string
          output: string | null
          prompt: string
          status: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          created_by?: string | null
          id?: string
          output?: string | null
          prompt: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          output?: string | null
          prompt?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ani_growth_metrics: {
        Row: {
          avg_latency_ms: number
          computed_at: string
          day: string
          distinct_skills: number
          growth_score: number
          memory_size: number
          success_rate: number
          total_calls: number
          unique_users: number
        }
        Insert: {
          avg_latency_ms?: number
          computed_at?: string
          day: string
          distinct_skills?: number
          growth_score?: number
          memory_size?: number
          success_rate?: number
          total_calls?: number
          unique_users?: number
        }
        Update: {
          avg_latency_ms?: number
          computed_at?: string
          day?: string
          distinct_skills?: number
          growth_score?: number
          memory_size?: number
          success_rate?: number
          total_calls?: number
          unique_users?: number
        }
        Relationships: []
      }
      ani_memory_settings: {
        Row: {
          history_turns: number
          memory_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          history_turns?: number
          memory_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          history_turns?: number
          memory_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ani_persona: {
        Row: {
          end_hour: number
          figure: string | null
          id: number
          notes: string | null
          set_by: string | null
          start_hour: number
          timezone: string
          updated_at: string
        }
        Insert: {
          end_hour?: number
          figure?: string | null
          id?: number
          notes?: string | null
          set_by?: string | null
          start_hour?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          end_hour?: number
          figure?: string | null
          id?: number
          notes?: string | null
          set_by?: string | null
          start_hour?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      ani_provider_config: {
        Row: {
          allow_lovable_fallback: boolean
          default_model: string
          id: number
          independent_only: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_lovable_fallback?: boolean
          default_model?: string
          id?: number
          independent_only?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_lovable_fallback?: boolean
          default_model?: string
          id?: number
          independent_only?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ani_usage_ledger: {
        Row: {
          created_at: string
          error: string | null
          est_cost_usd: number
          id: string
          latency_ms: number | null
          model: string
          provider: string
          session_id: string | null
          success: boolean
          tokens_in: number
          tokens_out: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          est_cost_usd?: number
          id?: string
          latency_ms?: number | null
          model: string
          provider: string
          session_id?: string | null
          success?: boolean
          tokens_in?: number
          tokens_out?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          est_cost_usd?: number
          id?: string
          latency_ms?: number | null
          model?: string
          provider?: string
          session_id?: string | null
          success?: boolean
          tokens_in?: number
          tokens_out?: number
          user_id?: string | null
        }
        Relationships: []
      }
      blueprints: {
        Row: {
          created_at: string
          email: string
          id: string
          intake: Json
          output: string | null
          status: string
          tier: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          intake: Json
          output?: string | null
          status?: string
          tier: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          intake?: Json
          output?: string | null
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      boardroom_assets: {
        Row: {
          bucket: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          mime_type: string | null
          path: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          bucket: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mime_type?: string | null
          path: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          bucket?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mime_type?: string | null
          path?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      boardroom_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          tokens_est: number
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          tokens_est?: number
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          tokens_est?: number
          user_id?: string
        }
        Relationships: []
      }
      boardroom_documents: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      boardroom_pages: {
        Row: {
          category: string | null
          content_md: string
          created_at: string
          description: string | null
          id: string
          slug: string
          sort_order: number
          source_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content_md?: string
          created_at?: string
          description?: string | null
          id?: string
          slug: string
          sort_order?: number
          source_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content_md?: string
          created_at?: string
          description?: string | null
          id?: string
          slug?: string
          sort_order?: number
          source_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      boardroom_videos: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      brand_alerts: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          reviewed: boolean
          severity: string
          snippet: string | null
          source_url: string | null
          term: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          reviewed?: boolean
          severity?: string
          snippet?: string | null
          source_url?: string | null
          term: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          reviewed?: boolean
          severity?: string
          snippet?: string | null
          source_url?: string | null
          term?: string
        }
        Relationships: []
      }
      brand_registry: {
        Row: {
          category: string
          created_at: string
          id: string
          key: string
          mark: string
          name: string
          notes: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          key: string
          mark: string
          name: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          key?: string
          mark?: string
          name?: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      community_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      empire_brain: {
        Row: {
          active: boolean
          content: string
          created_at: string
          id: string
          priority: number
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          content: string
          created_at?: string
          id?: string
          priority?: number
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          id?: string
          priority?: number
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      empire_learnings: {
        Row: {
          created_at: string
          hit_count: number
          id: string
          notes: string | null
          pattern: string
          promoted_to_brain: boolean
          sample_prompt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hit_count?: number
          id?: string
          notes?: string | null
          pattern: string
          promoted_to_brain?: boolean
          sample_prompt: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hit_count?: number
          id?: string
          notes?: string | null
          pattern?: string
          promoted_to_brain?: boolean
          sample_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      fulfillment_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          metadata: Json
          order_id: string
          printful_order_id: string | null
          route: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          metadata?: Json
          order_id: string
          printful_order_id?: string | null
          route: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          metadata?: Json
          order_id?: string
          printful_order_id?: string | null
          route?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_events: {
        Row: {
          ab_cta_variant: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          product: string | null
          session_id: string | null
          stage: string | null
        }
        Insert: {
          ab_cta_variant?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          product?: string | null
          session_id?: string | null
          stage?: string | null
        }
        Update: {
          ab_cta_variant?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          product?: string | null
          session_id?: string | null
          stage?: string | null
        }
        Relationships: []
      }
      funnel_leads: {
        Row: {
          ab_cta_variant: string | null
          created_at: string
          email: string
          id: string
          metadata: Json
          product_interest: string | null
          referrer: string | null
          source: string
          stage: string | null
          user_agent: string | null
        }
        Insert: {
          ab_cta_variant?: string | null
          created_at?: string
          email: string
          id?: string
          metadata?: Json
          product_interest?: string | null
          referrer?: string | null
          source?: string
          stage?: string | null
          user_agent?: string | null
        }
        Update: {
          ab_cta_variant?: string | null
          created_at?: string
          email?: string
          id?: string
          metadata?: Json
          product_interest?: string | null
          referrer?: string | null
          source?: string
          stage?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      ide_build_usage: {
        Row: {
          created_at: string
          free_attempts_used: number
          last_attempt_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          free_attempts_used?: number
          last_attempt_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          free_attempts_used?: number
          last_attempt_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ide_deployments: {
        Row: {
          connection_id: string | null
          created_at: string
          error_message: string | null
          id: string
          live_url: string | null
          project_id: string
          pushed_files: number
          repo_name: string | null
          repo_owner: string | null
          repo_url: string | null
          status: string
          target: string
          updated_at: string
          user_id: string
          workflow_url: string | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          live_url?: string | null
          project_id: string
          pushed_files?: number
          repo_name?: string | null
          repo_owner?: string | null
          repo_url?: string | null
          status?: string
          target?: string
          updated_at?: string
          user_id: string
          workflow_url?: string | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          live_url?: string | null
          project_id?: string
          pushed_files?: number
          repo_name?: string | null
          repo_owner?: string | null
          repo_url?: string | null
          status?: string
          target?: string
          updated_at?: string
          user_id?: string
          workflow_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ide_deployments_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ide_github_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ide_deployments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ide_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ide_files: {
        Row: {
          content: string
          created_at: string
          id: string
          language: string | null
          path: string
          project_id: string
          size_bytes: number
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          language?: string | null
          path: string
          project_id: string
          size_bytes?: number
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          language?: string | null
          path?: string
          project_id?: string
          size_bytes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ide_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ide_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ide_github_connections: {
        Row: {
          created_at: string
          display_name: string | null
          github_login: string
          id: string
          last_used_at: string | null
          scopes: string[]
          status: string
          token_secret_ref: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          github_login: string
          id?: string
          last_used_at?: string | null
          scopes?: string[]
          status?: string
          token_secret_ref: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          github_login?: string
          id?: string
          last_used_at?: string | null
          scopes?: string[]
          status?: string
          token_secret_ref?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ide_github_oauth_states: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          redirect_to: string
          state: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          redirect_to?: string
          state: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          redirect_to?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      ide_projects: {
        Row: {
          created_at: string
          description: string | null
          fork_of: string | null
          id: string
          is_public: boolean
          name: string
          owner_id: string
          primary_language: string
          slug: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fork_of?: string | null
          id?: string
          is_public?: boolean
          name: string
          owner_id: string
          primary_language?: string
          slug: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fork_of?: string | null
          id?: string
          is_public?: boolean
          name?: string
          owner_id?: string
          primary_language?: string
          slug?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ide_projects_fork_of_fkey"
            columns: ["fork_of"]
            isOneToOne: false
            referencedRelation: "ide_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ide_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          exit_code: number | null
          id: string
          language: string
          project_id: string | null
          provider: string
          source_preview: string | null
          stderr_preview: string | null
          stdout_preview: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          exit_code?: number | null
          id?: string
          language: string
          project_id?: string | null
          provider?: string
          source_preview?: string | null
          stderr_preview?: string | null
          stdout_preview?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          exit_code?: number | null
          id?: string
          language?: string
          project_id?: string | null
          provider?: string
          source_preview?: string | null
          stderr_preview?: string | null
          stdout_preview?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ide_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ide_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ide_templates: {
        Row: {
          created_at: string
          description: string | null
          files: Json
          icon: string | null
          id: string
          language: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          files?: Json
          icon?: string | null
          id?: string
          language: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          files?: Json
          icon?: string | null
          id?: string
          language?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      idea_board_posts: {
        Row: {
          created_at: string
          for_date: string
          id: string
          source: Json
          summary: string
          title: string
          winner_user_id: string | null
        }
        Insert: {
          created_at?: string
          for_date: string
          id?: string
          source?: Json
          summary: string
          title: string
          winner_user_id?: string | null
        }
        Update: {
          created_at?: string
          for_date?: string
          id?: string
          source?: Json
          summary?: string
          title?: string
          winner_user_id?: string | null
        }
        Relationships: []
      }
      memory_vectors: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
          skill: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          skill?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          skill?: string | null
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          email: string
          environment: string
          fulfillment_status: string
          id: string
          metadata: Json
          paddle_order_id: string | null
          product_id: string
          shipping_address: Json | null
          sku: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          email: string
          environment?: string
          fulfillment_status?: string
          id?: string
          metadata?: Json
          paddle_order_id?: string | null
          product_id: string
          shipping_address?: Json | null
          sku?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          email?: string
          environment?: string
          fulfillment_status?: string
          id?: string
          metadata?: Json
          paddle_order_id?: string | null
          product_id?: string
          shipping_address?: Json | null
          sku?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      outreach_targets: {
        Row: {
          created_at: string
          email: string
          id: string
          last_sent_at: string | null
          metadata: Json
          product_interest: string | null
          source: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_sent_at?: string | null
          metadata?: Json
          product_interest?: string | null
          source?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_sent_at?: string | null
          metadata?: Json
          product_interest?: string | null
          source?: string | null
          status?: string
        }
        Relationships: []
      }
      pricing_snapshots: {
        Row: {
          captured_at: string
          competitor: string
          currency: string | null
          id: string
          metadata: Json
          price_cents: number | null
          product_id: string
          url: string | null
        }
        Insert: {
          captured_at?: string
          competitor: string
          currency?: string | null
          id?: string
          metadata?: Json
          price_cents?: number | null
          product_id: string
          url?: string | null
        }
        Update: {
          captured_at?: string
          competitor?: string
          currency?: string | null
          id?: string
          metadata?: Json
          price_cents?: number | null
          product_id?: string
          url?: string | null
        }
        Relationships: []
      }
      product_sourcing: {
        Row: {
          ai_estimated_cost_cents: number | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_pod: boolean
          margin_pct: number | null
          metadata: Json
          name: string
          printful_variant_id: string | null
          sku: string
          status: string
          suggested_price_cents: number | null
          supplier: string | null
          supplier_url: string | null
          updated_at: string
          verified_cost_cents: number | null
        }
        Insert: {
          ai_estimated_cost_cents?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_pod?: boolean
          margin_pct?: number | null
          metadata?: Json
          name: string
          printful_variant_id?: string | null
          sku: string
          status?: string
          suggested_price_cents?: number | null
          supplier?: string | null
          supplier_url?: string | null
          updated_at?: string
          verified_cost_cents?: number | null
        }
        Update: {
          ai_estimated_cost_cents?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_pod?: boolean
          margin_pct?: number | null
          metadata?: Json
          name?: string
          printful_variant_id?: string | null
          sku?: string
          status?: string
          suggested_price_cents?: number | null
          supplier?: string | null
          supplier_url?: string | null
          updated_at?: string
          verified_cost_cents?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          prompt_count_month: number
          quota_reset_at: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          prompt_count_month?: number
          quota_reset_at?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          prompt_count_month?: number
          quota_reset_at?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prompt_usage: {
        Row: {
          created_at: string
          day: string
          id: string
          prompt_count: number
          tokens_in: number
          tokens_out: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          id?: string
          prompt_count?: number
          tokens_in?: number
          tokens_out?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          prompt_count?: number
          tokens_in?: number
          tokens_out?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          created_at: string
          id: string
          latency_ms: number | null
          model_used: string | null
          prompt: string
          response: string | null
          session_id: string | null
          skill: string | null
          source: string | null
          tokens_in: number | null
          tokens_out: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          latency_ms?: number | null
          model_used?: string | null
          prompt: string
          response?: string | null
          session_id?: string | null
          skill?: string | null
          source?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          latency_ms?: number | null
          model_used?: string | null
          prompt?: string
          response?: string | null
          session_id?: string | null
          skill?: string | null
          source?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      public_answers: {
        Row: {
          ai_summary: string | null
          ai_title: string | null
          answer: string
          created_at: string
          id: string
          indexed: boolean
          prompt_id: string | null
          question: string
          slug: string
          tags: string[]
          updated_at: string
          view_count: number
        }
        Insert: {
          ai_summary?: string | null
          ai_title?: string | null
          answer: string
          created_at?: string
          id?: string
          indexed?: boolean
          prompt_id?: string | null
          question: string
          slug: string
          tags?: string[]
          updated_at?: string
          view_count?: number
        }
        Update: {
          ai_summary?: string | null
          ai_title?: string | null
          answer?: string
          created_at?: string
          id?: string
          indexed?: boolean
          prompt_id?: string | null
          question?: string
          slug?: string
          tags?: string[]
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      routing_log: {
        Row: {
          candidates: Json | null
          chosen_model: string
          created_at: string
          id: string
          prompt_id: string | null
          reason: string | null
          task_type: string | null
        }
        Insert: {
          candidates?: Json | null
          chosen_model: string
          created_at?: string
          id?: string
          prompt_id?: string | null
          reason?: string | null
          task_type?: string | null
        }
        Update: {
          candidates?: Json | null
          chosen_model?: string
          created_at?: string
          id?: string
          prompt_id?: string | null
          reason?: string | null
          task_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routing_log_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      sandbox_state: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          metadata: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          kind: string
          metadata?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_audit_runs: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          name: string
          notes: string | null
          results: Json
          started_at: string
          stats: Json
          status: string
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          results?: Json
          started_at?: string
          stats?: Json
          status?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          results?: Json
          started_at?: string
          stats?: Json
          status?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_drafts: {
        Row: {
          body_md: string
          created_at: string
          id: string
          metadata: Json
          product_id: string | null
          status: string
          title: string
        }
        Insert: {
          body_md: string
          created_at?: string
          id?: string
          metadata?: Json
          product_id?: string | null
          status?: string
          title: string
        }
        Update: {
          body_md?: string
          created_at?: string
          id?: string
          metadata?: Json
          product_id?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      site_edit_audit: {
        Row: {
          created_at: string
          endpoint: string | null
          id: string
          intent: string
          ip_address: string | null
          metadata: Json | null
          outcome: string
          reason: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint?: string | null
          id?: string
          intent: string
          ip_address?: string | null
          metadata?: Json | null
          outcome: string
          reason?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string | null
          id?: string
          intent?: string
          ip_address?: string | null
          metadata?: Json | null
          outcome?: string
          reason?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      site_edit_ip_denylist: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ip_address: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address?: string
          reason?: string | null
        }
        Relationships: []
      }
      skills_registry: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          name: string
          preferred_model: string | null
          slug: string
          system_prompt: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          preferred_model?: string | null
          slug: string
          system_prompt?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          preferred_model?: string | null
          slug?: string
          system_prompt?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      swarm_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          started_at: string
          stats: Json
          status: string
          swarm_name: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          stats?: Json
          status?: string
          swarm_name: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          stats?: Json
          status?: string
          swarm_name?: string
        }
        Relationships: []
      }
      uptime_checks: {
        Row: {
          checked_at: string
          error: string | null
          id: number
          latency_ms: number | null
          ok: boolean
          status_code: number | null
          target_id: string
        }
        Insert: {
          checked_at?: string
          error?: string | null
          id?: number
          latency_ms?: number | null
          ok: boolean
          status_code?: number | null
          target_id: string
        }
        Update: {
          checked_at?: string
          error?: string | null
          id?: number
          latency_ms?: number | null
          ok?: boolean
          status_code?: number | null
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uptime_checks_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "uptime_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      uptime_targets: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      web_research: {
        Row: {
          created_at: string
          id: string
          model_used: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_pattern: string | null
          sources: Json
          status: string
          summary: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_used?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_pattern?: string | null
          sources?: Json
          status?: string
          summary: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          model_used?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_pattern?: string | null
          sources?: Json
          status?: string
          summary?: string
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      is_site_editor: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      service_consume_ide_build_attempt: {
        Args: { _environment?: string; _free_limit?: number; _user_id: string }
        Returns: {
          allowed: boolean
          free_attempts_limit: number
          free_attempts_used: number
          reason: string
          requires_payment: boolean
        }[]
      }
      service_delete_ide_github_token: {
        Args: { _connection_id: string }
        Returns: undefined
      }
      service_get_ide_github_token: {
        Args: { _connection_id: string }
        Returns: string
      }
      service_store_ide_github_token: {
        Args: {
          _access_token: string
          _connection_id: string
          _token_type?: string
        }
        Returns: undefined
      }
      suggest_price_cents: {
        Args: { _cost_cents: number }
        Returns: {
          margin_pct: number
          price_cents: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
