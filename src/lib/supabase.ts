// Supabase client (accounts + database). Active only when both env vars are set:
//   VITE_SUPABASE_URL              e.g. https://abcd1234.supabase.co
//   VITE_SUPABASE_PUBLISHABLE_KEY  starts with sb_publishable_ (safe to expose; RLS protects data)
// Without them the app falls back to browser storage, so local tinkering still works.

const env = ((import.meta as any).env ?? {}) as Record<string, string | undefined>;
export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? "";
export const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? "";
export const supabaseEnabled = !!(SUPABASE_URL && SUPABASE_KEY);

let clientPromise: Promise<any> | null = null;

/** Lazily loads supabase-js so builds without Supabase never pull it in. */
export function getSupabase(): Promise<any> {
  if (!supabaseEnabled) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      }),
    );
  }
  return clientPromise;
}

/** Current user's access token, sent to /api/ai so the server can check who is asking. */
export async function getAccessToken(): Promise<string | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data?.session?.access_token ?? null;
}

/** Turns Supabase auth errors into plain-language messages. */
export function authErrorText(err: any): string {
  const msg = String(err?.message ?? "").toLowerCase();
  const code = String(err?.code ?? "");
  if (code === "invalid_credentials" || msg.includes("invalid login")) return "That email and password don’t match. Check both and try again.";
  if (code === "user_already_exists" || msg.includes("already registered")) return "An account with this email already exists. Sign in instead.";
  if (code === "weak_password" || msg.includes("password should")) return "Choose a longer password: at least 8 characters.";
  if (code === "email_not_confirmed" || msg.includes("not confirmed")) return "This email hasn’t been confirmed yet. Check your inbox for the confirmation link.";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || msg.includes("rate limit")) return "Too many attempts. Wait a few minutes and try again.";
  if (msg.includes("email address") && msg.includes("invalid")) return "That email address doesn’t look right.";
  if (msg.includes("not authorized")) return "We can’t send email to this address yet. Ask the NextCup team to reset your password.";
  if (msg.includes("fetch") || msg.includes("network")) return "Can’t reach the server. Check your connection and try again.";
  return err?.message ? String(err.message) : "Something went wrong. Try again.";
}
