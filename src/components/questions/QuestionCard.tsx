import React from 'react'
import { Clock, User, Tag, Globe, Lock, ThumbsUp, Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Question } from '../../types/database'
import { Badge } from '../ui/Badge'

interface QuestionCardProps {
  question: Question
  onClick?: () => void
  showActions?: boolean
}

export function QuestionCard({ question, onClick, showActions = false }: QuestionCardProps) {
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
        return 'En attente de juge'
      case 'assigned':
        return 'Assignée'
      case 'in_progress':
        return 'En cours'
      case 'completed':
        return 'Résolue'
      case 'disputed':
        return 'En dispute'
      case 'resolved':
        return 'Résolue'
      default:
        return status
    }
  }

  return (
    <div
      className={`bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6 transition-all duration-300 hover:border-blue-500/50 card-hover ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-white">{question.title}</h3>
            {question.is_public ? (
              <Globe className="h-4 w-4 text-green-400" title="Question publique" />
            ) : (
              <Lock className="h-4 w-4 text-gray-400" title="Question privée" />
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