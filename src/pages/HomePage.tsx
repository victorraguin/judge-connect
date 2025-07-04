import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Users, Crown, Star, Plus, TrendingUp, Award, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { CreateQuestionModal } from '../components/questions/CreateQuestionModal'

interface Stats {
  pendingQuestions: number
  availableJudges: number
  completedQuestions: number
  averageRating: number
}

export function HomePage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({
    pendingQuestions: 0,
    availableJudges: 0,
    completedQuestions: 0,
    averageRating: 0,
  })
  const [showCreateQuestion, setShowCreateQuestion] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // Pending questions
      const { count: pendingCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting_for_judge')

      // Available judges
      const { count: judgesCount } = await supabase
        .from('judge_info')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true)

      // Completed questions
      const { count: completedCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')

      // Average rating
      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('rating')

      const averageRating = ratingsData?.length
        ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length
        : 0

      setStats({
        pendingQuestions: pendingCount || 0,
        availableJudges: judgesCount || 0,
        completedQuestions: completedCount || 0,
        averageRating: Math.round(averageRating * 10) / 10,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="px-4 py-12 sm:px-0">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="relative inline-block">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-600 bg-clip-text text-transparent mb-6">
              MTG Judge
            </h1>
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg opacity-20 blur-xl animate-pulse-slow"></div>
          </div>
          <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-300 leading-relaxed">
            La plateforme de référence pour connecter les joueurs de <span className="text-blue-400 font-semibold">Magic: The Gathering</span> 
            avec des juges certifiés. Obtenez des réponses expertes à vos questions de règles en temps réel.
          </p>
          <div className="mt-8 flex justify-center space-x-2">
            <span className="mana-symbol mana-white">W</span>
            <span className="mana-symbol mana-blue">U</span>
            <span className="mana-symbol mana-black">B</span>
            <span className="mana-symbol mana-red">R</span>
            <span className="mana-symbol mana-green">G</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-16">
          <div className="bg-gray-800/50 backdrop-blur-sm overflow-hidden shadow-xl rounded-xl border border-gray-700 card-hover">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-yellow-500/20 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-yellow-400" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      Questions en attente
                    </dt>
                    <dd className="text-2xl font-bold text-white">
                      {stats.pendingQuestions}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm overflow-hidden shadow-xl rounded-xl border border-gray-700 card-hover">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <Crown className="h-6 w-6 text-green-400" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      Juges disponibles
                    </dt>
                    <dd className="text-2xl font-bold text-white">
                      {stats.availableJudges}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm overflow-hidden shadow-xl rounded-xl border border-gray-700 card-hover">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Award className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      Questions résolues
                    </dt>
                    <dd className="text-2xl font-bold text-white">
                      {stats.completedQuestions}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm overflow-hidden shadow-xl rounded-xl border border-gray-700 card-hover">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Star className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      Note moyenne
                    </dt>
                    <dd className="text-2xl font-bold text-white">
                      {stats.averageRating}/5
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-8 border border-gray-700 card-hover">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                <Zap className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Réponses Instantanées</h3>
              <p className="text-gray-400">
                Connectez-vous avec des juges certifiés en temps réel pour des réponses rapides et précises.
              </p>
            </div>
          </div>

          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-8 border border-gray-700 card-hover">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <Crown className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Juges Certifiés</h3>
              <p className="text-gray-400">
                Tous nos juges sont officiellement certifiés par Wizards of the Coast (L1, L2, L3).
              </p>
            </div>
          </div>

          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-8 border border-gray-700 card-hover">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Système de Points</h3>
              <p className="text-gray-400">
                Gagnez des points en posant des questions et en aidant la communauté. Échangez-les contre des récompenses.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        {user ? (
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-4">
                Prêt à poser votre question ?
              </h3>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Connectez-vous avec un juge expert et obtenez une réponse qualifiée à votre question sur Magic: The Gathering.
              </p>
              <Button
                onClick={() => setShowCreateQuestion(true)}
                size="lg"
                className="inline-flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Poser une question
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-4">
                Rejoignez la communauté MTG Judge
              </h3>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Créez un compte pour accéder à notre réseau d'experts et poser vos questions sur Magic: The Gathering.
              </p>
              <div className="space-x-4">
                <Link to="/login">
                  <Button variant="outline" size="lg">
                    Se connecter
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="lg">
                    S'inscrire gratuitement
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <CreateQuestionModal
          isOpen={showCreateQuestion}
          onClose={() => setShowCreateQuestion(false)}
          onSuccess={loadStats}
        />
      </div>
    </div>
  )
}