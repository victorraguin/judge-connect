import React from 'react'
import { Clock, User, Tag, Globe, Lock, ThumbsUp, MessageSquare, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Question } from '../../types/database'
import { Badge } from '../ui/Badge'

interface QuestionCardProps {
  question: Question
  onClick?: () => void
  showActions?: boolean
  showChatIndicator?: boolean
}

export function QuestionCard({ question, onClick, showActions = false, showChatIndicator = true }: QuestionCardProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'waiting_for_judge':
        return 'warning'
      case 'assigned':
      case 'in_progress':
        return 'info'
      case 'completed':
        return 'success'
      case 'disputed':
        return 'danger'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting_for_judge':
        return '🕐 En attente de juge'
      case 'assigned':
        return '⚖️ Juge assigné'
      case 'in_progress':
        return '💬 En cours de traitement'
      case 'completed':
        return '✅ Résolue'
      case 'disputed':
        return '⚠️ En dispute'
      case 'resolved':
        return '✅ Résolue'
      default:
        return status
    }
  }
  const hasConversation = question.status !== 'waiting_for_judge'

  return (
    <div
      className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 transition-all duration-300 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 card-hover group ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">{question.title}</h3>
            {question.is_public ? (
              <Globe className="h-4 w-4 text-green-400" title="Question publique" />
            ) : (
              <Lock className="h-4 w-4 text-gray-400" title="Question privée" />
            )}
            {onClick && hasConversation && (
              <ArrowRight className="h-4 w-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
          <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed">{question.content}</p>
        </div>
        <Badge variant={getStatusVariant(question.status)}>
          {getStatusLabel(question.status)}
        </Badge>
      </div>

      {question.image_url && (
        <div className="mb-4">
          <img
            src={question.image_url}
            alt="Question attachment"
            className="w-full h-32 object-cover rounded-md border border-gray-600"
          />
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Tag className="h-4 w-4 mr-1" />
            <span>{question.category}</span>
          </div>
          <div className="flex items-center">
            <User className="h-4 w-4 mr-1" />
            <span>{question.user?.full_name || question.user?.email}</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {question.is_public && (
            <div className="flex items-center space-x-1">
              <ThumbsUp className="h-4 w-4" />
              <span>0</span>
            </div>
          )}
          {hasConversation && showChatIndicator && (
            <div className="flex items-center space-x-1 text-blue-400">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs group-hover:font-medium transition-all">
                {question.status === 'waiting_for_judge' ? 'Voir la question' : 'Ouvrir le chat'}
              </span>
            </div>
          )}
          {!hasConversation && showChatIndicator && question.status === 'waiting_for_judge' && (
            <div className="flex items-center space-x-1 text-yellow-400">
              <Clock className="h-4 w-4" />
              <span className="text-xs">En attente</span>
            </div>
          )}
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>
              {formatDistanceToNow(new Date(question.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}