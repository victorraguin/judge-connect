import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, MessageSquare, Globe, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Question } from '../types/database'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { QuestionCard } from '../components/questions/QuestionCard'
import { CreateQuestionModal } from '../components/questions/CreateQuestionModal'

export function QuestionsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [showPublicOnly, setShowPublicOnly] = useState(false)
  const [showCreateQuestion, setShowCreateQuestion] = useState(false)

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

  const statuses = [
    { value: 'waiting_for_judge', label: 'En attente' },
    { value: 'assigned', label: 'Assignée' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: 'Résolue' },
    { value: 'disputed', label: 'En dispute' },
  ]

  useEffect(() => {
    loadQuestions()
  }, [user, showPublicOnly])

  const loadQuestions = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('questions')
        .select(`
          *,
          user:profiles!questions_user_id_fkey(id, full_name, email),
          assigned_judge:profiles!questions_assigned_judge_id_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false })

      // Filter logic based on user role and public/private toggle
      if (showPublicOnly) {
        query = query.eq('is_public', true)
      } else if (user?.profile?.role === 'admin') {
        // Admins see everything
      } else if (user?.profile?.role === 'judge') {
        // Judges see their assigned questions + public questions + available questions
        query = query.or(`user_id.eq.${user.id},assigned_judge_id.eq.${user.id},is_public.eq.true,status.eq.waiting_for_judge`)
      } else if (user) {
        // Regular users see their own questions + public questions
        query = query.or(`user_id.eq.${user.id},is_public.eq.true`)
      } else {
        // Non-authenticated users see only public questions
        query = query.eq('is_public', true)
      }

      const { data, error } = await query

      if (error) throw error
      setQuestions(data || [])
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredQuestions = questions.filter((question) => {
    const matchesSearch = question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         question.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || question.category === selectedCategory
    const matchesStatus = !selectedStatus || question.status === selectedStatus
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Chargement des questions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Questions MTG</h1>
            <p className="text-gray-300">
              {user?.profile?.role === 'admin' 
                ? 'Toutes les questions de la plateforme'
                : user?.profile?.role === 'judge'
                ? 'Questions assignées et disponibles'
                : showPublicOnly
                ? 'Questions publiques de la communauté'
                : 'Vos questions et questions publiques'
              }
            </p>
          </div>
          {user && user.profile?.role !== 'judge' && (
            <Button onClick={() => setShowCreateQuestion(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Nouvelle question
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher des questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 block w-full rounded-md bg-gray-800 border-gray-600 text-white placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full rounded-md bg-gray-800 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Toutes les catégories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full rounded-md bg-gray-800 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Tous les statuts</option>
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <Button
                variant={showPublicOnly ? "primary" : "outline"}
                onClick={() => setShowPublicOnly(!showPublicOnly)}
                className="w-full"
              >
                {showPublicOnly ? <Globe className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                {showPublicOnly ? 'Publiques' : 'Toutes'}
              </Button>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 bg-gray-800/50 rounded-full flex items-center justify-center mb-6">
                <MessageSquare className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">
                Aucune question trouvée
              </h3>
              <p className="text-gray-400 mb-6">
                {searchTerm || selectedCategory || selectedStatus
                  ? 'Essayez de modifier vos filtres de recherche.'
                  : user
                  ? 'Commencez par poser votre première question sur Magic: The Gathering.'
                  : 'Connectez-vous pour voir vos questions ou parcourir les questions publiques.'
                }
              </p>
              {user && !searchTerm && !selectedCategory && !selectedStatus && (
                <Button onClick={() => setShowCreateQuestion(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Poser ma première question
                </Button>
              )}
            </div>
          ) : (
            filteredQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onClick={() => {
                  // Navigate to conversation or question detail
                  if (question.status !== 'waiting_for_judge') {
                    // Navigate to existing conversation
                    navigate(`/conversation/${question.id}`)
                  } else {
                    // For judges, allow taking the question
                    if (user?.profile?.role === 'judge') {
                      navigate(`/conversation/${question.id}`)
                    }
                  }
                }}
              />
            ))
          )}
        </div>

        <CreateQuestionModal
          isOpen={showCreateQuestion}
          onClose={() => setShowCreateQuestion(false)}
          onSuccess={loadQuestions}
        />
      </div>
    </div>
  )
}