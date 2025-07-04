import React, { useEffect, useState } from 'react'
import { Star, Clock, Award, Languages, Users, Crown, Zap, Target } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { JudgeInfo, Profile } from '../types/database'
import { Badge } from '../components/ui/Badge'

interface JudgeWithProfile extends JudgeInfo {
  profile: Profile
}

export function JudgesPage() {
  const [judges, setJudges] = useState<JudgeWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadJudges()
  }, [])

  const loadJudges = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('judge_info')
        .select(`
          *,
          profile:profiles!judge_info_user_id_fkey(*)
        `)
        .eq('is_available', true)
        .order('average_rating', { ascending: false })

      if (error) throw error
      setJudges(data || [])
    } catch (error) {
      console.error('Error loading judges:', error)
    } finally {
      setLoading(false)
    }
  }

  const getJudgeBadgeVariant = (level: string) => {
    switch (level) {
      case 'L1':
        return 'judge-l1'
      case 'L2':
        return 'judge-l2'
      case 'L3':
        return 'judge-l3'
      default:
        return 'default'
    }
  }

  const getJudgeLevelDescription = (level: string) => {
    switch (level) {
      case 'L1':
        return 'Juge de niveau 1 - Événements locaux'
      case 'L2':
        return 'Juge de niveau 2 - Événements compétitifs'
      case 'L3':
        return 'Juge de niveau 3 - Événements professionnels'
      default:
        return 'Juge certifié'
    }
  }

  const formatResponseTime = (interval: string) => {
    // Simple formatting for interval - in a real app you'd parse this properly
    return interval || 'N/A'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Chargement des juges...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Juges MTG Certifiés</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Découvrez notre réseau de juges officiels Magic: The Gathering, 
            certifiés par Wizards of the Coast et spécialisés dans différents domaines.
          </p>
        </div>

        {judges.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gray-800/50 rounded-full flex items-center justify-center mb-6">
              <Users className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">
              Aucun juge disponible
            </h3>
            <p className="text-gray-400">
              Tous nos juges sont actuellement occupés. Veuillez réessayer plus tard.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {judges.map((judge) => (
              <div key={judge.id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 card-hover">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {judge.profile.full_name?.charAt(0) || judge.profile.email.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg">
                        {judge.profile.full_name || judge.profile.email}
                      </h3>
                      <Badge variant={getJudgeBadgeVariant(judge.judge_level)} size="sm">
                        <Crown className="h-3 w-3 mr-1" />
                        Juge {judge.judge_level}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 mr-1" />
                    <span className="text-sm font-medium text-white">
                      {judge.average_rating?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                </div>

                {/* Bio */}
                {judge.bio && (
                  <p className="text-gray-300 text-sm mb-4 line-clamp-3 leading-relaxed">
                    {judge.bio}
                  </p>
                )}

                {/* Level Description */}
                <div className="mb-4">
                  <p className="text-xs text-gray-400">
                    {getJudgeLevelDescription(judge.judge_level)}
                  </p>
                </div>

                {/* Specialties */}
                {judge.specialties && judge.specialties.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                      <Target className="h-4 w-4 mr-1" />
                      Spécialités
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {judge.specialties.slice(0, 3).map((specialty, index) => (
                        <Badge key={index} variant="info" size="sm">
                          {specialty}
                        </Badge>
                      ))}
                      {judge.specialties.length > 3 && (
                        <Badge variant="default" size="sm">
                          +{judge.specialties.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {judge.languages && judge.languages.length > 0 && (
                  <div className="flex items-center text-sm text-gray-400 mb-4">
                    <Languages className="h-4 w-4 mr-2" />
                    <span>{judge.languages.join(', ')}</span>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-700">
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">
                      {judge.total_questions_answered || 0}
                    </div>
                    <div className="text-xs text-gray-400">Questions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-yellow-400">
                      {judge.total_points || 0}
                    </div>
                    <div className="text-xs text-gray-400">Points</div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-2 text-sm text-gray-400">
                  {judge.average_response_time && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Temps de réponse: {formatResponseTime(judge.average_response_time)}</span>
                    </div>
                  )}

                  {judge.badges && judge.badges.length > 0 && (
                    <div className="flex items-center">
                      <Award className="h-4 w-4 mr-2" />
                      <span>{judge.badges.length} badge(s) obtenu(s)</span>
                    </div>
                  )}

                  <div className="flex items-center">
                    <Zap className="h-4 w-4 mr-2 text-green-400" />
                    <span className="text-green-400">Disponible maintenant</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}