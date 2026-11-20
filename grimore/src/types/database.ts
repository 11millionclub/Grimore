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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          description: string
          icon: string
          id: string
          name: string
          sort_order: number
          xp_reward: number
        }
        Insert: {
          category: string
          description: string
          icon: string
          id: string
          name: string
          sort_order?: number
          xp_reward?: number
        }
        Update: {
          category?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
          xp_reward?: number
        }
        Relationships: []
      }
      authors: {
        Row: {
          bio: string | null
          birth_year: number | null
          created_at: string
          death_year: number | null
          id: string
          name: string
          nationality_code: string | null
          open_library_key: string | null
          sort_name: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          birth_year?: number | null
          created_at?: string
          death_year?: number | null
          id?: string
          name: string
          nationality_code?: string | null
          open_library_key?: string | null
          sort_name?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          birth_year?: number | null
          created_at?: string
          death_year?: number | null
          id?: string
          name?: string
          nationality_code?: string | null
          open_library_key?: string | null
          sort_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      book_authors: {
        Row: {
          author_id: string
          book_id: string
          position: number
          role: string
        }
        Insert: {
          author_id: string
          book_id: string
          position?: number
          role?: string
        }
        Update: {
          author_id?: string
          book_id?: string
          position?: number
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_authors_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_authors_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_editions: {
        Row: {
          book_id: string
          cover_url: string | null
          created_at: string
          format: string | null
          id: string
          language: string | null
          page_count: number | null
          published_date: string | null
          publisher: string | null
          title: string | null
        }
        Insert: {
          book_id: string
          cover_url?: string | null
          created_at?: string
          format?: string | null
          id?: string
          language?: string | null
          page_count?: number | null
          published_date?: string | null
          publisher?: string | null
          title?: string | null
        }
        Update: {
          book_id?: string
          cover_url?: string | null
          created_at?: string
          format?: string | null
          id?: string
          language?: string | null
          page_count?: number | null
          published_date?: string | null
          publisher?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_editions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_genres: {
        Row: {
          book_id: string
          genre_id: number
        }
        Insert: {
          book_id: string
          genre_id: number
        }
        Update: {
          book_id?: string
          genre_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_genres_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      book_identifiers: {
        Row: {
          book_id: string
          created_at: string
          edition_id: string | null
          id: string
          type: Database["public"]["Enums"]["identifier_type"]
          value: string
        }
        Insert: {
          book_id: string
          created_at?: string
          edition_id?: string | null
          id?: string
          type: Database["public"]["Enums"]["identifier_type"]
          value: string
        }
        Update: {
          book_id?: string
          created_at?: string
          edition_id?: string | null
          id?: string
          type?: Database["public"]["Enums"]["identifier_type"]
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_identifiers_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_identifiers_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "book_editions"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          cover_source: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          first_published_year: number | null
          id: string
          is_curated: boolean
          moods: string[]
          normalized_title: string | null
          open_library_work_key: string | null
          original_language: string | null
          page_count_estimate: number | null
          primary_genre_id: number | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_source?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          first_published_year?: number | null
          id?: string
          is_curated?: boolean
          moods?: string[]
          normalized_title?: string | null
          open_library_work_key?: string | null
          original_language?: string | null
          page_count_estimate?: number | null
          primary_genre_id?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_source?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          first_published_year?: number | null
          id?: string
          is_curated?: boolean
          moods?: string[]
          normalized_title?: string | null
          open_library_work_key?: string | null
          original_language?: string | null
          page_count_estimate?: number | null
          primary_genre_id?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_primary_genre_id_fkey"
            columns: ["primary_genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      clue_sets: {
        Row: {
          book_id: string
          clues: string[]
          created_at: string
          id: string
          validated_at: string | null
        }
        Insert: {
          book_id: string
          clues: string[]
          created_at?: string
          id?: string
          validated_at?: string | null
        }
        Update: {
          book_id?: string
          clues?: string[]
          created_at?: string
          id?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clue_sets_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: true
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          cover_scene: string
          created_at: string
          description: string | null
          host_id: string
          id: string
          max_members: number | null
          member_count: number
          name: string
          price_cents: number | null
          reading_book_id: string | null
          reading_note: string | null
          rules: Json
          slug: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          cover_scene?: string
          created_at?: string
          description?: string | null
          host_id: string
          id?: string
          max_members?: number | null
          member_count?: number
          name: string
          price_cents?: number | null
          reading_book_id?: string | null
          reading_note?: string | null
          rules?: Json
          slug: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          cover_scene?: string
          created_at?: string
          description?: string | null
          host_id?: string
          id?: string
          max_members?: number | null
          member_count?: number
          name?: string
          price_cents?: number | null
          reading_book_id?: string | null
          reading_note?: string | null
          rules?: Json
          slug?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communities_reading_book_id_fkey"
            columns: ["reading_book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      community_events: {
        Row: {
          community_id: string
          created_at: string
          created_by: string
          details: string | null
          format: string
          id: string
          members_only: boolean
          starts_at: string
          title: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by: string
          details?: string | null
          format?: string
          id?: string
          members_only?: boolean
          starts_at: string
          title: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string
          details?: string | null
          format?: string
          id?: string
          members_only?: boolean
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          joined_at: string
          role: string
          tier: string
          user_id: string
        }
        Insert: {
          community_id: string
          joined_at?: string
          role?: string
          tier?: string
          user_id: string
        }
        Update: {
          community_id?: string
          joined_at?: string
          role?: string
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_replies: {
        Row: {
          body: string
          created_at: string
          has_spoilers: boolean
          id: string
          thread_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          has_spoilers?: boolean
          id?: string
          thread_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          has_spoilers?: boolean
          id?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "community_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_threads: {
        Row: {
          body: string | null
          book_id: string | null
          community_id: string
          created_at: string
          has_spoilers: boolean
          id: string
          is_pinned: boolean
          members_only: boolean
          reply_count: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          book_id?: string | null
          community_id: string
          created_at?: string
          has_spoilers?: boolean
          id?: string
          is_pinned?: boolean
          members_only?: boolean
          reply_count?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          book_id?: string | null
          community_id?: string
          created_at?: string
          has_spoilers?: boolean
          id?: string
          is_pinned?: boolean
          members_only?: boolean
          reply_count?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_threads_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_threads_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          post_comment_id: string | null
          post_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id: string | null
          reporter_id: string
          review_comment_id: string | null
          review_id: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          post_comment_id?: string | null
          post_id?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id?: string | null
          reporter_id: string
          review_comment_id?: string | null
          review_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          post_comment_id?: string | null
          post_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_user_id?: string | null
          reporter_id?: string
          review_comment_id?: string | null
          review_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_post_comment_id_fkey"
            columns: ["post_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_review_comment_id_fkey"
            columns: ["review_comment_id"]
            isOneToOne: false
            referencedRelation: "review_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_reads: {
        Row: {
          conversation_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      corner_guestbook: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          owner_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          owner_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corner_guestbook_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corner_guestbook_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      corner_items: {
        Row: {
          key: string
          kind: string
          name: string
          price_cents: number | null
          sort_order: number
        }
        Insert: {
          key: string
          kind: string
          name: string
          price_cents?: number | null
          sort_order?: number
        }
        Update: {
          key?: string
          kind?: string
          name?: string
          price_cents?: number | null
          sort_order?: number
        }
        Relationships: []
      }
      corner_purchases: {
        Row: {
          item_key: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          item_key: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          item_key?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corner_purchases_item_key_fkey"
            columns: ["item_key"]
            isOneToOne: false
            referencedRelation: "corner_items"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "corner_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      corners: {
        Row: {
          badge_ids: string[]
          frame: string
          name_style: string
          pack: string
          pinned_review_id: string | null
          shelf: string
          song: string | null
          status_text: string | null
          theme: string
          updated_at: string
          user_id: string
          widgets: string[]
        }
        Insert: {
          badge_ids?: string[]
          frame?: string
          name_style?: string
          pack?: string
          pinned_review_id?: string | null
          shelf?: string
          song?: string | null
          status_text?: string | null
          theme?: string
          updated_at?: string
          user_id: string
          widgets?: string[]
        }
        Update: {
          badge_ids?: string[]
          frame?: string
          name_style?: string
          pack?: string
          pinned_review_id?: string | null
          shelf?: string
          song?: string | null
          status_text?: string | null
          theme?: string
          updated_at?: string
          user_id?: string
          widgets?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "corners_pinned_review_id_fkey"
            columns: ["pinned_review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activity: {
        Row: {
          activity_date: string
          games_completed: number
          is_perfect: boolean
          user_id: string
          xp_earned: number
        }
        Insert: {
          activity_date: string
          games_completed?: number
          is_perfect?: boolean
          user_id: string
          xp_earned?: number
        }
        Update: {
          activity_date?: string
          games_completed?: number
          is_perfect?: boolean
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenge_solutions: {
        Row: {
          answer: Json | null
          answer_book_id: string | null
          challenge_id: string
          correct_index: number | null
          explanation: string | null
          quiz_question_id: string | null
        }
        Insert: {
          answer?: Json | null
          answer_book_id?: string | null
          challenge_id: string
          correct_index?: number | null
          explanation?: string | null
          quiz_question_id?: string | null
        }
        Update: {
          answer?: Json | null
          answer_book_id?: string | null
          challenge_id?: string
          correct_index?: number | null
          explanation?: string | null
          quiz_question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenge_solutions_answer_book_id_fkey"
            columns: ["answer_book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_challenge_solutions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: true
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_challenge_solutions_quiz_question_id_fkey"
            columns: ["quiz_question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenges: {
        Row: {
          challenge_date: string
          created_at: string
          difficulty: number
          game: Database["public"]["Enums"]["game_type"]
          id: string
          public_payload: Json
          status: Database["public"]["Enums"]["challenge_status"]
        }
        Insert: {
          challenge_date: string
          created_at?: string
          difficulty?: number
          game: Database["public"]["Enums"]["game_type"]
          id?: string
          public_payload?: Json
          status?: Database["public"]["Enums"]["challenge_status"]
        }
        Update: {
          challenge_date?: string
          created_at?: string
          difficulty?: number
          game?: Database["public"]["Enums"]["game_type"]
          id?: string
          public_payload?: Json
          status?: Database["public"]["Enums"]["challenge_status"]
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
          status: Database["public"]["Enums"]["follow_status"]
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
          status?: Database["public"]["Enums"]["follow_status"]
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
          status?: Database["public"]["Enums"]["follow_status"]
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_answers: {
        Row: {
          attempt_id: string
          created_at: string
          feedback: Json | null
          guessed_book_id: string | null
          id: string
          is_correct: boolean
          position: number
          selected_index: number | null
        }
        Insert: {
          attempt_id: string
          created_at?: string
          feedback?: Json | null
          guessed_book_id?: string | null
          id?: string
          is_correct?: boolean
          position: number
          selected_index?: number | null
        }
        Update: {
          attempt_id?: string
          created_at?: string
          feedback?: Json | null
          guessed_book_id?: string | null
          id?: string
          is_correct?: boolean
          position?: number
          selected_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "game_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_answers_guessed_book_id_fkey"
            columns: ["guessed_book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      game_attempts: {
        Row: {
          challenge_date: string
          challenge_id: string
          completed_at: string | null
          game: Database["public"]["Enums"]["game_type"]
          guesses_count: number
          hints_used: number
          id: string
          penalty_seconds: number
          score: number
          started_at: string
          state: Json
          status: Database["public"]["Enums"]["attempt_status"]
          time_seconds: number | null
          user_id: string
          xp_awarded: number
        }
        Insert: {
          challenge_date: string
          challenge_id: string
          completed_at?: string | null
          game: Database["public"]["Enums"]["game_type"]
          guesses_count?: number
          hints_used?: number
          id?: string
          penalty_seconds?: number
          score?: number
          started_at?: string
          state?: Json
          status?: Database["public"]["Enums"]["attempt_status"]
          time_seconds?: number | null
          user_id: string
          xp_awarded?: number
        }
        Update: {
          challenge_date?: string
          challenge_id?: string
          completed_at?: string | null
          game?: Database["public"]["Enums"]["game_type"]
          guesses_count?: number
          hints_used?: number
          id?: string
          penalty_seconds?: number
          score?: number
          started_at?: string
          state?: Json
          status?: Database["public"]["Enums"]["attempt_status"]
          time_seconds?: number | null
          user_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_attempts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          id: number
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: never
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          id?: never
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      market_alerts: {
        Row: {
          book_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_alerts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      market_listings: {
        Row: {
          book_id: string
          city: string | null
          condition: string
          created_at: string
          currency: string
          edition: string | null
          id: string
          is_rare: boolean
          mode: string
          note: string | null
          price_cents: number | null
          seller_id: string
          status: string
          updated_at: string
          user_book_id: string | null
        }
        Insert: {
          book_id: string
          city?: string | null
          condition: string
          created_at?: string
          currency?: string
          edition?: string | null
          id?: string
          is_rare?: boolean
          mode: string
          note?: string | null
          price_cents?: number | null
          seller_id: string
          status?: string
          updated_at?: string
          user_book_id?: string | null
        }
        Update: {
          book_id?: string
          city?: string | null
          condition?: string
          created_at?: string
          currency?: string
          edition?: string | null
          id?: string
          is_rare?: boolean
          mode?: string
          note?: string | null
          price_cents?: number | null
          seller_id?: string
          status?: string
          updated_at?: string
          user_book_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_listings_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listings_user_book_id_fkey"
            columns: ["user_book_id"]
            isOneToOne: false
            referencedRelation: "user_books"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          book_id: string | null
          conversation_id: string
          created_at: string
          id: string
          listing_id: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          book_id?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          listing_id?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          book_id?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          listing_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_listing_fk"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "market_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          achievement_id: string | null
          actor_id: string | null
          created_at: string
          data: Json
          id: string
          post_id: string | null
          read_at: string | null
          recipient_id: string
          review_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          achievement_id?: string | null
          actor_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          post_id?: string | null
          read_at?: string | null
          recipient_id: string
          review_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          achievement_id?: string | null
          actor_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          post_id?: string | null
          read_at?: string | null
          recipient_id?: string
          review_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          kind: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          kind?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          audience: string
          body: string | null
          book_id: string | null
          comment_count: number
          community_id: string | null
          created_at: string
          days: number | null
          has_spoilers: boolean
          id: string
          kind: Database["public"]["Enums"]["post_kind"]
          like_count: number
          page: number | null
          quote: string | null
          stars: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audience?: string
          body?: string | null
          book_id?: string | null
          comment_count?: number
          community_id?: string | null
          created_at?: string
          days?: number | null
          has_spoilers?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["post_kind"]
          like_count?: number
          page?: number | null
          quote?: string | null
          stars?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audience?: string
          body?: string | null
          book_id?: string | null
          comment_count?: number
          community_id?: string | null
          created_at?: string
          days?: number | null
          has_spoilers?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["post_kind"]
          like_count?: number
          page?: number | null
          quote?: string | null
          stars?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          archetype: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country_code: string | null
          created_at: string
          display_name: string | null
          id: string
          is_private: boolean
          onboarding_completed_at: string | null
          updated_at: string
          username: string
        }
        Insert: {
          archetype?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_private?: boolean
          onboarding_completed_at?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          archetype?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_private?: boolean
          onboarding_completed_at?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          category: string
          correct_index: number
          created_at: string
          difficulty: number
          explanation: string
          id: string
          options: Json
          prompt: string
          related_book_id: string | null
          validated_at: string | null
          validation_note: string | null
        }
        Insert: {
          category: string
          correct_index: number
          created_at?: string
          difficulty?: number
          explanation: string
          id?: string
          options: Json
          prompt: string
          related_book_id?: string | null
          validated_at?: string | null
          validation_note?: string | null
        }
        Update: {
          category?: string
          correct_index?: number
          created_at?: string
          difficulty?: number
          explanation?: string
          id?: string
          options?: Json
          prompt?: string
          related_book_id?: string | null
          validated_at?: string | null
          validation_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_related_book_id_fkey"
            columns: ["related_book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_goals: {
        Row: {
          created_at: string
          id: string
          target_books: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          target_books: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          target_books?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "reading_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_list_books: {
        Row: {
          added_at: string
          book_id: string
          list_id: string
          note: string | null
          position: number
        }
        Insert: {
          added_at?: string
          book_id: string
          list_id: string
          note?: string | null
          position?: number
        }
        Update: {
          added_at?: string
          book_id?: string
          list_id?: string
          note?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "reading_list_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_list_books_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "reading_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          position: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          position?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_sessions: {
        Row: {
          created_at: string
          end_page: number | null
          ended_at: string | null
          id: string
          note: string | null
          pages_read: number | null
          start_page: number | null
          started_at: string
          user_book_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_page?: number | null
          ended_at?: string | null
          id?: string
          note?: string | null
          pages_read?: number | null
          start_page?: number | null
          started_at?: string
          user_book_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_page?: number | null
          ended_at?: string | null
          id?: string
          note?: string | null
          pages_read?: number | null
          start_page?: number | null
          started_at?: string
          user_book_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_sessions_user_book_id_fkey"
            columns: ["user_book_id"]
            isOneToOne: false
            referencedRelation: "user_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          parent_id: string | null
          review_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          review_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          review_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "review_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reactions: {
        Row: {
          created_at: string
          kind: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          kind?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reactions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          book_id: string
          comment_count: number
          created_at: string
          has_spoilers: boolean
          headline: string | null
          id: string
          like_count: number
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          book_id: string
          comment_count?: number
          created_at?: string
          has_spoilers?: boolean
          headline?: string | null
          id?: string
          like_count?: number
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          book_id?: string
          comment_count?: number
          created_at?: string
          has_spoilers?: boolean
          headline?: string | null
          id?: string
          like_count?: number
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          post_id: string | null
          review_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id?: string | null
          review_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string | null
          review_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_items_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_candidates: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          isbn: string | null
          job_id: string
          matched_book_id: string | null
          raw_text: string | null
          status: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          isbn?: string | null
          job_id: string
          matched_book_id?: string | null
          raw_text?: string | null
          status?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          isbn?: string | null
          job_id?: string
          matched_book_id?: string | null
          raw_text?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scan_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_candidates_matched_book_id_fkey"
            columns: ["matched_book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          image_path: string | null
          source: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          image_path?: string | null
          source: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          image_path?: string | null
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_offers: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          message: string | null
          offered_book_ids: string[]
          responded_at: string | null
          status: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          message?: string | null
          offered_book_ids?: string[]
          responded_at?: string | null
          status?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          offered_book_ids?: string[]
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_offers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "market_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_books: {
        Row: {
          added_at: string
          book_id: string
          current_page: number | null
          edition_id: string | null
          finished_on: string | null
          id: string
          is_owned: boolean
          is_private: boolean
          notes: string | null
          progress_percent: number | null
          rating: number | null
          started_on: string | null
          status: Database["public"]["Enums"]["reading_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          added_at?: string
          book_id: string
          current_page?: number | null
          edition_id?: string | null
          finished_on?: string | null
          id?: string
          is_owned?: boolean
          is_private?: boolean
          notes?: string | null
          progress_percent?: number | null
          rating?: number | null
          started_on?: string | null
          status?: Database["public"]["Enums"]["reading_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          added_at?: string
          book_id?: string
          current_page?: number | null
          edition_id?: string | null
          finished_on?: string | null
          id?: string
          is_owned?: boolean
          is_private?: boolean
          notes?: string | null
          progress_percent?: number | null
          rating?: number | null
          started_on?: string | null
          status?: Database["public"]["Enums"]["reading_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_books_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "book_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_books_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorite_authors: {
        Row: {
          author_id: string
          created_at: string
          position: number
          user_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          position?: number
          user_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorite_authors_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorite_authors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorite_books: {
        Row: {
          book_id: string
          created_at: string
          position: number
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          position?: number
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorite_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorite_books_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorite_genres: {
        Row: {
          created_at: string
          genre_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          genre_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          genre_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorite_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorite_genres_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_game_statistics: {
        Row: {
          current_streak: number
          distribution: Json
          game: Database["public"]["Enums"]["game_type"]
          last_played_date: string | null
          longest_streak: number
          played: number
          updated_at: string
          user_id: string
          won: number
        }
        Insert: {
          current_streak?: number
          distribution?: Json
          game: Database["public"]["Enums"]["game_type"]
          last_played_date?: string | null
          longest_streak?: number
          played?: number
          updated_at?: string
          user_id: string
          won?: number
        }
        Update: {
          current_streak?: number
          distribution?: Json
          game?: Database["public"]["Enums"]["game_type"]
          last_played_date?: string | null
          longest_streak?: number
          played?: number
          updated_at?: string
          user_id?: string
          won?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_game_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          app_language: string
          appearance: string
          corner_book_arrangement: string
          corner_featured_book_id: string | null
          corner_layout: string
          corner_theme: string
          created_at: string
          daily_pages_goal: number
          nook_background_url: string | null
          nook_frame: string
          nook_scene: string
          nook_seal: string
          nook_shelf: string
          nook_title: string | null
          notification_settings: Json
          notifications_enabled: boolean
          reading_language: string
          show_spoilers: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          app_language?: string
          appearance?: string
          corner_book_arrangement?: string
          corner_featured_book_id?: string | null
          corner_layout?: string
          corner_theme?: string
          created_at?: string
          daily_pages_goal?: number
          nook_background_url?: string | null
          nook_frame?: string
          nook_scene?: string
          nook_seal?: string
          nook_shelf?: string
          nook_title?: string | null
          notification_settings?: Json
          notifications_enabled?: boolean
          reading_language?: string
          show_spoilers?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          app_language?: string
          appearance?: string
          corner_book_arrangement?: string
          corner_featured_book_id?: string | null
          corner_layout?: string
          corner_theme?: string
          created_at?: string
          daily_pages_goal?: number
          nook_background_url?: string | null
          nook_frame?: string
          nook_scene?: string
          nook_seal?: string
          nook_shelf?: string
          nook_title?: string | null
          notification_settings?: Json
          notifications_enabled?: boolean
          reading_language?: string
          show_spoilers?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_featured_book_fk"
            columns: ["corner_featured_book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quotes: {
        Row: {
          attribution: string | null
          body: string
          book_id: string | null
          created_at: string
          id: string
          position: number
          user_id: string
        }
        Insert: {
          attribution?: string | null
          body: string
          book_id?: string | null
          created_at?: string
          id?: string
          position?: number
          user_id: string
        }
        Update: {
          attribution?: string | null
          body?: string
          book_id?: string | null
          created_at?: string
          id?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quotes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_statistics: {
        Row: {
          books_read: number
          books_reading: number
          books_total: number
          followers_count: number
          following_count: number
          pages_read: number
          posts_count: number
          reviews_count: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          books_read?: number
          books_reading?: number
          books_total?: number
          followers_count?: number
          following_count?: number
          pages_read?: number
          posts_count?: number
          reviews_count?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          books_read?: number
          books_reading?: number
          books_total?: number
          followers_count?: number
          following_count?: number
          pages_read?: number
          posts_count?: number
          reviews_count?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          completed_days: number
          current_streak: number
          freezes_available: number
          last_active_date: string | null
          longest_streak: number
          perfect_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_days?: number
          current_streak?: number
          freezes_available?: number
          last_active_date?: string | null
          longest_streak?: number
          perfect_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_days?: number
          current_streak?: number
          freezes_available?: number
          last_active_date?: string | null
          longest_streak?: number
          perfect_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          source_key: string
          source_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          source_key: string
          source_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          source_key?: string
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      feed_items: {
        Row: {
          audience: string | null
          body: string | null
          book_id: string | null
          comment_count: number | null
          community_id: string | null
          created_at: string | null
          days: number | null
          has_spoilers: boolean | null
          headline: string | null
          id: string | null
          item_type: string | null
          kind: string | null
          like_count: number | null
          page: number | null
          quote: string | null
          rating: number | null
          stars: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      bookle_guess: {
        Args: { p_book: string; p_challenge: string }
        Returns: Json
      }
      clues_guess: {
        Args: { p_book: string; p_challenge: string }
        Returns: Json
      }
      cover_guess: {
        Args: { p_book: string; p_challenge: string }
        Returns: Json
      }
      cover_reveal_answer: {
        Args: { p_book: string; p_challenge: string }
        Returns: Json
      }
      cover_reveal_hint: { Args: { p_challenge: string }; Returns: Json }
      game_hint: { Args: { p_challenge: string }; Returns: Json }
      get_achievements: { Args: { p_user?: string }; Returns: Json }
      get_challenge_state: { Args: { p_challenge: string }; Returns: Json }
      get_corner_settings: { Args: { p_user: string }; Returns: Json }
      get_game_leaderboard: { Args: { p_challenge: string }; Returns: Json }
      get_game_state: { Args: { p_challenge: string }; Returns: Json }
      get_nook_settings: { Args: { p_user: string }; Returns: Json }
      get_progress: { Args: { p_user?: string }; Returns: Json }
      get_reading_streak: { Args: { p_user?: string }; Returns: Json }
      get_today_challenges: { Args: never; Returns: Json }
      get_today_games: { Args: never; Returns: Json }
      get_weekly_leaderboard: { Args: never; Returns: Json }
      hangman_guess: {
        Args: { p_challenge: string; p_letter: string }
        Returns: Json
      }
      is_username_available: { Args: { p_username: string }; Returns: boolean }
      list_conversations: { Args: never; Returns: Json }
      log_progress: {
        Args: {
          p_audience?: string
          p_book: string
          p_note?: string
          p_page: number
          p_share?: boolean
        }
        Returns: Json
      }
      mark_conversation_read: {
        Args: { p_conversation: string }
        Returns: undefined
      }
      open_conversation: { Args: { p_other: string }; Returns: string }
      quiz_answer: {
        Args: { p_challenge: string; p_index: number }
        Returns: Json
      }
      respond_trade: {
        Args: { p_accept: boolean; p_offer: string }
        Returns: Json
      }
      search_catalogue: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          authors: string
          cover_url: string
          first_published_year: number
          id: string
          score: number
          title: string
        }[]
      }
      start_game: { Args: { p_challenge: string }; Returns: Json }
      suggest_communities: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          match: number
        }[]
      }
      timeline_submit: {
        Args: { p_challenge: string; p_order: string[] }
        Returns: Json
      }
      upsert_book: { Args: { p_book: Json }; Returns: string }
      utc_today: { Args: never; Returns: string }
    }
    Enums: {
      attempt_status: "in_progress" | "won" | "lost"
      challenge_status: "draft" | "scheduled" | "published" | "retired"
      follow_status: "accepted" | "pending"
      game_type:
        | "bookle"
        | "cover_reveal"
        | "quiz"
        | "hangman"
        | "cover"
        | "clues"
        | "timeline"
      identifier_type:
        | "isbn_10"
        | "isbn_13"
        | "open_library_edition"
        | "open_library_work"
        | "google_volume"
        | "oclc"
      notification_type:
        | "follow"
        | "follow_request"
        | "follow_accepted"
        | "post_like"
        | "post_comment"
        | "review_like"
        | "review_comment"
        | "comment_reply"
        | "achievement"
        | "game"
        | "market"
        | "community"
        | "trade"
      post_kind:
        | "thought"
        | "question"
        | "recommendation"
        | "reading_update"
        | "discussion"
        | "progress"
        | "quote"
        | "finished"
        | "free"
      reading_status: "want_to_read" | "reading" | "read" | "on_hold" | "dnf"
      report_reason:
        | "spam"
        | "harassment"
        | "hate"
        | "spoiler"
        | "sexual"
        | "violence"
        | "misinformation"
        | "other"
      report_status: "open" | "reviewing" | "actioned" | "dismissed"
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
    Enums: {
      attempt_status: ["in_progress", "won", "lost"],
      challenge_status: ["draft", "scheduled", "published", "retired"],
      follow_status: ["accepted", "pending"],
      game_type: [
        "bookle",
        "cover_reveal",
        "quiz",
        "hangman",
        "cover",
        "clues",
        "timeline",
      ],
      identifier_type: [
        "isbn_10",
        "isbn_13",
        "open_library_edition",
        "open_library_work",
        "google_volume",
        "oclc",
      ],
      notification_type: [
        "follow",
        "follow_request",
        "follow_accepted",
        "post_like",
        "post_comment",
        "review_like",
        "review_comment",
        "comment_reply",
        "achievement",
        "game",
        "market",
        "community",
        "trade",
      ],
      post_kind: [
        "thought",
        "question",
        "recommendation",
        "reading_update",
        "discussion",
        "progress",
        "quote",
        "finished",
        "free",
      ],
      reading_status: ["want_to_read", "reading", "read", "on_hold", "dnf"],
      report_reason: [
        "spam",
        "harassment",
        "hate",
        "spoiler",
        "sexual",
        "violence",
        "misinformation",
        "other",
      ],
      report_status: ["open", "reviewing", "actioned", "dismissed"],
    },
  },
} as const
