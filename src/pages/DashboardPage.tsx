import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, Crown, Star, Clock, TrendingUp, Camera, Image as ImageIcon, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { QuestionCard } from '../components/questions/QuestionCard'
import { useForm } from 'react-hook-form'
import type { Question } from '../types/database'

interface DashboardStats {
  myQuestions: number
  pendingQuestions: number
  completedQuestions: number
  totalPoints: number
}

interface QuestionFormData {
  title: string
  content: string
  category: string
  image_url?: string
  is_public: boolean
}

const categories = [
  'Règles générales',
  'Interactions de cartes',
  'Timing et priorité',
  'Zones de jeu',
  'Types de cartes',
  'Mots-clés et capacités',
  'Combat',
  'Tournois et REL',
  'Formats spécifiques',
  'Autre',
]

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    myQuestions: 0,
    pendingQuestions: 0,
    completedQuestions: 0,
    totalPoints: 0,
  })
  const [recentQuestions, setRecentQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuestionFormData>({
    defaultValues: {
      is_public: false,
    },
  })

  const isPublic = watch('is_public')

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Load user's questions count
      const { count: myQuestionsCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Load pending questions count
      const { count: pendingCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['waiting_for_judge', 'assigned', 'in_progress'])

      // Load completed questions count
      const { count: completedCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed')

      // Load recent questions
      const { data: questionsData } = await supabase
        .from('questions')
        .select(`
          *,
          user:profiles!questions_user_id_fkey(id, full_name, email),
          assigned_judge:profiles!questions_assigned_judge_id_fkey(id, full_name, email)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        myQuestions: myQuestionsCount || 0,
        pendingQuestions: pendingCount || 0,
        completedQuestions: completedCount || 0,
        totalPoints: 0, // TODO: Implement points system
      })

      setRecentQuestions(questionsData || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // In a real app, you would upload to a service like Supabase Storage
      // For now, we'll create a preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setImagePreview(result)
        setValue('image_url', result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImagePreview(null)
    setValue('image_url', '')
  }

  const onSubmit = async (data: QuestionFormData) => {
    if (!user) return

    try {
      setSubmitting(true)
      setError('')

      const { error: insertError } = await supabase
        .from('questions')
        .insert({
          user_id: user.id,
          title: data.title,
          content: data.content,
          category: data.category,
          image_url: data.image_url || null,
          is_public: data.is_public,
        })

      if (insertError) throw insertError

      reset()
      setImagePreview(null)
      setShowQuestionForm(false)
      loadDashboardData()
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Chargement de votre dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 container-mobile">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Bonjour, {user?.profile?.full_name?.split(' ')[0] || 'Planeswalker'} 👋
          </h1>
          <p className="text-gray-400">
            Gérez vos questions Magic: The Gathering et suivez vos progrès
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-blue-500/20 rounded-lg">
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm text-gray-400">Mes questions</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.myQuestions}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-yellow-500/20 rounded-lg">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm text-gray-400">En attente</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.pendingQuestions}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-green-500/20 rounded-lg">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm text-gray-400">Résolues</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.completedQuestions}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-purple-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm text-gray-400">Points</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.totalPoints}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => setShowQuestionForm(!showQuestionForm)}
              size="lg"
              className="flex-1 sm:flex-none"
            >
              <Plus className="h-5 w-5 mr-2" />
              {showQuestionForm ? 'Annuler' : 'Nouvelle question'}
            </Button>
            <Button variant="outline" size="lg" className="flex-1 sm:flex-none">
              <MessageSquare className="h-5 w-5 mr-2" />
              Voir toutes mes questions
            </Button>
          </div>
        </div>

        {/* Question Form */}
        {showQuestionForm && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-6">Poser une nouvelle question</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-400 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              <Input
                label="Titre de la question"
                {...register('title', {
                  required: 'Le titre est requis',
                  maxLength: {
                    value: 200,
                    message: 'Le titre ne peut pas dépasser 200 caractères',
                  },
                })}
                error={errors.title?.message}
                placeholder="Ex: Interaction entre Counterspell et Split Second"
              />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Catégorie
                </label>
                <select
                  {...register('category', { required: 'La catégorie est requise' })}
                  className="block w-full rounded-lg bg-gray-800 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base min-h-[44px] px-4 py-3"
                >
                  <option value="">Sélectionnez une catégorie</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-400">{errors.category.message}</p>
                )}
              </div>

              <Textarea
                label="Description détaillée"
                rows={6}
                {...register('content', {
                  required: 'La description est requise',
                  minLength: {
                    value: 20,
                    message: 'La description doit contenir au moins 20 caractères',
                  },
                })}
                error={errors.content?.message}
                helperText="Décrivez votre situation en détail : cartes impliquées, étapes du jeu, contexte..."
                placeholder="Décrivez votre question avec le maximum de détails possible..."
              />

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Image (optionnel)
                </label>
                
                {!imagePreview ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex-1 cursor-pointer">
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                        <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-400 mb-1">
                          Cliquez pour sélectionner une image
                        </p>
                        <p className="text-xs text-gray-500">
                          JPG, PNG jusqu'à 10MB
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    
                    {/* Mobile Camera Button */}
                    <div className="sm:hidden">
                      <label className="cursor-pointer">
                        <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                          <Camera className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                          <p className="text-xs text-gray-400">Appareil photo</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-2">
                  {window.innerWidth < 768 
                    ? "Utilisez l'appareil photo ou sélectionnez une image de votre galerie"
                    : "Ajoutez une image pour illustrer votre question (état de jeu, cartes, etc.)"
                  }
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="is_public"
                  {...register('is_public')}
                  className="h-4 w-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_public" className="text-sm text-gray-300">
                  Rendre cette question publique (visible par la communauté)
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowQuestionForm(false)}
                  className="flex-1 sm:flex-none"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  loading={submitting}
                  className="flex-1 sm:flex-none"
                >
                  Publier la question
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Recent Questions */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Mes questions récentes</h2>
            <Button variant="outline" size="sm">
              Voir tout
            </Button>
          </div>

          {recentQuestions.length === 0 ? (
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700 p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Aucune question pour le moment
              </h3>
              <p className="text-gray-400 mb-4">
                Commencez par poser votre première question sur Magic: The Gathering
              </p>
              <Button onClick={() => setShowQuestionForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Poser ma première question
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentQuestions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  onClick={() => {
                    // Navigate to conversation if exists
                    if (question.status !== 'waiting_for_judge') {
                      navigate(`/conversation/${question.id}`)
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}