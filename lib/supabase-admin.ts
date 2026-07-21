import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key, which bypasses Row Level
// Security. RLS (see lekcja_07/w3_add_user_id_and_rls.sql) protects direct
// browser access via the public anon key, but API routes run with no user
// session/JWT attached, so the anon-key client would see zero rows once RLS
// is on. Route handlers stay safe because they still scope every query by
// the trusted userId passed from the authenticated client.
// NEVER import this file from a "use client" component — the service role
// key must never reach the browser bundle.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
