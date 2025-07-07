// src/lib/auth.ts
import { supabase } from './supabase'
import type { Profile } from '../types/database'

export interface AuthUser {
  id: string
  email: string
  profile?: Profile
}

export const authService = {
  async signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) throw error
    return data
  },

  async signIn(email: string, password: string) {
    console.log('Attempting to sign in with:', email)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    console.log('Sign in successful:', data.user?.id)
    
    // Force session refresh to ensure we have the latest session
    const { error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    
    return data
  },

  async signOut() {
    console.log('Signing out...')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    // Clear any cached user data
    localStorage.removeItem('supabase.auth.token')
    sessionStorage.clear()
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      // First try to get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        throw sessionError
      }
      
      if (!session?.user) {
        console.log('No active session found')
        return null
      }

      // Verify the user is still valid by making an authenticated request
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('User verification error:', userError)
        // If we can't verify the user, sign them out
        await this.signOut()
        return null
      }

      if (!user) {
        console.log('User verification failed')
        return null
      }

      // Get the user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        // Don't throw error for profile issues, just log it
      }

      return {
        id: user.id,
        email: user.email!,
        profile: profile || undefined,
      }
    } catch (error) {
      console.error('getCurrentUser error:', error)
      return null
    }
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id)
      
      try {
        if (event === 'SIGNED_OUT' || !session?.user) {
          callback(null)
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const user = await authService.getCurrentUser()
          callback(user)
          return
        }

        // For other events, get current user
        const user = await authService.getCurrentUser()
        callback(user)
      } catch (error) {
        console.error('Auth state change error:', error)
        callback(null)
      }
    })
  },

  // Add method to refresh session manually
  async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      return data
    } catch (error) {
      console.error('Session refresh error:', error)
      throw error
    }
  },

  // Add method to check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return !!session?.user
    } catch {
      return false
    }
  }
}