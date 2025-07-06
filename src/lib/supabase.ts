// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Automatically refresh the session when it expires
    autoRefreshToken: true,
    // Persist the session in localStorage
    persistSession: true,
    // Detect session from URL on SSR
    detectSessionInUrl: true,
    // Use localStorage for session storage
    storage: window.localStorage,
    // Configure session storage options
    storageKey: 'supabase.auth.token',
    // Enable debug mode in development
    debug: import.meta.env.DEV,
  },
  // Global options
  global: {
    headers: {
      'x-application-name': 'MTG-Judge-Platform',
    },
  },
  // Realtime options
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})