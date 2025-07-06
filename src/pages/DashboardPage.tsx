import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, Crown, Star, Clock, TrendingUp, Eye, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react'
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
  availableQuestions?: number // For judges
  assignedQuestions?: number // For judges
}

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    myQuestions: 0,
    pendingQuestions: 0,
    completedQuestions: 0,
    totalPoints: 0,
    availableQuestions: 0,
    assignedQuestions: 0,
  })
  const [recentQuestions, setRecentQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateQuestion, setShowCreateQuestion] = useState(false)

  const isJudge = user?.profile?.role === 'judge'
  const isAdmin = user?.profile?.role === 'admin'

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      setLoading(true)

      if (isJudge || isAdmin) {
        // Judge/Admin dashboard - show all questions
        await loadJudgeDashboard()
      } else {
        // Regular user dashboard - show user's questions
        await loadUserDashboard()
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserDashboard = async () => {
    if (!user) return

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
  }

  const loadJudgeDashboard = async () => {
    if (!user) return

    // Load available questions (waiting for judge)
    const { count: availableCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting_for_judge')

    // Load assigned questions to this judge
    const { count: assignedCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_judge_id', user.id)
      .in('status', ['assigned', 'in_progress'])

    // Load completed questions by this judge
    const { count: completedCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_judge_id', user.id)
      .eq('status', 'completed')

    // Load all recent questions for judges (they can see everything)
    const { data: questionsData } = await supabase
      .from('questions')
      .select(`
        *,
        user:profiles!questions_user_id_fkey(id, full_name, email),
        assigned_judge:profiles!questions_assigned_judge_id_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    // Load judge points
    const { data: judgeInfo } = await supabase
      .from('judge_info')
      .select('total_points')
      .eq('user_id', user.id)
      .single()

    setStats({
      myQuestions: 0, // Not relevant for judges
      pendingQuestions: assignedCount || 0,
      completedQuestions: completedCount || 0,
      totalPoints: judgeInfo?.total_points || 0,
      availableQuestions: availableCount || 0,
      assignedQuestions: assignedCount || 0,
    })

    setRecentQuestions(questionsData || [])
  }

  const handleQuestionClick = async (question: Question) => {
    try {
      // Check if there's already a conversation for this question
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('question_id', question.id)
        .single()

      if (conversation) {
        // Navigate to the conversation
        navigate(`/conversation/${conversation.id}`)
      } else {
        // No conversation yet, navigate to question view
        navigate(`/conversation/${question.id}`)
      }
    } catch (error) {
      // If no conversation found or error, navigate to question view
      navigate(`/conversation/${question.id}`)
    }
  }

  const getQuestionStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting_for_judge':
        return <Clock className="h-4 w-4 text-yellow-400" />
      case 'assigned':
        return <Crown className="h-4 w-4 text-blue-400" />
      case 'in_progress':
        return <MessageSquare className="h-4 w-4 text-green-400" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'disputed':
        return <AlertCircle className="h-4 w-4 text-red-400" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getQuestionStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting_for_judge':
        return 'En attente'
      case 'assigned':
        return 'Assignée'
      case 'in_progress':
        return 'En cours'
      case 'completed':
        return 'Résolue'
      case 'disputed':
        return 'En dispute'
      default:
        return status
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
            {isJudge ? '⚖️' : '🎮'} {isJudge ? 'Dashboard Juge' : `Salut, ${user?.profile?.full_name?.split(' ')[0] || 'Planeswalker'} !`}
          </h1>
          <p className="text-gray-400">
            {isJudge 
              ? '👨‍⚖️ Gérez toutes les questions de la plateforme et aidez la communauté'
              : '⚡ Prêt pour une nouvelle partie ? Gérez vos questions et suivez vos stats !'
            }
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {isJudge ? (
            <>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 bg-yellow-500/20 rounded-lg">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm text-gray-400">Disponibles</p>
                    <p className="text-lg sm:text-2xl font-bold text-yellow-400">{stats.availableQuestions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 bg-blue-500/20 rounded-lg">
                    <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm text-gray-400">Mes assignations</p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-400">{stats.assignedQuestions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 bg-green-500/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm text-gray-400">Résolues</p>
                    <p className="text-lg sm:text-2xl font-bold text-green-400">{stats.completedQuestions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 bg-purple-500/20 rounded-lg">
                    <Star className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm text-gray-400">Points</p>
                    <p className="text-lg sm:text-2xl font-bold text-white">{stats.totalPoints}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
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
                    <p className="text-xs sm:text-sm text-gray-400">En cours</p>
                    <p className="text-lg sm:text-2xl font-bold text-yellow-400">{stats.pendingQuestions}</p>
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
                    <p className="text-lg sm:text-2xl font-bold text-green-400">{stats.completedQuestions}</p>
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
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {!isJudge && (
              <Button
                onClick={() => setShowCreateQuestion(true)}
                size="lg"
                className="flex-1 sm:flex-none animate-pulse"
              >
                <span className="mr-2">🙋‍♂️</span>
                Juudge! J'ai une question
              </Button>
            )}
            <Button 
              variant="outline" 
              size="lg" 
              className="flex-1 sm:flex-none"
              onClick={() => navigate('/questions')}
            >
              <span className="mr-2">📋</span>
              {isJudge ? 'Toutes les questions' : 'Mes questions'}
            </Button>
            {isJudge && (
              <Button 
                variant="secondary" 
                size="lg" 
                className="flex-1 sm:flex-none"
                onClick={() => navigate('/judges')}
              >
                <span className="mr-2">👨‍⚖️</span>
                Autres juges
              </Button>
            )}
          </div>
        </div>

        {/* Recent Questions */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              {isJudge ? '🔥 Questions récentes de la plateforme' : '🔥 Mes dernières questions'}
            </h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/questions')}
            >
              📋 Tout voir
            </Button>
          </div>

          {recentQuestions.length === 0 ? (
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700 p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {isJudge ? '📋 Aucune question récente' : '🤔 Aucune question pour le moment'}
              </h3>
              <p className="text-gray-400 mb-4">
                {isJudge 
                  ? '🎯 Les nouvelles questions apparaîtront ici dès qu\'elles seront posées.'
                  : '🎯 Prêt à poser votre première question ? C\'est parti !'
                }
              </p>
              {!isJudge && (
                <Button onClick={() => setShowCreateQuestion(true)}>
                  <span className="mr-2">🚀</span>
                  Ma première question
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {recentQuestions.map((question) => (
                <div key={question.id} className="relative">
                  <QuestionCard
                    question={question}
                    onClick={() => handleQuestionClick(question)}
                  />
                  {/* Judge-specific indicators */}
                  {isJudge && (
                    <div className="absolute top-4 right-4 flex items-center space-x-2">
                      {question.status === 'waiting_for_judge' && (
                        <div className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs font-medium border border-yellow-500/30">
                          🎯 Disponible
                        </div>
                      )}
                      {question.assigned_judge_id === user?.id && (
                        <div className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs font-medium border border-blue-500/30">
                          ⚖️ Assignée à moi
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {!isJudge && (
          <CreateQuestionModal
            isOpen={showCreateQuestion}
            onClose={() => setShowCreateQuestion(false)}
            onSuccess={loadDashboardData}
          />
        )}
      </div>
    </div>
  )
}