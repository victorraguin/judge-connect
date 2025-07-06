// src/components/questions/QuestionCard.tsx
import React from 'react'
import { Clock, User, Tag, Globe, Lock, ThumbsUp, MessageSquare, ArrowRight, Crown, AlertCircle, CheckCircle } from 'lucide-react'
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
        return 'info'
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting_for_judge':
        return <Clock className="h-3 w-3" />
      case 'assigned':
        return <Crown className="h-3 w-3" />
      case 'in_progress':
        return <MessageSquare className="h-3 w-3" />
      case 'completed':
        return <CheckCircle className="h-3 w-3" />
      case 'disputed':
        return <AlertCircle className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const hasConversation = question.status !== 'waiting_for_judge'
  
  // Calculate if question is about to expire (less than 2 minutes left)
  const isExpiringSoon = () => {
    if (!question.timeout_at || question.status !== 'waiting_for_judge') return false
    const timeLeft = new Date(question.timeout_at).getTime() - new Date().getTime()
    return timeLeft < 2 * 60 * 1000 && timeLeft > 0 // Less than 2 minutes
  }

  const isExpired = () => {
    if (!question.timeout_at || question.status !== 'waiting_for_judge') return false
    return new Date(question.timeout_at).getTime() <= new Date().getTime()
  }

  const getTimeRemaining = () => {
    if (!question.timeout_at || question.status !== 'waiting_for_judge') return null
    const timeLeft = new Date(question.timeout_at).getTime() - new Date().getTime()
    if (timeLeft <= 0) return 'Expiré'
    
    const minutes = Math.floor(timeLeft / 60000)
    const seconds = Math.floor((timeLeft % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const timeRemaining = getTimeRemaining()

  return (
    <div
      className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 transition-all duration-300 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 card-hover group ${
        onClick ? 'cursor-pointer' : ''
      } ${isExpired() ? 'opacity-60' : ''} ${isExpiringSoon() ? 'border-yellow-500/50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors line-clamp-2">
              {question.title}
            </h3>
            {question.is_public ? (
              <Globe className="h-4 w-4 text-green-400 flex-shrink-0" title="Question publique" />
            ) : (
              <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" title="Question privée" />
            )}
            {onClick && hasConversation && (
              <ArrowRight className="h-4 w-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            )}
          </div>
          <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed mb-3">{question.content}</p>
        </div>
        
        <div className="flex flex-col items-end space-y-2 ml-4">
          <Badge variant={getStatusVariant(question.status)} className="flex items-center space-x-1">
            {getStatusIcon(question.status)}
            <span>{getStatusLabel(question.status)}</span>
          </Badge>
          
          {/* Timeout indicator for waiting questions */}
          {question.status === 'waiting_for_judge' && timeRemaining && (
            <div className={`text-xs font-mono px-2 py-1 rounded ${
              isExpired() ? 'bg-red-900/50 text-red-400' :
              isExpiringSoon() ? 'bg-yellow-900/50 text-yellow-400 animate-pulse' :
              'bg-blue-900/50 text-blue-400'
            }`}>
              ⏰ {timeRemaining}
            </div>
          )}
        </div>
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
          {question.assigned_judge && (
            <div className="flex items-center">
              <Crown className="h-4 w-4 mr-1 text-yellow-400" />
              <span>{question.assigned_judge.full_name || question.assigned_judge.email}</span>
            </div>
          )}
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
                {question.status === 'completed' ? 'Voir la résolution' : 'Ouvrir le chat'}
              </span>
            </div>
          )}
          
          {!hasConversation && showChatIndicator && question.status === 'waiting_for_judge' && (
            <div className="flex items-center space-x-1 text-yellow-400">
              <Clock className="h-4 w-4" />
              <span className="text-xs">
                {isExpired() ? 'Expiré' : 'En attente'}
              </span>
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

      {/* Progress indicators for different statuses */}
      {question.status === 'assigned' && question.assigned_at && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center text-xs text-gray-400">
            <Crown className="h-3 w-3 mr-1 text-blue-400" />
            <span>
              Assignée {formatDistanceToNow(new Date(question.assigned_at), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          </div>
        </div>
      )}

      {question.status === 'completed' && question.completed_at && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center text-xs text-gray-400">
            <CheckCircle className="h-3 w-3 mr-1 text-green-400" />
            <span>
              Résolue {formatDistanceToNow(new Date(question.completed_at), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}