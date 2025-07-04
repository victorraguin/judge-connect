import React from 'react'
import { Crown, ExternalLink, Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Message, Profile } from '../../types/database'
import { Badge } from '../ui/Badge'

interface MessageBubbleProps {
  message: Message & { sender: Profile }
  isOwn: boolean
  isJudge: boolean
}

export function MessageBubble({ message, isOwn, isJudge }: MessageBubbleProps) {
  const cardData = message.metadata?.card

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Sender info */}
        {!isOwn && (
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {message.sender.full_name?.charAt(0) || message.sender.email.charAt(0)}
            </div>
            <span className="text-sm text-gray-400">
              {message.sender.full_name || message.sender.email}
            </span>
            {isJudge && (
              <Badge variant="judge-l1" size="sm">
                <Crown className="h-3 w-3 mr-1" />
                Juge
              </Badge>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`rounded-lg px-4 py-2 ${
            isOwn
              ? 'bg-blue-600 text-white'
              : message.message_type === 'system'
              ? 'bg-gray-700/50 text-gray-300 border border-gray-600'
              : 'bg-gray-700 text-white'
          }`}
        >
          {/* Card display */}
          {cardData && (
            <div className="mb-3 bg-gray-800/50 rounded-lg p-3 border border-gray-600">
              <div className="flex items-start space-x-3">
                {cardData.image_url && (
                  <img
                    src={cardData.image_url}
                    alt={cardData.name}
                    className="w-16 h-22 object-cover rounded border border-gray-500"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-sm mb-1">
                    {cardData.name}
                  </h4>
                  {cardData.mana_cost && (
                    <p className="text-xs text-gray-400 mb-1">
                      Coût: {cardData.mana_cost}
                    </p>
                  )}
                  {cardData.type_line && (
                    <p className="text-xs text-gray-400 mb-1">
                      {cardData.type_line}
                    </p>
                  )}
                  {cardData.oracle_text && (
                    <p className="text-xs text-gray-300 line-clamp-3">
                      {cardData.oracle_text}
                    </p>
                  )}
                  {cardData.scryfall_url && (
                    <a
                      href={cardData.scryfall_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-blue-400 hover:text-blue-300 mt-1"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Voir sur Scryfall
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Message content */}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}

          {/* Image */}
          {message.image_url && (
            <img
              src={message.image_url}
              alt="Message attachment"
              className="max-w-full rounded mt-2 border border-gray-600"
            />
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
          {formatDistanceToNow(new Date(message.created_at), {
            addSuffix: true,
            locale: fr
          })}
          {message.read_at && isOwn && (
            <span className="ml-1">
              <Eye className="h-3 w-3 inline" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}