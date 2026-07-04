// Shared team-sync backend (Supabase). The anon key is a PUBLISHABLE key — it is
// designed to ship in client code and is safe to commit. Access is governed by
// the row-level-security policy on the `crm_state` table, not by key secrecy.
// Leave these empty to run the CRM in local-only mode (no team sync).
export const SUPABASE_URL = 'https://cookklodjtefuzlamnkk.supabase.co'
export const SUPABASE_ANON_KEY = ''
