import React, { useEffect, useState } from 'react'
import { 
  Users, Crown, MessageSquare, AlertTriangle, TrendingUp, Star, 
  Award, Clock, Shield, Settings, UserCheck, UserX, Eye, 
  CheckCircle, XCircle, BarChart3, Activity, Zap, Target,
  Filter, Search, Calendar, Download, RefreshCw, Edit, Trash2,
  Plus, Mail, Phone, MapPin, Globe, Lock
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Question, Profile, JudgeInfo, Dispute, Rating, Conversation, Notification } from '../types/database'

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
  totalConversations: number
  activeConversations: number
}

interface TopJudge extends JudgeInfo {
  profile: Profile
}

interface UserWithProfile extends Profile {
  judge_info?: JudgeInfo
  question_count?: number
  last_activity?: string
}

interface RecentActivity {
  id: string
  type: 'question' | 'dispute' | 'rating' | 'user_joined' | 'conversation' | 'judge_assigned'
  description: string
  timestamp: string
  user?: Profile
  judge?: Profile
  question?: Question
}

interface DisputeWithDetails extends Dispute {
  user: Profile
  judge: Profile
  conversation: {
    id: string
    question: Question
  }
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
    totalConversations: 0,
    activeConversations: 0,
  })
  const [topJudges, setTopJudges] = useState<TopJudge[]>([])
  const [allUsers, setAllUsers] = useState<UserWithProfile[]>([])
  const [recentQuestions, setRecentQuestions] = useState<Question[]>([])
  const [disputes, setDisputes] = useState<DisputeWithDetails[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'questions' | 'disputes' | 'analytics'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')
  const [selectedUserRole, setSelectedUserRole] = useState<'all' | 'user' | 'judge' | 'admin'>('all')
  const [selectedQuestionStatus, setSelectedQuestionStatus] = useState<string>('')
  const [showUserModal, setShowUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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
        loadAllUsers(),
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

      // Conversations stats
      const { count: totalConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })

      const { count: activeConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Average rating
      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('rating')

      const averageRating = ratingsData?.length
        ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length
        : 0

      // Average response time calculation
      const { data: conversationsData } = await supabase
        .from('conversations')
        .select('started_at, ended_at')
        .not('ended_at', 'is', null)

      let averageResponseTime = '0 min'
      if (conversationsData?.length) {
        const totalTime = conversationsData.reduce((sum, conv) => {
          const start = new Date(conv.started_at).getTime()
          const end = new Date(conv.ended_at!).getTime()
          return sum + (end - start)
        }, 0)
        const avgMinutes = Math.round(totalTime / conversationsData.length / 60000)
        averageResponseTime = `${avgMinutes} min`
      }

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
        averageResponseTime,
        totalPoints,
        totalConversations: totalConversations || 0,
        activeConversations: activeConversations || 0,
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
        .limit(10)

      setTopJudges(data || [])
    } catch (error) {
      console.error('Error loading top judges:', error)
    }
  }

  const loadAllUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select(`
          *,
          judge_info(*)
        `)
        .order('created_at', { ascending: false })

      // Get question counts for each user
      const usersWithCounts = await Promise.all(
        (data || []).map(async (profile) => {
          const { count } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)

          return {
            ...profile,
            question_count: count || 0,
            last_activity: profile.last_seen || profile.updated_at,
          }
        })
      )

      setAllUsers(usersWithCounts)
    } catch (error) {
      console.error('Error loading users:', error)
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
        .limit(50)

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
            question:questions(id, title, content)
          )
        `)
        .order('created_at', { ascending: false })

      setDisputes(data || [])
    } catch (error) {
      console.error('Error loading disputes:', error)
    }
  }

  const loadRecentActivity = async () => {
    try {
      // Load recent questions
      const { data: recentQuestions } = await supabase
        .from('questions')
        .select(`
          id, title, created_at,
          user:profiles!questions_user_id_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      // Load recent conversations
      const { data: recentConversations } = await supabase
        .from('conversations')
        .select(`
          id, started_at,
          user:profiles!conversations_user_id_fkey(id, full_name, email),
          judge:profiles!conversations_judge_id_fkey(id, full_name, email),
          question:questions(id, title)
        `)
        .order('started_at', { ascending: false })
        .limit(5)

      // Load recent disputes
      const { data: recentDisputes } = await supabase
        .from('disputes')
        .select(`
          id, created_at,
          user:profiles!disputes_user_id_fkey(id, full_name, email),
          judge:profiles!disputes_judge_id_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(3)

      // Load recent ratings
      const { data: recentRatings } = await supabase
        .from('ratings')
        .select(`
          id, rating, created_at,
          user:profiles!ratings_user_id_fkey(id, full_name, email),
          judge:profiles!ratings_judge_id_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(3)

      const activities: RecentActivity[] = []

      // Add questions
      recentQuestions?.forEach(q => {
        activities.push({
          id: `q-${q.id}`,
          type: 'question',
          description: `Nouvelle question: "${q.title}"`,
          timestamp: q.created_at,
          user: q.user,
        })
      })

      // Add conversations
      recentConversations?.forEach(c => {
        activities.push({
          id: `c-${c.id}`,
          type: 'conversation',
          description: `Conversation démarrée pour "${c.question?.title}"`,
          timestamp: c.started_at,
          user: c.user,
          judge: c.judge,
        })
      })

      // Add disputes
      recentDisputes?.forEach(d => {
        activities.push({
          id: `d-${d.id}`,
          type: 'dispute',
          description: `Nouvelle dispute créée`,
          timestamp: d.created_at,
          user: d.user,
          judge: d.judge,
        })
      })

      // Add ratings
      recentRatings?.forEach(r => {
        activities.push({
          id: `r-${r.id}`,
          type: 'rating',
          description: `Note donnée: ${r.rating}/5`,
          timestamp: r.created_at,
          user: r.user,
          judge: r.judge,
        })
      })

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setRecentActivity(activities.slice(0, 10))
    } catch (error) {
      console.error('Error loading recent activity:', error)
    }
  }

  const switchUserRole = async (userId: string, newRole: 'user' | 'judge' | 'admin') => {
    try {
      setActionLoading(`role-${userId}`)
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
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
            specialties: [],
            languages: ['French'],
            total_points: 0,
            total_questions_answered: 0,
            average_rating: 0,
            bio: 'Nouveau juge MTG',
          })

        if (judgeError) throw judgeError
      }

      // If switching from judge, deactivate judge_info
      if (newRole !== 'judge') {
        await supabase
          .from('judge_info')
          .update({ is_available: false })
          .eq('user_id', userId)
      }

      await loadAllUsers()
      await loadStats()
    } catch (error) {
      console.error('Error switching user role:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const resolveDispute = async (disputeId: string, resolution: 'user_favor' | 'judge_favor') => {
    try {
      setActionLoading(`dispute-${disputeId}`)
      
      const { error } = await supabase
        .from('disputes')
        .update({
          status: 'resolved',
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
          admin_notes: `Résolu en faveur du ${resolution === 'user_favor' ? 'utilisateur' : 'juge'} par l'administrateur`,
        })
        .eq('id', disputeId)

      if (error) throw error
      
      await loadDisputes()
      await loadStats()
    } catch (error) {
      console.error('Error resolving dispute:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
      return
    }

    try {
      setActionLoading(`delete-${userId}`)
      
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error
      
      await loadAllUsers()
      await loadStats()
    } catch (error) {
      console.error('Error deleting user:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const assignQuestionToJudge = async (questionId: string, judgeId: string) => {
    try {
      setActionLoading(`assign-${questionId}`)
      
      const { error } = await supabase
        .from('questions')
        .update({
          assigned_judge_id: judgeId,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
        })
        .eq('id', questionId)

      if (error) throw error
      
      await loadRecentQuestions()
      await loadStats()
    } catch (error) {
      console.error('Error assigning question:', error)
    } finally {
      setActionLoading(null)
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
      case 'conversation':
        return <Users className="h-4 w-4 text-green-400" />
      case 'judge_assigned':
        return <Crown className="h-4 w-4 text-purple-400" />
      default:
        return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'disputed':
        return 'danger'
      case 'in_progress':
        return 'info'
      case 'assigned':
        return 'info'
      case 'waiting_for_judge':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
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

  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedUserRole === 'all' || user.role === selectedUserRole
    return matchesSearch && matchesRole
  })

  const filteredQuestions = recentQuestions.filter(question => {
    const matchesSearch = question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         question.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !selectedQuestionStatus || question.status === selectedQuestionStatus
    return matchesSearch && matchesStatus
  })

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
            <Button variant="outline" size="sm" onClick={loadAdminData} loading={loading}>
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
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-green-400" />
                  Conversations
                </h3>
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {stats.activeConversations}/{stats.totalConversations}
                </div>
                <p className="text-sm text-gray-400">Actives/Total</p>
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

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Gestion des Utilisateurs</h2>
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
                <select
                  value={selectedUserRole}
                  onChange={(e) => setSelectedUserRole(e.target.value as any)}
                  className="bg-gray-800 border border-gray-600 rounded-lg text-white px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">Tous les rôles</option>
                  <option value="user">Utilisateurs</option>
                  <option value="judge">Juges</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Rôle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Questions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Dernière activité
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredUsers.map((userProfile) => (
                      <tr key={userProfile.id} className="hover:bg-gray-700/30">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                              {userProfile.full_name?.charAt(0) || userProfile.email.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-white">
                                {userProfile.full_name || 'Nom non défini'}
                              </p>
                              <p className="text-xs text-gray-400">{userProfile.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              userProfile.role === 'admin' ? 'danger' :
                              userProfile.role === 'judge' ? 'warning' : 'default'
                            }
                            size="sm"
                          >
                            {userProfile.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-white">{userProfile.question_count || 0}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-400">
                            {userProfile.last_activity ? 
                              formatDistanceToNow(new Date(userProfile.last_activity), {
                                addSuffix: true,
                                locale: fr,
                              }) : 'Jamais'
                            }
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <select
                              value={userProfile.role}
                              onChange={(e) => switchUserRole(userProfile.id, e.target.value as any)}
                              disabled={actionLoading === `role-${userProfile.id}`}
                              className="bg-gray-700 border border-gray-600 rounded text-white text-xs px-2 py-1 focus:border-blue-500"
                            >
                              <option value="user">User</option>
                              <option value="judge">Judge</option>
                              <option value="admin">Admin</option>
                            </select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(userProfile)
                                setShowUserModal(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteUser(userProfile.id)}
                              loading={actionLoading === `delete-${userProfile.id}`}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                <select
                  value={selectedQuestionStatus}
                  onChange={(e) => setSelectedQuestionStatus(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded-lg text-white px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Tous les statuts</option>
                  <option value="waiting_for_judge">En attente</option>
                  <option value="assigned">Assignée</option>
                  <option value="in_progress">En cours</option>
                  <option value="completed">Résolue</option>
                  <option value="disputed">En dispute</option>
                </select>
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
                    {filteredQuestions.map((question) => (
                      <tr key={question.id} className="hover:bg-gray-700/30">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-white truncate max-w-xs">
                              {question.title}
                            </p>
                            <p className="text-xs text-gray-400">{question.category}</p>
                            {question.is_public && (
                              <div className="flex items-center mt-1">
                                <Globe className="h-3 w-3 text-green-400 mr-1" />
                                <span className="text-xs text-green-400">Public</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-white">
                            {question.user?.full_name || question.user?.email}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getStatusBadgeVariant(question.status)} size="sm">
                            {getStatusLabel(question.status)}
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
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {question.status === 'waiting_for_judge' && (
                              <select
                                onChange={(e) => assignQuestionToJudge(question.id, e.target.value)}
                                className="bg-gray-700 border border-gray-600 rounded text-white text-xs px-2 py-1"
                                defaultValue=""
                              >
                                <option value="" disabled>Assigner à...</option>
                                {topJudges.filter(j => j.is_available).map(judge => (
                                  <option key={judge.id} value={judge.user_id}>
                                    {judge.profile?.full_name || judge.profile?.email}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
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
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-2">
                          <span>Utilisateur: {dispute.user?.full_name || dispute.user?.email}</span>
                          <span>Juge: {dispute.judge?.full_name || dispute.judge?.email}</span>
                        </div>
                        <div className="text-sm text-gray-400">
                          Question: "{dispute.conversation?.question?.title}"
                        </div>
                        <div className="text-sm text-gray-400">
                          {formatDistanceToNow(new Date(dispute.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </div>
                      </div>
                      <Badge
                        variant={
                          dispute.status === 'resolved' ? 'success' :
                          dispute.status === 'under_review' ? 'info' : 'warning'
                        }
                      >
                        {dispute.status === 'resolved' ? 'Résolue' :
                         dispute.status === 'under_review' ? 'En cours' : 'En attente'}
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

                    {dispute.admin_notes && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Notes admin:</h4>
                        <p className="text-sm text-gray-400 bg-blue-900/20 p-3 rounded-lg border border-blue-700">
                          {dispute.admin_notes}
                        </p>
                      </div>
                    )}

                    {dispute.status === 'pending' && (
                      <div className="flex space-x-3">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => resolveDispute(dispute.id, 'user_favor')}
                          loading={actionLoading === `dispute-${dispute.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          En faveur de l'utilisateur
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => resolveDispute(dispute.id, 'judge_favor')}
                          loading={actionLoading === `dispute-${dispute.id}`}
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

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Analytics & Rapports</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Questions par statut */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Questions par statut</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">En attente</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full" 
                          style={{ width: `${(stats.pendingQuestions / stats.totalQuestions) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-white font-medium">{stats.pendingQuestions}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Résolues</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-400 h-2 rounded-full" 
                          style={{ width: `${(stats.completedQuestions / stats.totalQuestions) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-white font-medium">{stats.completedQuestions}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">En dispute</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-red-400 h-2 rounded-full" 
                          style={{ width: `${(stats.disputedQuestions / stats.totalQuestions) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-white font-medium">{stats.disputedQuestions}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Répartition des rôles */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Répartition des utilisateurs</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Utilisateurs</span>
                    <span className="text-white font-medium">
                      {allUsers.filter(u => u.role === 'user').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Juges</span>
                    <span className="text-white font-medium">
                      {allUsers.filter(u => u.role === 'judge').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Admins</span>
                    <span className="text-white font-medium">
                      {allUsers.filter(u => u.role === 'admin').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Métriques de performance */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Métriques de performance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400 mb-1">
                    {stats.totalQuestions > 0 ? Math.round((stats.completedQuestions / stats.totalQuestions) * 100) : 0}%
                  </div>
                  <div className="text-sm text-gray-400">Taux de résolution</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    {stats.averageRating}
                  </div>
                  <div className="text-sm text-gray-400">Note moyenne</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400 mb-1">
                    {stats.averageResponseTime}
                  </div>
                  <div className="text-sm text-gray-400">Temps de réponse</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400 mb-1">
                    {stats.totalJudges > 0 ? Math.round((stats.activeJudges / stats.totalJudges) * 100) : 0}%
                  </div>
                  <div className="text-sm text-gray-400">Juges actifs</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Detail Modal */}
        {showUserModal && selectedUser && (
          <Modal
            isOpen={showUserModal}
            onClose={() => {
              setShowUserModal(false)
              setSelectedUser(null)
            }}
            title="Détails de l'utilisateur"
            size="lg"
          >
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {selectedUser.full_name?.charAt(0) || selectedUser.email.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {selectedUser.full_name || 'Nom non défini'}
                  </h3>
                  <p className="text-gray-400">{selectedUser.email}</p>
                  <Badge
                    variant={
                      selectedUser.role === 'admin' ? 'danger' :
                      selectedUser.role === 'judge' ? 'warning' : 'default'
                    }
                    size="sm"
                  >
                    {selectedUser.role}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Questions posées
                  </label>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-xl font-bold text-white">{selectedUser.question_count || 0}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Membre depuis
                  </label>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-sm text-white">
                      {new Date(selectedUser.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
              </div>

              {selectedUser.judge_info && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Informations Juge</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Niveau
                      </label>
                      <div className="bg-gray-700/50 rounded-lg p-3">
                        <Badge variant={`judge-${selectedUser.judge_info.judge_level.toLowerCase()}` as any}>
                          {selectedUser.judge_info.judge_level}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Questions répondues
                      </label>
                      <div className="bg-gray-700/50 rounded-lg p-3">
                        <div className="text-xl font-bold text-white">
                          {selectedUser.judge_info.total_questions_answered || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUserModal(false)
                    setSelectedUser(null)
                  }}
                >
                  Fermer
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  )
}