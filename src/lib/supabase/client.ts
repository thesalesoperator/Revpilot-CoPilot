import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// No-op client for build time when env vars aren't available
function createBuildTimeClient(): SupabaseClient {
  const noopAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signUp: async () => ({ data: null, error: null }),
    signInWithPassword: async () => ({ data: null, error: null }),
    signOut: async () => ({ error: null }),
  }

  const noopFrom = () => ({
    select: () => ({
      eq: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
      }),
      single: () => Promise.resolve({ data: null, error: null }),
    }),
    insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    upsert: () => Promise.resolve({ error: null }),
  })

  return { auth: noopAuth, from: noopFrom } as unknown as SupabaseClient
}

export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env vars are missing (build time), return no-op client
  // This allows the build to complete without Supabase credentials
  // At runtime, the real env vars will be available and real client is created
  if (!supabaseUrl || !supabaseAnonKey) {
    return createBuildTimeClient()
  }

  // Create a fresh client each time (no caching)
  // This ensures we always use the real client at runtime
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
