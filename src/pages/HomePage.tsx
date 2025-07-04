import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Users, Crown, Star, Plus, TrendingUp, Award, Zap, CheckCircle, Clock, Shield } from 'lucide-react'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-16 container-mobile">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              MTG Judge
            </h1>
            <p className="text-xl sm:text-2xl text-blue-400 font-medium mb-8">
              La plateforme de référence pour Magic: The Gathering
            </p>
          </div>
          <p className="max-w-4xl mx-auto text-lg sm:text-xl text-gray-300 leading-relaxed mb-12">
            Connectez-vous instantanément avec des <span className="text-blue-400 font-semibold">juges certifiés</span> pour obtenir des réponses expertes à vos questions de règles Magic: The Gathering.
          </p>
          
          {/* CTA Principal */}
          {user ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={() => setShowCreateQuestion(true)}
                size="lg"
                className="text-lg px-8 py-4 w-full sm:w-auto"
              >
                <Plus className="h-5 w-5 mr-2" />
                Poser une question
              </Button>
              <Link to="/questions">
                <Button variant="outline" size="lg" className="text-lg px-8 py-4 w-full sm:w-auto">
                  Parcourir les questions
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/register">
                <Button size="lg" className="text-lg px-8 py-4 w-full sm:w-auto">
                  Commencer gratuitement
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="text-lg px-8 py-4 w-full sm:w-auto">
                  Se connecter
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Avantages clés */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
              <Zap className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Réponses Instantanées</h3>
            <p className="text-gray-400">
              Obtenez des réponses en temps réel de juges certifiés disponibles 24h/24.
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Juges Certifiés</h3>
            <p className="text-gray-400">
              Tous nos juges sont officiellement certifiés par Wizards of the Coast.
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
              <Award className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Système de Récompenses</h3>
            <p className="text-gray-400">
              Gagnez des points et échangez-les contre des récompenses exclusives.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-20">
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

        {/* Comment ça marche */}
        <div className="mb-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-12">
            Comment ça marche ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Posez votre question</h3>
              <p className="text-gray-400">
                Décrivez votre situation de jeu avec tous les détails nécessaires.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Connectez-vous avec un juge</h3>
              <p className="text-gray-400">
                Un juge certifié prend en charge votre question en temps réel.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Obtenez votre réponse</h3>
              <p className="text-gray-400">
                Recevez une réponse officielle et gagnez des points de récompense.
              </p>
            </div>
          </div>
        </div>

        {/* Témoignages / Social Proof */}
        <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border border-gray-700 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
            Rejoignez des milliers de joueurs satisfaits
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="text-3xl font-bold text-blue-400 mb-2">98%</div>
              <div className="text-gray-300">Taux de satisfaction</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400 mb-2">&lt; 2min</div>
              <div className="text-gray-300">Temps de réponse moyen</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400 mb-2">24/7</div>
              <div className="text-gray-300">Disponibilité</div>
            </div>
          </div>
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/register">
                <Button size="lg" className="text-lg px-8 py-4 w-full sm:w-auto">
                  Commencer maintenant
                </Button>
              </Link>
              <Link to="/questions">
                <Button variant="outline" size="lg" className="text-lg px-8 py-4 w-full sm:w-auto">
                  Voir les questions
                </Button>
              </Link>
            </div>
          )}
        </div>

        <CreateQuestionModal
          isOpen={showCreateQuestion}
          onClose={() => setShowCreateQuestion(false)}
          onSuccess={loadStats}
        />
      </div>
    </div>
  )
}