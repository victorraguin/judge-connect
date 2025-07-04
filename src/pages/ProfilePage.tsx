import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { User, Mail, Lock, Star, Award, Gift, Users, Camera, Save, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'

interface ProfileFormData {
  full_name: string
  email: string
}

interface PasswordFormData {
  current_password: string
  new_password: string
  confirm_password: string
}

interface UserStats {
  totalQuestions: number
  completedQuestions: number
  totalPoints: number
  averageRating: number
}

interface Reward {
  id: string
  name: string
  description: string
  points_required: number
  category: 'digital' | 'physical' | 'premium'
  available: boolean
  image_url?: string
}

const mockRewards: Reward[] = [
  {
    id: '1',
    name: 'Avatar Premium',
    description: 'Débloquez des avatars exclusifs pour votre profil',
    points_required: 100,
    category: 'digital',
    available: true,
  },
  {
    id: '2',
    name: 'Badge Collectionneur',
    description: 'Badge spécial pour les utilisateurs actifs',
    points_required: 250,
    category: 'digital',
    available: true,
  },
  {
    id: '3',
    name: 'Consultation Privée',
    description: '30 minutes de consultation privée avec un juge L3',
    points_required: 500,
    category: 'premium',
    available: true,
  },
  {
    id: '4',
    name: 'Booster Pack MTG',
    description: 'Booster pack Magic: The Gathering offert',
    points_required: 750,
    category: 'physical',
    available: false,
  },
]

const partners = [
  {
    name: 'Wizards of the Coast',
    description: 'Créateur officiel de Magic: The Gathering',
    logo: '🧙‍♂️',
  },
  {
    name: 'TCGPlayer',
    description: 'Marketplace de cartes Magic',
    logo: '🃏',
  },
  {
    name: 'MTGGoldfish',
    description: 'Analyses et prix des cartes',
    logo: '🐟',
  },
]

export function ProfilePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'rewards'>('profile')
  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [stats, setStats] = useState<UserStats>({
    totalQuestions: 0,
    completedQuestions: 0,
    totalPoints: 0,
    averageRating: 0,
  })

  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      full_name: user?.profile?.full_name || '',
      email: user?.email || '',
    },
  })

  const passwordForm = useForm<PasswordFormData>()

  useEffect(() => {
    if (user) {
      loadUserStats()
      profileForm.reset({
        full_name: user.profile?.full_name || '',
        email: user.email || '',
      })
    }
  }, [user])

  const loadUserStats = async () => {
    if (!user) return

    try {
      // Load user questions stats
      const { count: totalQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const { count: completedQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed')

      // TODO: Implement points and rating system
      setStats({
        totalQuestions: totalQuestions || 0,
        completedQuestions: completedQuestions || 0,
        totalPoints: 150, // Mock data
        averageRating: 4.8, // Mock data
      })
    } catch (error) {
      console.error('Error loading user stats:', error)
    }
  }

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!user) return

    try {
      setLoading(true)
      setError('')
      setMessage('')

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update email if changed
      if (data.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: data.email,
        })
        if (emailError) throw emailError
      }

      setMessage('Profil mis à jour avec succès')
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setPasswordLoading(true)
      setError('')
      setMessage('')

      const { error } = await supabase.auth.updateUser({
        password: data.new_password,
      })

      if (error) throw error

      setMessage('Mot de passe mis à jour avec succès')
      passwordForm.reset()
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setPasswordLoading(false)
    }
  }

  const redeemReward = async (reward: Reward) => {
    if (stats.totalPoints < reward.points_required) {
      setError('Vous n\'avez pas assez de points pour cette récompense')
      return
    }

    // TODO: Implement reward redemption
    setMessage(`Récompense "${reward.name}" échangée avec succès !`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8 container-mobile">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mon Profil</h1>
          <p className="text-gray-400">
            Gérez vos informations personnelles et vos récompenses
          </p>
        </div>

        {/* User Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                {user?.profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <button className="absolute -bottom-1 -right-1 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors">
                <Camera className="h-3 w-3" />
              </button>
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white">
                {user?.profile?.full_name || 'Utilisateur'}
              </h2>
              <p className="text-gray-400">{user?.email}</p>
              <div className="flex items-center space-x-4 mt-2">
                <Badge variant="info" size="sm">
                  <User className="h-3 w-3 mr-1" />
                  Membre depuis {new Date(user?.profile?.created_at || '').getFullYear()}
                </Badge>
                {user?.profile?.role === 'judge' && (
                  <Badge variant="judge-l1" size="sm">
                    <Star className="h-3 w-3 mr-1" />
                    Juge Certifié
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-400">{stats.totalPoints}</div>
                <div className="text-xs text-gray-400">Points</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{stats.completedQuestions}</div>
                <div className="text-xs text-gray-400">Questions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-800/30 p-1 rounded-lg">
          {[
            { id: 'profile', label: 'Profil', icon: User },
            { id: 'security', label: 'Sécurité', icon: Lock },
            { id: 'rewards', label: 'Récompenses', icon: Gift },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Messages */}
        {message && (
          <div className="bg-green-900/50 border border-green-700 text-green-400 px-4 py-3 rounded-lg mb-6">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Informations personnelles</h3>
            
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
              <Input
                label="Nom complet"
                {...profileForm.register('full_name', {
                  required: 'Le nom complet est requis',
                })}
                error={profileForm.formState.errors.full_name?.message}
                placeholder="Votre nom complet"
              />

              <Input
                label="Adresse email"
                type="email"
                {...profileForm.register('email', {
                  required: 'L\'email est requis',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Email invalide',
                  },
                })}
                error={profileForm.formState.errors.email?.message}
                placeholder="votre@email.com"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Questions posées
                  </label>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-white">{stats.totalQuestions}</div>
                    <div className="text-sm text-gray-400">Total</div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Note moyenne
                  </label>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-yellow-400">{stats.averageRating}/5</div>
                    <div className="text-sm text-gray-400">Satisfaction</div>
                  </div>
                </div>
              </div>

              <Button type="submit" loading={loading} className="w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder les modifications
              </Button>
            </form>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Sécurité du compte</h3>
            
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
              <div className="relative">
                <Input
                  label="Nouveau mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  {...passwordForm.register('new_password', {
                    required: 'Le nouveau mot de passe est requis',
                    minLength: {
                      value: 6,
                      message: 'Le mot de passe doit contenir au moins 6 caractères',
                    },
                  })}
                  error={passwordForm.formState.errors.new_password?.message}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Input
                label="Confirmer le nouveau mot de passe"
                type={showPassword ? 'text' : 'password'}
                {...passwordForm.register('confirm_password', {
                  required: 'La confirmation est requise',
                  validate: (value) =>
                    value === passwordForm.watch('new_password') || 'Les mots de passe ne correspondent pas',
                })}
                error={passwordForm.formState.errors.confirm_password?.message}
                placeholder="••••••••"
              />

              <Button type="submit" loading={passwordLoading} className="w-full sm:w-auto">
                <Lock className="h-4 w-4 mr-2" />
                Mettre à jour le mot de passe
              </Button>
            </form>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="space-y-8">
            {/* Points Summary */}
            <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Mes Points</h3>
                <div className="text-3xl font-bold text-blue-400">{stats.totalPoints}</div>
              </div>
              <p className="text-gray-300 mb-4">
                Gagnez des points en posant des questions et en aidant la communauté
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-400">+10</div>
                  <div className="text-gray-400">Question posée</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-blue-400">+25</div>
                  <div className="text-gray-400">Question publique</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-purple-400">+50</div>
                  <div className="text-gray-400">Excellente note</div>
                </div>
              </div>
            </div>

            {/* Available Rewards */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Récompenses disponibles</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mockRewards.map((reward) => (
                  <div
                    key={reward.id}
                    className={`border rounded-lg p-4 transition-all ${
                      reward.available
                        ? 'border-gray-600 hover:border-blue-500'
                        : 'border-gray-700 opacity-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-white">{reward.name}</h4>
                      <Badge
                        variant={
                          reward.category === 'premium'
                            ? 'warning'
                            : reward.category === 'physical'
                            ? 'success'
                            : 'info'
                        }
                        size="sm"
                      >
                        {reward.category === 'premium' && '⭐'}
                        {reward.category === 'physical' && '📦'}
                        {reward.category === 'digital' && '💎'}
                        {reward.points_required} pts
                      </Badge>
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-4">{reward.description}</p>
                    
                    <Button
                      size="sm"
                      variant={stats.totalPoints >= reward.points_required ? 'primary' : 'outline'}
                      disabled={!reward.available || stats.totalPoints < reward.points_required}
                      onClick={() => redeemReward(reward)}
                      className="w-full"
                    >
                      {stats.totalPoints >= reward.points_required ? 'Échanger' : 'Pas assez de points'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Partners */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Nos Partenaires</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {partners.map((partner, index) => (
                  <div key={index} className="text-center p-4 border border-gray-700 rounded-lg">
                    <div className="text-3xl mb-2">{partner.logo}</div>
                    <h4 className="font-semibold text-white mb-1">{partner.name}</h4>
                    <p className="text-gray-400 text-sm">{partner.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}