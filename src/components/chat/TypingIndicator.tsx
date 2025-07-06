import React from 'react'

interface TypingIndicatorProps {
  typingUsers: string[]
  userProfiles: { [key: string]: { full_name?: string; email: string } }
}

export function TypingIndicator({ typingUsers, userProfiles }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      const user = userProfiles[typingUsers[0]]
      const name = user?.full_name || user?.email || 'Quelqu\'un'
      return `${name} est en train d'écrire...`
    } else if (typingUsers.length === 2) {
      const user1 = userProfiles[typingUsers[0]]
      const user2 = userProfiles[typingUsers[1]]
      const name1 = user1?.full_name || user1?.email || 'Quelqu\'un'
      const name2 = user2?.full_name || user2?.email || 'Quelqu\'un'
      return `${name1} et ${name2} sont en train d'écrire...`
    } else {
      return `${typingUsers.length} personnes sont en train d'écrire...`
    }
  }

  return (
    <div className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-400">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <span>{getTypingText()}</span>
    </div>
  )
}