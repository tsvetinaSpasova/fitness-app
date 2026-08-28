// Direct Supabase access for test setup/cleanup, using the same anon key and
// seeded credentials the app uses. All queries run under the signed-in user's
// RLS context, so tests can only touch data that user could touch anyway.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

let env: { url: string; anonKey: string } | null = null;

function loadEnv() {
  if (env) return env;
  const file = path.resolve(__dirname, "..", ".env.local");
  const vars: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) vars[m[1]] = m[2].trim();
  }
  env = {
    url: vars.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: vars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  if (!env.url || !env.anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY missing from .env.local");
  }
  return env;
}

// IMPORTANT: never call signOut() on these clients — Supabase signOut revokes
// ALL of the user's sessions, including the cached Playwright storage states.
// Just drop the client; the session expires on its own.
//
// Sessions are memoized per email for the whole run: Supabase rate-limits
// password sign-ins per IP (~30/5min), and the test run shares that budget
// with any manual logins the developer makes.
const sessions = new Map<string, Promise<SupabaseClient>>();

export function signInAs(email: string, password: string): Promise<SupabaseClient> {
  let session = sessions.get(email);
  if (!session) {
    session = (async () => {
      const { url, anonKey } = loadEnv();
      const supabase = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(`Could not sign in ${email}: ${error.message}`);
      return supabase;
    })();
    sessions.set(email, session);
  }
  return session;
}

/** The signed-in user's own id. */
export async function userId(db: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("No authenticated user on this client");
  return user.id;
}
