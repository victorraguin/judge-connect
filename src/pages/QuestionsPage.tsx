import React, { useEffect, useState } from 'react'
import { Plus, Search, Filter, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Question } from '../types/database'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { QuestionCard } from '../components/questions/QuestionCard'
import { CreateQuestionModal } from '../components/questions/CreateQuestionModal'

export function QuestionsPage() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [showCreateQuestion, setShowCreateQuestion] = useState(false)

  const categories = [
    'Droit civil',
    'Droit pénal',
    'Droit commercial',
    'Droit du travail',
    'Droit administratif',
    'Droit fiscal',
    'Droit de la famille',
    'Autre',
  ]

  const statuses = [
    { value: 'waiting_for_judge', label: 'En attente' },
    { value: 'assigned', label: 'Assignée' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: 'Complétée' },
    { value: 'disputed', label: 'Disputée' },
  ]

  useEffect(() => {
    loadQuestions()
  }, [user])

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

      // If user is not admin, only show their questions or public questions
      if (user?.profile?.role !== 'admin') {
        if (user?.profile?.role === 'judge') {
          query = query.or(`user_id.eq.${user.id},assigned_judge_id.eq.${user.id}`)
        } else if (user) {
          query = query.eq('user_id', user.id)
        } else {
          // Public questions for non-authenticated users
          query = query.eq('status', 'waiting_for_judge')
        }
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Questions</h1>
          <p className="text-gray-600">
            {user?.profile?.role === 'admin' 
              ? 'Toutes les questions de la plateforme'
              : user?.profile?.role === 'judge'
              ? 'Vos questions assignées et disponibles'
              : 'Vos questions posées'
            }
          </p>
        </div>
        {user && user.profile?.role !== 'judge' && (
          <Button onClick={() => setShowCreateQuestion(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle question
          </Button>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher des questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Tous les statuts</option>
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <MessageSquare className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune question trouvée
            </h3>
            <p className="text-gray-600">
              {searchTerm || selectedCategory || selectedStatus
                ? 'Essayez de modifier vos filtres de recherche.'
                : user
                ? 'Commencez par poser votre première question.'
                : 'Connectez-vous pour voir vos questions.'
              }
            </p>
          </div>
        ) : (
          filteredQuestions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              onClick={() => {
                // Navigate to question detail
                console.log('Navigate to question:', question.id)
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
  )
}