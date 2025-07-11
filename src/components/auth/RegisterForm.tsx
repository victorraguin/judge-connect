import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Sparkles } from 'lucide-react'

interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
}

export function RegisterForm() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>()

  const password = watch('password')

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setLoading(true)
      setError('')
      await signUp(data.email, data.password, data.fullName)
      navigate('/')
    } catch (err: any) {
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
            🚀 Rejoindre Juudge!
          </h2>
          <p className="text-gray-300">
            Bienvenue dans la communauté ! 🎉<br />
            Ou{' '}
            <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
              connectez-vous si vous avez déjà un compte
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
              label="Nom complet"
              {...register('fullName', {
                required: 'Nom complet requis',
              })}
              error={errors.fullName?.message}
              placeholder="Votre nom complet"
            />
            
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
            />
            
            <Input
              label="Mot de passe"
              type="password"
              {...register('password', {
                required: 'Mot de passe requis',
                minLength: {
                  value: 6,
                  message: 'Le mot de passe doit contenir au moins 6 caractères',
                },
              })}
              error={errors.password?.message}
              placeholder="••••••••"
            />
            
            <Input
              label="Confirmer le mot de passe"
              type="password"
              {...register('confirmPassword', {
                required: 'Confirmation du mot de passe requise',
                validate: (value) =>
                  value === password || 'Les mots de passe ne correspondent pas',
              })}
              error={errors.confirmPassword?.message}
              placeholder="••••••••"
            />

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              size="lg"
            >
              Créer le compte
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}