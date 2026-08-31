// Server-side Supabase client with service role key - bypasses RLS.
// Use this for admin operations in server functions and server routes only.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }
    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function tryCreateAdminClient() {
  const SUPABASE_URL = process.env['SUPABASE_URL'];
  const SUPABASE_SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_SERVICE_ROLE_KEY ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
    ].join(', ');
    console.warn(`[Supabase Admin] Missing env var(s): ${missing}. Admin features will be unavailable.`);
    return null;
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { fetch: createSupabaseFetch(SUPABASE_SERVICE_ROLE_KEY) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

let _client: ReturnType<typeof createClient<Database>> | null | undefined;

function getAdminClient() {
  if (_client === undefined) _client = tryCreateAdminClient();
  return _client;
}

// Proxy that returns null-safe access — callers must check for null
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_, prop, receiver) {
    const client = getAdminClient();
    if (!client) {
      // Return a function that throws a clear error for any method call
      if (typeof prop === 'string') {
        return () => {
          throw new Error(
            'Admin database unavailable. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your Vercel environment variables, then redeploy.',
          );
        };
      }
      return undefined;
    }
    return Reflect.get(client, prop, receiver);
  },
});

/** Returns true if the admin client is properly configured */
export function isAdminClientAvailable(): boolean {
  return getAdminClient() !== null;
}
