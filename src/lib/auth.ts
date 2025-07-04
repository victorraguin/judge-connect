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
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.log('No authenticated user found:', error?.message)
      return null
    }

    console.log('Found authenticated user:', user.id, user.email)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('User profile query result:', { profile, profileError })

    // If profile doesn't exist, create it
    if (!profile && !profileError) {
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
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id)
      
      if (session?.user) {
        try {
          const user = await authService.getCurrentUser()
          console.log('Auth state change - user loaded:', user)
          callback(user)
        } catch (error) {
          console.error('Error loading user in auth state change:', error)
          callback(null)
        }
      } else {
        console.log('Auth state change - no session, setting user to null')
        callback(null)
      }
    })
  },
}