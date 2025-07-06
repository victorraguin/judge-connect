import React, { useState } from 'react'
import { X, Gift, Star, Trophy, Zap, Crown } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

interface Reward {
  id: string
  type: 'points' | 'badge' | 'level_up' | 'achievement' | 'bonus'
  title: string
  description: string
  points?: number
  badge_name?: string
  level?: string
  icon?: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  created_at: string
}

interface RewardNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  reward: Reward
  onMarkAsRead: (rewardId: string) => void
}

export function RewardNotificationModal({ 
  isOpen, 
  onClose, 
  reward, 
  onMarkAsRead 
}: RewardNotificationModalProps) {
  const [isClosing, setIsClosing] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    setIsClosing(true)
    onMarkAsRead(reward.id)
    setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 300)
  }

  const getRewardIcon = (type: string, icon?: string) => {
    if (icon) return icon
    
    switch (type) {
      case 'points':
        return '💎'
      case 'badge':
        return '🏆'
      case 'level_up':
        return '⬆️'
      case 'achievement':
        return '🎯'
      case 'bonus':
        return '🎁'
      default:
        return '⭐'
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'from-gray-500 to-gray-600'
      case 'rare':
        return 'from-blue-500 to-blue-600'
      case 'epic':
        return 'from-purple-500 to-purple-600'
      case 'legendary':
        return 'from-yellow-400 to-orange-500'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'border-gray-500'
      case 'rare':
        return 'border-blue-500'
      case 'epic':
        return 'border-purple-500'
      case 'legendary':
        return 'border-yellow-400'
      default:
        return 'border-gray-500'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'points':
        return 'Points gagnés'
      case 'badge':
        return 'Nouveau badge'
      case 'level_up':
        return 'Niveau supérieur'
      case 'achievement':
        return 'Succès débloqué'
      case 'bonus':
        return 'Bonus spécial'
      default:
        return 'Récompense'
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm transition-opacity duration-300" 
          onClick={handleClose}
        />
        
        <div className={`relative transform transition-all duration-300 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}>
          <div className={`bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border-2 ${getRarityBorder(reward.rarity)} overflow-hidden`}>
            
            {/* Animated Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${getRarityColor(reward.rarity)} opacity-10 animate-pulse`} />
            
            {/* Header with sparkles animation */}
            <div className="relative p-6 text-center">
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute animate-ping"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${2 + Math.random() * 2}s`
                    }}
                  >
                    ✨
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Main Icon */}
              <div className={`mx-auto w-20 h-20 bg-gradient-to-br ${getRarityColor(reward.rarity)} rounded-full flex items-center justify-center mb-4 shadow-lg transform animate-bounce`}>
                <span className="text-3xl">{getRewardIcon(reward.type, reward.icon)}</span>
              </div>

              {/* Type Badge */}
              <Badge 
                variant={reward.rarity === 'legendary' ? 'warning' : reward.rarity === 'epic' ? 'info' : 'success'} 
                className="mb-3"
              >
                {getTypeLabel(reward.type)}
              </Badge>

              {/* Title */}
              <h3 className="text-2xl font-bold text-white mb-2">
                🎉 {reward.title}
              </h3>

              {/* Description */}
              <p className="text-gray-300 leading-relaxed">
                {reward.description}
              </p>

              {/* Points Display */}
              {reward.points && (
                <div className="mt-4 p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-2xl">💎</span>
                    <span className="text-xl font-bold text-blue-400">+{reward.points}</span>
                    <span className="text-sm text-gray-300">points</span>
                  </div>
                </div>
              )}

              {/* Badge Name */}
              {reward.badge_name && (
                <div className="mt-4 p-3 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                  <div className="flex items-center justify-center space-x-2">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    <span className="font-semibold text-yellow-400">{reward.badge_name}</span>
                  </div>
                </div>
              )}

              {/* Level Display */}
              {reward.level && (
                <div className="mt-4 p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
                  <div className="flex items-center justify-center space-x-2">
                    <Crown className="h-5 w-5 text-purple-400" />
                    <span className="font-semibold text-purple-400">Niveau {reward.level}</span>
                  </div>
                </div>
              )}

              {/* Rarity Indicator */}
              <div className="mt-4 flex items-center justify-center space-x-1">
                {[...Array(reward.rarity === 'legendary' ? 5 : reward.rarity === 'epic' ? 4 : reward.rarity === 'rare' ? 3 : 2)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-4 w-4 fill-current ${
                      reward.rarity === 'legendary' ? 'text-yellow-400' :
                      reward.rarity === 'epic' ? 'text-purple-400' :
                      reward.rarity === 'rare' ? 'text-blue-400' : 'text-gray-400'
                    }`} 
                  />
                ))}
                <span className="ml-2 text-sm text-gray-400 capitalize">{reward.rarity}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 pt-0">
              <Button
                onClick={handleClose}
                className="w-full py-3 text-lg rounded-xl"
                variant="primary"
              >
                <span className="mr-2">🚀</span>
                Génial ! Continuer
              </Button>
              
              <p className="text-center text-xs text-gray-500 mt-3">
                🎯 Continuez à participer pour débloquer plus de récompenses !
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}