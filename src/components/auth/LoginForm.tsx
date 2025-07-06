// src/components/auth/LoginForm.tsx
import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Sparkles } from 'lucide-react'

interface LoginFormData {
  email: string
  password: string
}

export function LoginForm() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true)
      setError('')
      console.log('Login form submission:', data.email)
      
      await signIn(data.email, data.password)
      
      // Reset form on success
      reset()
      
      console.log('Login successful, navigating...')
      navigate('/')
    } catch (err: any) {
      console.error('Login error:', err)
      
      // Handle specific error types
      if (err.message?.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect')
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Veuillez confirmer votre email avant de vous connecter')
      } else if (err.message?.includes('Too many requests')) {
        setError('Trop de tentatives de connexion. Veuillez réessayer plus tard.')
      } else {
        setError(err.message || 'Une erreur est survenue lors de la connexion')
      }
    } finally {
      setLoading(false)
    }
  }

  // Clear error when user starts typing
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Sparkles className="h-12 w-12 text-blue-400" />
              <div className="absolute inset-0 bg-blue-400 rounded-full opacity-20 blur-sm"></div>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            🔑 Connexion à Juudge!
          </h2>
          <p className="text-gray-300">
            Prêt à rejoindre la partie ? 🎮<br />
            Ou{' '}
            <Link to="/register" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
              créez votre compte de joueur
            </Link>
          </p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-400 px-4 py-3 rounded-md">
                {error}
              </div>
            )}
            
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              {...register('email', {
                required: 'Email requis',
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: 'Email invalide',
                },
              })}
              error={errors.email?.message}
              placeholder="votre@email.com"
              disabled={loading}
            />
            
            <Input
              label="Mot de passe"
              type="password"
              autoComplete="current-password"
              {...register('password', {
                required: 'Mot de passe requis',
                minLength: {
                  value: 6,
                  message: 'Le mot de passe doit contenir au moins 6 caractères',
                },
              })}
              error={errors.password?.message}
              placeholder="••••••••"
              disabled={loading}
            />

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              size="lg"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}