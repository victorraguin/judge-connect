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
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email!,
      profile: profile || undefined,
    }
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await authService.getCurrentUser()
        callback(user)
      } else {
        callback(null)
      }
    })
  },
}