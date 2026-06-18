export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          document: string | null;
          email: string | null;
          phone: string | null;
          city: string | null;
          state: string | null;
          segment: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          document?: string | null;
          email?: string | null;
          phone?: string | null;
          city?: string | null;
          state?: string | null;
          segment?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['companies']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          company_id: string | null;
          name: string;
          email: string;
          role: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id: string;
          company_id?: string | null;
          name: string;
          email: string;
          role?: string;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      contacts: {
        Row: {
          id: string;
          company_id: string;
          owner_id: string | null;
          name: string;
          phone: string;
          email: string | null;
          city: string | null;
          state: string | null;
          origin: string | null;
          temperature: string;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          owner_id?: string | null;
          name: string;
          phone: string;
          email?: string | null;
          city?: string | null;
          state?: string | null;
          origin?: string | null;
          temperature?: string;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>;
      };
      opportunities: {
        Row: {
          id: string;
          company_id: string;
          contact_id: string;
          pipeline_id: string | null;
          stage_id: string | null;
          owner_id: string | null;
          title: string;
          value: number;
          temperature: string;
          status: string;
          expected_close_date: string | null;
          product_interest: string | null;
          lost_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          contact_id: string;
          pipeline_id?: string | null;
          stage_id?: string | null;
          owner_id?: string | null;
          title: string;
          value?: number;
          temperature?: string;
          status?: string;
          expected_close_date?: string | null;
          product_interest?: string | null;
          lost_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['opportunities']['Insert']>;
      };
      tasks: {
        Row: {
          id: string;
          company_id: string;
          contact_id: string | null;
          opportunity_id: string | null;
          owner_id: string | null;
          title: string;
          description: string | null;
          type: string;
          priority: string;
          due_at: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          contact_id?: string | null;
          opportunity_id?: string | null;
          owner_id?: string | null;
          title: string;
          description?: string | null;
          type?: string;
          priority?: string;
          due_at?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
      };
      quick_messages: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          category: string;
          content: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          category: string;
          content: string;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['quick_messages']['Insert']>;
      };
      activity_logs: {
        Row: {
          id: string;
          company_id: string;
          contact_id: string | null;
          opportunity_id: string | null;
          user_id: string | null;
          type: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          contact_id?: string | null;
          opportunity_id?: string | null;
          user_id?: string | null;
          type: string;
          description: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['activity_logs']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
