import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key, which bypasses Row Level
// Security. RLS (see lekcja_07/w3_add_user_id_and_rls.sql) protects direct
// browser access via the public anon key, but API routes run with no user
// session/JWT attached, so the anon-key client would see zero rows once RLS
// is on.
// NEVER import this file from a "use client" component — the service role
// key must never reach the browser bundle.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Because supabaseAdmin bypasses RLS, route handlers must NEVER scope a
// query by a userId taken straight from the request body — the caller
// fully controls that value and could pass someone else's id to read or
// overwrite their data. Verify the caller's real Supabase session instead
// (the access token proves who they are; the server decides the userId).
export async function getVerifiedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
