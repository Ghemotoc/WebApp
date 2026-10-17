/**
 * Types for the environment variables Vite puts into `import.meta.env` (story S1-E1-01).
 *
 * Who reads them: src/config/brand.ts (VITE_BRAND_*), and later the Supabase client (VITE_SUPABASE_*).
 * Every VITE_ variable is public: it ends up in the browser bundle, so never add a secret here.
 * The example values live in .env.example.
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Product name; empty means today's value from src/config/brand.ts. */
  readonly VITE_BRAND_NAME?: string;
  /** Website domain without "https://". */
  readonly VITE_BRAND_SITE_DOMAIN?: string;
  /** Contact email address. */
  readonly VITE_BRAND_CONTACT_EMAIL?: string;
  /** Support email address. */
  readonly VITE_BRAND_SUPPORT_EMAIL?: string;
  /** Social handle with the leading "@". */
  readonly VITE_BRAND_SOCIAL_HANDLE?: string;
  /** Company name for the footer line "An app by …". */
  readonly VITE_BRAND_COMPANY_NAME?: string;
  /** "true" includes the /design page in a build (staging only, decided 17 Oct 2026). */
  readonly VITE_SHOW_DESIGN_PAGE?: string;
  /** Supabase API address (local: printed by `npx supabase start`). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase public anon key. Never the service role key (CLAUDE.md rule 2). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
