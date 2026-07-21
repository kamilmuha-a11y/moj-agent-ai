import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// Server routes that use the service-role client (see lib/supabase-admin.ts)
// bypass RLS and must not trust a client-supplied userId directly — they
// verify it against this token instead. Attach as an Authorization header
// on any request to a route that scopes data by the logged-in user.
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}
