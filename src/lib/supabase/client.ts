import { createBrowserClient } from '@supabase/ssr';

// Create a Supabase client with auto refresh disabled because we inject a
// long-lived static session for no-login mode. This prevents unwanted calls to
// the refresh_token endpoint in environments where refresh is not needed.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: true,
      },
    },
  );
}
