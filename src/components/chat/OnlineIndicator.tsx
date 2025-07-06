import React from 'react'
import { Circle } from 'lucide-react'

interface OnlineIndicatorProps {
  onlineUsers: string[]
  currentUserId: string
  otherUserId: string
  otherUserName: string
}

export function OnlineIndicator({ onlineUsers, currentUserId, otherUserId, otherUserName }: OnlineIndicatorProps) {
  const isOtherUserOnline = onlineUsers.includes(otherUserId)
  
  if (otherUserId === currentUserId) return null

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className="relative">
        <Circle 
          className={`h-3 w-3 ${isOtherUserOnline ? 'text-green-400 fill-current' : 'text-gray-400'}`} 
        />
        {isOtherUserOnline && (
          <div className="absolute inset-0 h-3 w-3 bg-green-400 rounded-full animate-ping opacity-75"></div>
        )}
      </div>
      <span className={isOtherUserOnline ? 'text-green-400' : 'text-gray-400'}>
        {otherUserName} {isOtherUserOnline ? 'en ligne' : 'hors ligne'}
      </span>
    </div>
  )
}