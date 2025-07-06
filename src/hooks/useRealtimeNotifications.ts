import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Notification {
  id: string
  user_id: string
  title: string
  content: string
  type: string
  data?: any
  read: boolean
  created_at: string
}

export function useRealtimeNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Load initial notifications
  const loadNotifications = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.read).length || 0)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return

    loadNotifications()

    const subscription = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newNotification = payload.new as Notification
        console.log('New notification received:', newNotification)
        
        setNotifications(prev => [newNotification, ...prev])
        setUnreadCount(prev => prev + 1)
        
        // Show browser notification if permission granted
        showBrowserNotification(newNotification)
        
        // Play notification sound
        playNotificationSound()
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const updatedNotification = payload.new as Notification
        console.log('Notification updated:', updatedNotification)
        
        setNotifications(prev => prev.map(n => 
          n.id === updatedNotification.id ? updatedNotification : n
        ))
        
        // Update unread count
        if (updatedNotification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user, loadNotifications])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const createNotification = async (notification: Omit<Notification, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          ...notification,
          read: false
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  const showBrowserNotification = (notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.content,
        icon: '/vite.svg', // You can replace with your app icon
        badge: '/vite.svg',
        tag: notification.id,
        requireInteraction: false,
        silent: false
      })

      // Auto close after 5 seconds
      setTimeout(() => {
        browserNotification.close()
      }, 5000)

      // Handle click
      browserNotification.onclick = () => {
        window.focus()
        markAsRead(notification.id)
        
        // Navigate based on notification type
        if (notification.data?.url) {
          window.location.href = notification.data.url
        }
        
        browserNotification.close()
      }
    }
  }

  const playNotificationSound = () => {
    try {
      // Create a pleasant notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Create a pleasant two-tone notification
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime) // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1) // E5
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.log('Could not play notification sound:', error)
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    createNotification,
    loadNotifications
  }
}