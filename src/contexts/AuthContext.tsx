// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authService, type AuthUser } from '../lib/auth'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
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
  const [mounted, setMounted] = useState(false)

  // Function to refresh auth state
  const refreshAuth = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Error refreshing auth:', error)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    console.log('Initializing auth context...')
    
    const initializeAuth = async () => {
      try {
        // Get initial user
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
        
        // Set up auth state listener
        const { data: { subscription } } = authService.onAuthStateChange((user) => {
          console.log('Auth state changed:', user ? 'User logged in' : 'User logged out')
          setUser(user)
        })

        return () => {
          console.log('Cleaning up auth subscription')
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    const cleanup = initializeAuth()
    
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.())
    }
  }, [])

  // Set up periodic session refresh to prevent expiration
  useEffect(() => {
    if (!mounted || !user) return

    const interval = setInterval(async () => {
      try {
        console.log('Refreshing session...')
        await authService.refreshSession()
      } catch (error) {
        console.error('Session refresh failed:', error)
        // If refresh fails, sign out the user
        await signOut()
      }
    }, 15 * 60 * 1000) // Refresh every 15 minutes

    return () => clearInterval(interval)
  }, [mounted, user])

  const signIn = async (email: string, password: string) => {
    console.log('AuthContext signIn called')
    try {
      await authService.signIn(email, password)
      // Don't manually set user here, let the auth state change handler do it
    } catch (error) {
      console.error('SignIn error:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    console.log('AuthContext signUp called')
    try {
      await authService.signUp(email, password, fullName)
      // Don't manually set user here, let the auth state change handler do it
    } catch (error) {
      console.error('SignUp error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await authService.signOut()
      setUser(null)
    } catch (error) {
      console.error('SignOut error:', error)
      // Even if signOut fails, clear the local user state
      setUser(null)
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}