import React, { useState } from 'react'
import { Bell, X, Check, CheckCheck, Clock, MessageSquare, Crown, Star } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtimeNotifications()
  const [isOpen, setIsOpen] = useState(false)

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'question_assigned':
        return <Crown className="h-4 w-4 text-blue-400" />
      case 'question_answered':
        return <MessageSquare className="h-4 w-4 text-green-400" />
      case 'question_completed':
        return <Check className="h-4 w-4 text-green-400" />
      case 'rating_received':
        return <Star className="h-4 w-4 text-yellow-400" />
      case 'reward_earned':
        return <Star className="h-4 w-4 text-purple-400" />
      default:
        return <Bell className="h-4 w-4 text-gray-400" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'question_assigned':
        return 'border-l-blue-500'
      case 'question_answered':
        return 'border-l-green-500'
      case 'question_completed':
        return 'border-l-green-500'
      case 'rating_received':
        return 'border-l-yellow-500'
      case 'reward_earned':
        return 'border-l-purple-500'
      default:
        return 'border-l-gray-500'
    }
  }

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    // Navigate based on notification data
    if (notification.data?.url) {
      window.location.href = notification.data.url
    }
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-blue-400" />
                <h3 className="font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge variant="info" size="sm">
                    {unreadCount} nouvelles
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Tout lire
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-700/50 cursor-pointer transition-colors border-l-4 ${getNotificationColor(notification.type)} ${
                        !notification.read ? 'bg-blue-900/10' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h4 className={`text-sm font-medium ${
                              !notification.read ? 'text-white' : 'text-gray-300'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-2"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                            {notification.content}
                          </p>
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: fr
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-700 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-400 hover:text-white"
                  onClick={() => {
                    setIsOpen(false)
                    // Navigate to notifications page if you have one
                  }}
                >
                  Voir toutes les notifications
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}