// Hand-written to match supabase/migrations/0001_init.sql.
// If you install the Supabase CLI later, this can be replaced with
// `supabase gen types typescript --linked > src/lib/supabase/types.ts`.

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "coach" | "client";
          name: string;
          email: string;
          avatar_url: string | null;
          goal: string | null;
          joined_at: string;
          last_active: string | null;
          assigned_programme_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role: "coach" | "client";
          name: string;
          email: string;
          avatar_url?: string | null;
          goal?: string | null;
          joined_at?: string;
          last_active?: string | null;
          assigned_programme_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          name: string;
          muscle_group: string;
          video_url: string | null;
          instructions: string | null;
          alternatives: string[] | null;
          requires_weight: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          muscle_group: string;
          video_url?: string | null;
          instructions?: string | null;
          alternatives?: string[] | null;
          requires_weight?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exercises"]["Insert"]>;
        Relationships: [];
      };
      programmes: {
        Row: {
          id: string;
          name: string;
          phase: number | null;
          client_id: string | null;
          original_programme_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phase?: number | null;
          client_id?: string | null;
          original_programme_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["programmes"]["Insert"]>;
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          programme_id: string;
          name: string;
          order_num: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          programme_id: string;
          name: string;
          order_num?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workouts"]["Insert"]>;
        Relationships: [];
      };
      workout_exercises: {
        Row: {
          id: string;
          workout_id: string;
          exercise_id: string;
          position: number;
          sets: number;
          reps: number;
          rest_seconds: number | null;
          notes: string | null;
          target_weight_kg: number | null;
          set_details: { reps: number; weightKg?: number }[] | null;
        };
        Insert: {
          id?: string;
          workout_id: string;
          exercise_id: string;
          position?: number;
          sets: number;
          reps: number;
          rest_seconds?: number | null;
          notes?: string | null;
          target_weight_kg?: number | null;
          set_details?: { reps: number; weightKg?: number }[] | null;
        };
        Update: Partial<Database["public"]["Tables"]["workout_exercises"]["Insert"]>;
        Relationships: [];
      };
      workout_logs: {
        Row: {
          id: string;
          client_id: string;
          workout_id: string | null;
          workout_name: string;
          programme_name: string;
          status: "completed" | "in_progress";
          logged_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          workout_id?: string | null;
          workout_name: string;
          programme_name: string;
          status: "completed" | "in_progress";
          logged_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_logs"]["Insert"]>;
        Relationships: [];
      };
      exercise_logs: {
        Row: {
          id: string;
          workout_log_id: string;
          exercise_id: string;
        };
        Insert: {
          id?: string;
          workout_log_id: string;
          exercise_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["exercise_logs"]["Insert"]>;
        Relationships: [];
      };
      set_logs: {
        Row: {
          id: string;
          exercise_log_id: string;
          set_number: number;
          reps: number;
          weight_kg: number | null;
        };
        Insert: {
          id?: string;
          exercise_log_id: string;
          set_number: number;
          reps: number;
          weight_kg?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["set_logs"]["Insert"]>;
        Relationships: [];
      };
      measurements: {
        Row: {
          id: string;
          client_id: string;
          date: string;
          weight_kg: number | null;
          hips_cm: number | null;
          waist_cm: number | null;
          chest_cm: number | null;
          arms_cm: number | null;
          legs_cm: number | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          date: string;
          weight_kg?: number | null;
          hips_cm?: number | null;
          waist_cm?: number | null;
          chest_cm?: number | null;
          arms_cm?: number | null;
          legs_cm?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["measurements"]["Insert"]>;
        Relationships: [];
      };
      check_ins: {
        Row: {
          id: string;
          client_id: string;
          date: string;
          energy: number;
          sleep: number;
          nutrition: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          date: string;
          energy: number;
          sleep: number;
          nutrition: number;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["check_ins"]["Insert"]>;
        Relationships: [];
      };
      progress_photos: {
        Row: {
          id: string;
          client_id: string;
          date: string;
          url: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          date: string;
          url: string;
        };
        Update: Partial<Database["public"]["Tables"]["progress_photos"]["Insert"]>;
        Relationships: [];
      };
      coach_notes: {
        Row: {
          id: string;
          client_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["coach_notes"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      copy_programme_for_client: {
        Args: { template_id: string; target_client_id: string };
        Returns: string;
      };
      is_coach: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
  };
};
