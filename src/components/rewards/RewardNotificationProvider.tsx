import React from 'react'
import { useRewardNotifications } from '../../hooks/useRewardNotifications'
import { RewardNotificationModal } from './RewardNotificationModal'

interface RewardNotificationProviderProps {
  children: React.ReactNode
}

export function RewardNotificationProvider({ children }: RewardNotificationProviderProps) {
  const {
    currentNotification,
    showModal,
    markAsRead,
    closeModal
  } = useRewardNotifications()

  return (
    <>
      {children}
      
      {currentNotification && (
        <RewardNotificationModal
          isOpen={showModal}
          onClose={closeModal}
          reward={currentNotification}
          onMarkAsRead={markAsRead}
        />
      )}
    </>
  )
}