import React, { useEffect, useState } from 'react'
import { 
  Users, Crown, MessageSquare, AlertTriangle, TrendingUp, Star, 
  Award, Clock, Shield, Settings, UserCheck, UserX, Eye, 
  CheckCircle, XCircle, BarChart3, Activity, Zap, Target,
  Filter, Search, Calendar, Download, RefreshCw
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Question, Profile, JudgeInfo, Dispute, Rating } from '../types/database'

interface AdminStats {
  totalUsers: number
  totalJudges: number
  activeJudges: number
  totalQuestions: number
  pendingQuestions: number
  completedQuestions: number
  disputedQuestions: number
  averageRating: number
  averageResponseTime: string
  totalPoints: number
}

interface TopJudge extends JudgeInfo {
  profile: Profile
}

interface RecentActivity {
  id: string
  type: 'question' | 'dispute' | 'rating' | 'user_joined'
  description: string
  timestamp: string
  user?: Profile
  judge?: Profile
}

export function AdminDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalJudges: 0,
    activeJudges: 0,
    totalQuestions: 0,
    pendingQuestions: 0,
    completedQuestions: 0,
    disputedQuestions: 0,
    averageRating: 0,
    averageResponseTime: '0',
    totalPoints: 0,
  })
  const [topJudges, setTopJudges] = useState<TopJudge[]>([])
  const [recentQuestions, setRecentQuestions] = useState<Question[]>([])
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'questions' | 'disputes' | 'analytics'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')

  useEffect(() => {
    if (user?.profile?.role === 'admin') {
      loadAdminData()
    }
  }, [user])

  const loadAdminData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadStats(),
        loadTopJudges(),
        loadRecentQuestions(),
        loadDisputes(),
        loadRecentActivity(),
      ])
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Total judges
      const { count: totalJudges } = await supabase
        .from('judge_info')
        .select('*', { count: 'exact', head: true })

      // Active judges
      const { count: activeJudges } = await supabase
        .from('judge_info')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true)

      // Questions stats
      const { count: totalQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })

      const { count: pendingQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['waiting_for_judge', 'assigned'])

      const { count: completedQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')

      const { count: disputedQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'disputed')

      // Average rating
      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('rating')

      const averageRating = ratingsData?.length
        ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length
        : 0

      // Total points
      const { data: rewardsData } = await supabase
        .from('rewards')
        .select('points_earned')

      const totalPoints = rewardsData?.reduce((sum, r) => sum + r.points_earned, 0) || 0

      setStats({
        totalUsers: totalUsers || 0,
        totalJudges: totalJudges || 0,
        activeJudges: activeJudges || 0,
        totalQuestions: totalQuestions || 0,
        pendingQuestions: pendingQuestions || 0,
        completedQuestions: completedQuestions || 0,
        disputedQuestions: disputedQuestions || 0,
        averageRating: Math.round(averageRating * 10) / 10,
        averageResponseTime: '2.5 min', // Mock data
        totalPoints,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadTopJudges = async () => {
    try {
      const { data } = await supabase
        .from('judge_info')
        .select(`
          *,
          profile:profiles!judge_info_user_id_fkey(*)
        `)
        .order('average_rating', { ascending: false })
        .limit(5)

      setTopJudges(data || [])
    } catch (error) {
      console.error('Error loading top judges:', error)
    }
  }

  const loadRecentQuestions = async () => {
    try {
      const { data } = await supabase
        .from('questions')
        .select(`
          *,
          user:profiles!questions_user_id_fkey(id, full_name, email),
          assigned_judge:profiles!questions_assigned_judge_id_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      setRecentQuestions(data || [])
    } catch (error) {
      console.error('Error loading recent questions:', error)
    }
  }

  const loadDisputes = async () => {
    try {
      const { data } = await supabase
        .from('disputes')
        .select(`
          *,
          user:profiles!disputes_user_id_fkey(id, full_name, email),
          judge:profiles!disputes_judge_id_fkey(id, full_name, email),
          conversation:conversations!disputes_conversation_id_fkey(
            id,
            question:questions(id, title)
          )
        `)
        .order('created_at', { ascending: false })

      setDisputes(data || [])
    } catch (error) {
      console.error('Error loading disputes:', error)
    }
  }

  const loadRecentActivity = async () => {
    // Mock recent activity data
    setRecentActivity([
      {
        id: '1',
        type: 'question',
        description: 'Nouvelle question posée par Victor',
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'dispute',
        description: 'Dispute créée pour la question #123',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '3',
        type: 'user_joined',
        description: 'Nouvel utilisateur inscrit',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      },
    ])
  }

  const switchUserRole = async (userId: string, newRole: 'user' | 'judge' | 'admin') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      // If switching to judge, create judge_info record
      if (newRole === 'judge') {
        const { error: judgeError } = await supabase
          .from('judge_info')
          .upsert({
            user_id: userId,
            judge_level: 'L1',
            is_available: true,
          })

        if (judgeError) throw judgeError
      }

      loadAdminData()
    } catch (error) {
      console.error('Error switching user role:', error)
    }
  }

  const resolveDispute = async (disputeId: string, resolution: 'user_favor' | 'judge_favor') => {
    try {
      const { error } = await supabase
        .from('disputes')
        .update({
          status: 'resolved',
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
          admin_notes: `Résolu en faveur du ${resolution === 'user_favor' ? 'utilisateur' : 'juge'}`,
        })
        .eq('id', disputeId)

      if (error) throw error
      loadDisputes()
    } catch (error) {
      console.error('Error resolving dispute:', error)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'question':
        return <MessageSquare className="h-4 w-4 text-blue-400" />
      case 'dispute':
        return <AlertTriangle className="h-4 w-4 text-red-400" />
      case 'rating':
        return <Star className="h-4 w-4 text-yellow-400" />
      case 'user_joined':
        return <UserCheck className="h-4 w-4 text-green-400" />
      default:
        return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  if (user?.profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Accès refusé</h1>
          <p className="text-gray-400">Vous n'avez pas les permissions d'administrateur.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Chargement du dashboard admin...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6 container-mobile">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <Shield className="h-8 w-8 mr-3 text-purple-400" />
              Dashboard Admin
            </h1>
            <p className="text-gray-400">
              Supervision et gestion de la plateforme MTG Judge
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <Button variant="outline" size="sm" onClick={loadAdminData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-800/30 p-1 rounded-lg overflow-x-auto">
          {[
            { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
            { id: 'users', label: 'Utilisateurs', icon: Users },
            { id: 'questions', label: 'Questions', icon: MessageSquare },
            { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3 px-4 rounded-md transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Users className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-400">Utilisateurs</p>
                    <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-500/20 rounded-lg">
                    <Crown className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-400">Juges actifs</p>
                    <p className="text-2xl font-bold text-white">{stats.activeJudges}/{stats.totalJudges}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-400">Questions</p>
                    <p className="text-2xl font-bold text-white">{stats.totalQuestions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-red-500/20 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-400">Disputes</p>
                    <p className="text-2xl font-bold text-white">{stats.disputedQuestions}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-400" />
                  Note moyenne
                </h3>
                <div className="text-3xl font-bold text-yellow-400 mb-2">
                  {stats.averageRating}/5
                </div>
                <p className="text-sm text-gray-400">Satisfaction globale</p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-400" />
                  Temps de réponse
                </h3>
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  {stats.averageResponseTime}
                </div>
                <p className="text-sm text-gray-400">Moyenne</p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Award className="h-5 w-5 mr-2 text-purple-400" />
                  Points distribués
                </h3>
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {stats.totalPoints}
                </div>
                <p className="text-sm text-gray-400">Total</p>
              </div>
            </div>

            {/* Top Judges & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Judges */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Crown className="h-5 w-5 mr-2 text-yellow-400" />
                  Top Juges
                </h3>
                <div className="space-y-3">
                  {topJudges.slice(0, 5).map((judge, index) => (
                    <div key={judge.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {judge.profile?.full_name || judge.profile?.email}
                          </p>
                          <p className="text-xs text-gray-400">
                            {judge.total_questions_answered || 0} questions
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={`judge-${judge.judge_level.toLowerCase()}` as any} size="sm">
                          {judge.judge_level}
                        </Badge>
                        <div className="flex items-center">
                          <Star className="h-3 w-3 text-yellow-400 mr-1" />
                          <span className="text-sm text-white">
                            {judge.average_rating?.toFixed(1) || '0.0'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-green-400" />
                  Activité récente
                </h3>
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white">{activity.description}</p>
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(activity.timestamp), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Gestion des Questions</h2>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtres
                </Button>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Question
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Juge
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {recentQuestions.slice(0, 10).map((question) => (
                      <tr key={question.id} className="hover:bg-gray-700/30">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-white truncate max-w-xs">
                              {question.title}
                            </p>
                            <p className="text-xs text-gray-400">{question.category}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-white">
                            {question.user?.full_name || question.user?.email}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              question.status === 'completed' ? 'success' :
                              question.status === 'disputed' ? 'danger' :
                              question.status === 'in_progress' ? 'info' : 'warning'
                            }
                            size="sm"
                          >
                            {question.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-white">
                            {question.assigned_judge?.full_name || 'Non assigné'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-400">
                            {formatDistanceToNow(new Date(question.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Disputes Tab */}
        {activeTab === 'disputes' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Gestion des Disputes</h2>
            
            <div className="space-y-4">
              {disputes.length === 0 ? (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Aucune dispute</h3>
                  <p className="text-gray-400">Toutes les disputes ont été résolues.</p>
                </div>
              ) : (
                disputes.map((dispute) => (
                  <div key={dispute.id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                          Dispute #{dispute.id.slice(0, 8)}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span>Utilisateur: {dispute.user?.full_name || dispute.user?.email}</span>
                          <span>Juge: {dispute.judge?.full_name || dispute.judge?.email}</span>
                          <span>
                            {formatDistanceToNow(new Date(dispute.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          dispute.status === 'resolved' ? 'success' :
                          dispute.status === 'under_review' ? 'info' : 'warning'
                        }
                      >
                        {dispute.status}
                      </Badge>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Justification de l'utilisateur:</h4>
                      <p className="text-sm text-gray-400 bg-gray-700/30 p-3 rounded-lg">
                        {dispute.user_justification}
                      </p>
                    </div>

                    {dispute.judge_justification && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Justification du juge:</h4>
                        <p className="text-sm text-gray-400 bg-gray-700/30 p-3 rounded-lg">
                          {dispute.judge_justification}
                        </p>
                      </div>
                    )}

                    {dispute.status === 'pending' && (
                      <div className="flex space-x-3">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => resolveDispute(dispute.id, 'user_favor')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          En faveur de l'utilisateur
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => resolveDispute(dispute.id, 'judge_favor')}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          En faveur du juge
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Gestion des Utilisateurs</h2>
            
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <p className="text-gray-400 mb-4">
                Fonctionnalité de gestion des utilisateurs en cours de développement.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-700/30 p-4 rounded-lg text-center">
                  <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">Gestion des rôles</p>
                </div>
                <div className="bg-gray-700/30 p-4 rounded-lg text-center">
                  <Shield className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">Permissions</p>
                </div>
                <div className="bg-gray-700/30 p-4 rounded-lg text-center">
                  <Settings className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">Configuration</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Analytics</h2>
            
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <p className="text-gray-400 mb-4">
                Tableaux de bord analytiques en cours de développement.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-700/30 p-4 rounded-lg text-center">
                  <BarChart3 className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">Graphiques</p>
                </div>
                <div className="bg-gray-700/30 p-4 rounded-lg text-center">
                  <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">Tendances</p>
                </div>
                <div className="bg-gray-700/30 p-4 rounded-lg text-center">
                  <Target className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">KPIs</p>
                </div>
                <div className="bg-gray-700/30 p-4 rounded-lg text-center">
                  <Calendar className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">Rapports</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}