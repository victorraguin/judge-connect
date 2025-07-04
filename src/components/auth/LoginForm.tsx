import React, { useState } from 'react'
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
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>()

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true)
      setError('')
      console.log('Login form submission:', data.email)
      await signIn(data.email, data.password)
      console.log('Login successful, navigating to home')
      
      // Wait a bit for the user state to update before navigating
      setTimeout(() => {
        navigate('/')
      }, 200)
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

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
            Connexion à MTG Judge
          </h2>
          <p className="text-gray-300">
            Ou{' '}
            <Link to="/register" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
              créez un nouveau compte
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
              {...register('email', {
                required: 'Email requis',
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: 'Email invalide',
                },
              })}
              error={errors.email?.message}
              placeholder="votre@email.com"
              autoComplete="email"
            />
            
            <Input
              label="Mot de passe"
              type="password"
              {...register('password', {
                required: 'Mot de passe requis',
              })}
              error={errors.password?.message}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              size="lg"
            >
              Se connecter
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}