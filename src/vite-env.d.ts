/// <reference types="vite/client" />

/**
 * The build-time variables, typed.
 *
 * Only names beginning `VITE_` reach browser code — Vite's guardrail against
 * leaking a server secret by accident. Everything here is **inlined into the
 * compiled bundle**, not read at runtime, so every value below is visible to
 * anyone who views source. That is fine and expected for a publishable key,
 * which only identifies a project; Row Level Security is what actually decides
 * who may read and write.
 *
 * It is also exactly why a Supabase `sb_secret_...` key, or the Anthropic key,
 * must never appear here. Those live in Apps Script's Script Properties, where
 * the browser never sees them.
 *
 * All optional: every one of these services degrades to "switched off" rather
 * than to a white page when its variable is absent. See `supabaseConfigured`
 * and `clerkConfigured` for the pattern.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_APPS_SCRIPT_ENDPOINT?: string;
  readonly VITE_FEEDBACK_ENDPOINT?: string;
  readonly VITE_CONTACT_ENDPOINT?: string;
  readonly VITE_DECKS_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
