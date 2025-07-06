import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface RewardNotification {
  id: string
  user_id: string
  type: 'points' | 'badge' | 'level_up' | 'achievement' | 'bonus'
  title: string
  description: string
  points?: number
  badge_name?: string
  level?: string
  icon?: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  read: boolean
  created_at: string
  metadata?: any
}

export function useRewardNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<RewardNotification[]>([])
  const [currentNotification, setCurrentNotification] = useState<RewardNotification | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load unread notifications
  const loadUnreadNotifications = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('reward_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })

      if (error) throw error

      setNotifications(data || [])
      
      // Show the first unread notification
      if (data && data.length > 0 && !showModal) {
        setCurrentNotification(data[0])
        setShowModal(true)
      }
    } catch (error) {
      console.error('Error loading reward notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [user, showModal])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('reward_notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      // Show next notification if any
      const remainingNotifications = notifications.filter(n => n.id !== notificationId)
      if (remainingNotifications.length > 0) {
        setCurrentNotification(remainingNotifications[0])
      } else {
        setCurrentNotification(null)
        setShowModal(false)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [notifications])

  // Create a new reward notification
  const createRewardNotification = useCallback(async (reward: Omit<RewardNotification, 'id' | 'user_id' | 'read' | 'created_at'>) => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('reward_notifications')
        .insert({
          user_id: user.id,
          ...reward,
          read: false
        })
        .select()
        .single()

      if (error) throw error

      // Add to local state and show immediately if no modal is open
      if (data) {
        setNotifications(prev => [data, ...prev])
        
        if (!showModal) {
          setCurrentNotification(data)
          setShowModal(true)
        }
      }

      return data
    } catch (error) {
      console.error('Error creating reward notification:', error)
      throw error
    }
  }, [user, showModal])

  // Subscribe to new reward notifications
  useEffect(() => {
    if (!user) return

    const subscription = supabase
      .channel(`reward-notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reward_notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newNotification = payload.new as RewardNotification
        
        setNotifications(prev => [newNotification, ...prev])
        
        // Show notification if no modal is currently open
        if (!showModal) {
          setCurrentNotification(newNotification)
          setShowModal(true)
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user, showModal])

  // Load notifications on mount
  useEffect(() => {
    loadUnreadNotifications()
  }, [loadUnreadNotifications])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setCurrentNotification(null)
  }, [])

  return {
    notifications,
    currentNotification,
    showModal,
    loading,
    markAsRead,
    createRewardNotification,
    closeModal,
    unreadCount: notifications.length
  }
}