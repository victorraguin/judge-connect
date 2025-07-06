import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Message, Profile, Conversation } from '../types/database'

interface UseRealtimeConversationProps {
  conversationId: string | null
}

export function useRealtimeConversation({ conversationId }: UseRealtimeConversationProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<(Message & { sender: Profile })[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const channelRef = useRef<any>(null)
  const presenceRef = useRef<any>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Load initial messages
  useEffect(() => {
    if (conversationId) {
      loadMessages()
      loadConversation()
    }
  }, [conversationId])

  // Set up realtime subscriptions
  useEffect(() => {
    if (!conversationId || !user) return

    // Clean up existing subscriptions
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }
    if (presenceRef.current) {
      presenceRef.current.unsubscribe()
    }

    // Messages subscription
    channelRef.current = supabase
      .channel(`conversation-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        console.log('New message received:', payload.new)
        
        // Load sender info
        const { data: sender } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', payload.new.sender_id)
          .single()

        const newMessage = {
          ...payload.new,
          sender: sender
        } as Message & { sender: Profile }

        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === newMessage.id)) {
            return prev
          }
          return [...prev, newMessage]
        })

        // Mark as read if not sent by current user
        if (payload.new.sender_id !== user.id) {
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', payload.new.id)
        }

        // Play notification sound for new messages
        if (payload.new.sender_id !== user.id) {
          playNotificationSound()
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log('Message updated:', payload.new)
        setMessages(prev => prev.map(msg => 
          msg.id === payload.new.id 
            ? { ...msg, ...payload.new }
            : msg
        ))
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        console.log('Conversation updated:', payload.new)
        setConversation(prev => prev ? { ...prev, ...payload.new } : null)
      })
      .subscribe()

    // Presence subscription for online users and typing indicators
    presenceRef.current = supabase
      .channel(`presence-conversation-${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceRef.current.presenceState()
        const users = Object.keys(state).map(key => state[key][0]?.user_id).filter(Boolean)
        setOnlineUsers(users)
        console.log('Online users:', users)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', leftPresences)
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== user.id) {
          setTypingUsers(prev => {
            if (!prev.includes(payload.user_id)) {
              return [...prev, payload.user_id]
            }
            return prev
          })
          
          // Remove typing indicator after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(id => id !== payload.user_id))
          }, 3000)
        }
      })
      .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
        setTypingUsers(prev => prev.filter(id => id !== payload.user_id))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence
          await presenceRef.current.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
      if (presenceRef.current) {
        presenceRef.current.unsubscribe()
      }
    }
  }, [conversationId, user])

  const loadMessages = async () => {
    if (!conversationId) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const loadConversation = async () => {
    if (!conversationId) return

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          question:questions!conversations_question_id_fkey(
            *,
            user:profiles!questions_user_id_fkey(*)
          ),
          user:profiles!conversations_user_id_fkey(*),
          judge:profiles!conversations_judge_id_fkey(*)
        `)
        .eq('id', conversationId)
        .single()

      if (error) throw error
      setConversation(data)
    } catch (error) {
      console.error('Error loading conversation:', error)
    }
  }

  const sendMessage = async (content: string, metadata?: any) => {
    if (!conversationId || !user || !content.trim()) return

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: 'text',
          metadata: metadata || null
        })

      if (error) throw error

      // Update conversation last message time
      await supabase
        .from('conversations')
        .update({ 
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      // Stop typing indicator
      if (presenceRef.current) {
        presenceRef.current.send({
          type: 'broadcast',
          event: 'stop_typing',
          payload: { user_id: user.id }
        })
      }

    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  const sendTypingIndicator = () => {
    if (!presenceRef.current || !user) return

    presenceRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user.id }
    })

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      presenceRef.current?.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { user_id: user.id }
      })
    }, 3000)
  }

  const playNotificationSound = () => {
    try {
      // Create a simple notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (error) {
      console.log('Could not play notification sound:', error)
    }
  }

  return {
    messages,
    conversation,
    onlineUsers,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
    loadMessages,
    loadConversation
  }
}