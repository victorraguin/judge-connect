import React, { createContext, useContext, useEffect, useState } from 'react'
import { authService, type AuthUser } from '../lib/auth'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial user
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth context...')
        const user = await authService.getCurrentUser()
        console.log('Initial user loaded:', user)
        setUser(user)
      } catch (error) {
        console.error('Error initializing auth:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      console.log('Auth context received user update:', user)
      setUser(user)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('AuthContext signIn called')
      await authService.signIn(email, password)
      console.log('SignIn result:', result)
      
      // Wait a bit for the auth state change to trigger
      setTimeout(async () => {
        const user = await authService.getCurrentUser()
        console.log('User after sign in:', user)
        setUser(user)
      }, 100)
    } catch (error) {
      console.error('SignIn error in context:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      console.log('AuthContext signUp called')
      await authService.signUp(email, password, fullName)
      console.log('SignUp result:', result)
      
      // Wait a bit for the auth state change to trigger
      setTimeout(async () => {
        const user = await authService.getCurrentUser()
        console.log('User after sign up:', user)
        setUser(user)
      }, 100)
    } catch (error) {
      console.error('SignUp error in context:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      console.log('AuthContext signOut called')
      await authService.signOut()
      setUser(null)
    } catch (error) {
      console.error('SignOut error in context:', error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}