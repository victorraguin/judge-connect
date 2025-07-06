import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, Crown, Star, Clock, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { QuestionCard } from '../components/questions/QuestionCard'
import { CreateQuestionModal } from '../components/questions/CreateQuestionModal'
import type { Question } from '../types/database'

interface DashboardStats {
  myQuestions: number
  pendingQuestions: number
  completedQuestions: number
  totalPoints: number
}

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
  const [showCreateQuestion, setShowCreateQuestion] = useState(false)

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
              onClick={() => setShowCreateQuestion(true)}
              size="lg"
              className="flex-1 sm:flex-none"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nouvelle question
            </Button>
            <Button variant="outline" size="lg" className="flex-1 sm:flex-none">
              <MessageSquare className="h-5 w-5 mr-2" />
              Voir toutes mes questions
            </Button>
          </div>
        </div>

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
              <Button onClick={() => setShowCreateQuestion(true)}>
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
                    // Always try to navigate to conversation
                    if (question.status === 'waiting_for_judge') {
                      // Question waiting for judge - could show a message or navigate anyway
                      console.log('Question en attente d\'un juge')
                    } else {
                      // Navigate to existing conversation
                      navigate(`/conversation/${question.id}`)
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <CreateQuestionModal
          isOpen={showCreateQuestion}
          onClose={() => setShowCreateQuestion(false)}
          onSuccess={loadDashboardData}
        />
      </div>
    </div>
  )
}