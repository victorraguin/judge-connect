import { supabase } from './supabase'
import type { Profile } from '../types/database'

export interface AuthUser {
  id: string
  email: string
  profile?: Profile
}

export const authService = {
  async signUp(email: string, password: string, fullName?: string) {
    console.log('Attempting to sign up with:', { email, fullName })
    
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
    console.log('Sign up successful:', data)
    return data
  },

  async signIn(email: string, password: string) {
    console.log('Attempting to sign in with:', email)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    console.log('Sign in successful:', data)
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.log('Error getting user:', error.message)
        return null
      }
    
      if (!user) {
        console.log('No authenticated user found')
        return null
      }

      console.log('Found authenticated user:', user.id, user.email)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('User profile query result:', { profile, profileError })

      // If profile doesn't exist, create it (but only if there's no error indicating it doesn't exist)
      if (!profile && profileError?.code === 'PGRST116') {
        console.log('No profile found, creating one...')
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || '',
            role: 'user',
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating profile:', createError)
          return {
            id: user.id,
            email: user.email!,
            profile: undefined,
          }
        } else {
          console.log('Profile created successfully:', newProfile)
          return {
            id: user.id,
            email: user.email!,
            profile: newProfile,
          }
        }
      }

      return {
        id: user.id,
        email: user.email!,
        profile: profile || undefined,
      }
    } catch (error) {
      console.error('Error in getCurrentUser:', error)
      return null
    }
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id)
      
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          // Add a small delay to ensure the session is fully established
          await new Promise(resolve => setTimeout(resolve, 100))
          const user = await authService.getCurrentUser()
          console.log('Auth state change - user loaded:', user)
          callback(user)
        } catch (error) {
          console.error('Error loading user in auth state change:', error)
          callback(null)
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('Auth state change - signed out')
        callback(null)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        try {
          const user = await authService.getCurrentUser()
          console.log('Auth state change - token refreshed, user loaded:', user)
          callback(user)
        } catch (error) {
          console.error('Error loading user after token refresh:', error)
          callback(null)
        }
      }
    })
  },
}