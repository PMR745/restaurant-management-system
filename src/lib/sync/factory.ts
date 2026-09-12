import type { AdapterKind, SyncAdapter } from "./adapter";

/**
 * `NEXT_PUBLIC_*` is inlined at build time, so the branch is decided per
 * deployment rather than per request — which is exactly what we want on
 * Vercel (Preview can run local, Production can run Supabase).
 *
 * Both env vars must be present and the URL must look real; a half-configured
 * project silently failing to connect is worse than cleanly running local.
 */
export function pickAdapterKind(): AdapterKind {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key && url.startsWith("https://") ? "supabase" : "local";
}

export async function createAdapter(): Promise<SyncAdapter> {
  if (pickAdapterKind() === "supabase") {
    // Dynamic import keeps @supabase/supabase-js out of the bundle entirely
    // when the app is running in local mode.
    const { SupabaseAdapter } = await import("./supabase-adapter");
    return new SupabaseAdapter();
  }
  const { LocalAdapter } = await import("./local-adapter");
  return new LocalAdapter();
}
