// src/components/auth/AuthGuard.tsx
import React, { useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../lib/auth'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading, refreshAuth } = useAuth()

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = async () => {
      try {
        const isAuthenticated = await authService.isAuthenticated()
        if (!isAuthenticated && user) {
          // User state is out of sync, refresh
          await refreshAuth()
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      }
    }

    checkAuth()
  }, [user, refreshAuth])

  useEffect(() => {
    // Listen for storage changes (user logs out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'supabase.auth.token' && e.newValue === null) {
        // Token was removed, refresh auth state
        refreshAuth()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [refreshAuth])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Vérification de l'authentification...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Higher-order component for pages that require authentication
export function withAuth<T extends object>(Component: React.ComponentType<T>) {
  return function AuthenticatedComponent(props: T) {
    const { user, loading } = useAuth()

    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Chargement...</p>
          </div>
        </div>
      )
    }

    if (!user) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Accès non autorisé</h1>
            <p className="text-gray-400 mb-6">Vous devez être connecté pour accéder à cette page.</p>
            <a
              href="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Se connecter
            </a>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}