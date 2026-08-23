/**
 * Hand-written to match supabase/migrations/20260822174320_init_schema.sql.
 * Once a real project is linked, regenerate with:
 *   supabase gen types typescript --linked > lib/supabase/database.types.ts
 * and diff against this file rather than blindly overwriting, since a few
 * JSON columns here are typed against lib/schemas/* on purpose (see notes).
 */
import type { Link, ResumeContent } from "@/lib/schemas/resume";
import type { DocumentContent } from "@/lib/schemas/document";
import type { ChangeExplanation } from "@/lib/schemas/tailoring";

/**
 * `resumes.content` holds either the new freeform document (going forward)
 * or the legacy typed ResumeContent (rows not yet opened in the new editor)
 * — deliberately no DB migration for this, see lib/documentConversion.ts.
 */
type ResumeContentColumn = DocumentContent | ResumeContent;

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Relationships: [];
        Row: {
          id: string;
          full_name: string | null;
          headline: string | null;
          avatar_url: string | null;
          phone: string | null;
          location: string | null;
          links: Link[];
          default_resume_id: string | null;
          onboarding_completed_at: string | null;
          gemini_key_ciphertext: string | null;
          gemini_key_last4: string | null;
          gemini_key_status: "not_configured" | "valid" | "invalid";
          gemini_key_updated_at: string | null;
          gemini_key_validated_at: string | null;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      job_descriptions: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          raw_text: string;
          company: string | null;
          job_title: string | null;
          location: string | null;
          source_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["job_descriptions"]["Row"]> & {
          user_id: string;
          raw_text: string;
        };
        Update: Partial<Database["public"]["Tables"]["job_descriptions"]["Row"]>;
      };
      resumes: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          kind: "master" | "tailored";
          title: string;
          content: ResumeContentColumn;
          status: "draft" | "archived";
          is_default: boolean;
          version: number;
          source_resume_id: string | null;
          source_resume_title_snapshot: string | null;
          job_description_id: string | null;
          job_title_snapshot: string | null;
          job_company_snapshot: string | null;
          tailoring_session_id: string | null;
          original_file_storage_path: string | null;
          original_file_name: string | null;
          pdf_storage_path: string | null;
          pdf_generated_at: string | null;
          low_confidence_fields: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["resumes"]["Row"]> & {
          id: string;
          user_id: string;
          kind: "master" | "tailored";
          title: string;
          content: ResumeContentColumn;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["resumes"]["Row"], "content">> & {
          content?: ResumeContentColumn;
        };
      };
      tailoring_sessions: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          source_resume_id: string | null;
          source_resume_title_snapshot: string | null;
          job_description_id: string | null;
          result_resume_id: string | null;
          result_resume_title_snapshot: string | null;
          status: "pending" | "analyzing" | "generating" | "completed" | "failed";
          error_code:
            | "missing_api_key"
            | "invalid_api_key"
            | "invalid_jd"
            | "source_not_found"
            | "gemini_error"
            | "schema_validation_failed"
            | "fabrication_detected"
            | "timeout"
            | "unknown"
            | null;
          error_message: string | null;
          change_explanations: ChangeExplanation[] | null;
          gemini_model: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tailoring_sessions"]["Row"]> & { user_id: string };
        Update: Partial<Omit<Database["public"]["Tables"]["tailoring_sessions"]["Row"], "change_explanations">> & {
          change_explanations?: ChangeExplanation[] | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
