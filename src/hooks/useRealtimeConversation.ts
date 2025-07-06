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

  // ✅ CORRECTION 1 : Utiliser conversationId directement
  useEffect(() => {
    if (conversationId) {
      console.log('Loading conversation data for:', conversationId)
      loadMessages()
      loadConversation()
    } else {
      // Reset state when no conversation
      setMessages([])
      setConversation(null)
      setOnlineUsers([])
      setTypingUsers([])
    }
  }, [conversationId]) // Utiliser conversationId directement

  // ✅ CORRECTION 2 : Améliorer la gestion des subscriptions
  useEffect(() => {
    if (!conversationId || !user) {
      console.log('No conversation ID or user, skipping realtime setup')
      return
    }

    console.log('Setting up realtime subscriptions for conversation:', conversationId)

    // Clean up existing subscriptions
    if (channelRef.current) {
      console.log('Cleaning up existing channel subscription')
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    if (presenceRef.current) {
      console.log('Cleaning up existing presence subscription')
      presenceRef.current.unsubscribe()
      presenceRef.current = null
    }

    // ✅ CORRECTION 3 : Subscription plus robuste pour les messages
    channelRef.current = supabase
      .channel(`conversation-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        console.log('📨 New message received via realtime:', payload.new)
        
        try {
          // Load sender info avec gestion d'erreur
          const { data: sender, error: senderError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.sender_id)
            .single()

          if (senderError) {
            console.error('Error loading sender info:', senderError)
            return
          }

          const newMessage = {
            ...payload.new,
            sender: sender
          } as Message & { sender: Profile }

          console.log('Adding new message to state:', newMessage.id)

          setMessages(prev => {
            // ✅ CORRECTION 4 : Éviter les doublons plus efficacement
            const exists = prev.find(m => m.id === newMessage.id)
            if (exists) {
              console.log('Message already exists, skipping:', newMessage.id)
              return prev
            }
            
            console.log('Adding new message to state:', newMessage.id)
            return [...prev, newMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          })

          // Mark as read if not sent by current user
          if (payload.new.sender_id !== user.id) {
            console.log('Marking message as read:', newMessage.id)
            await supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', payload.new.id)

            // Play notification sound for new messages
            playNotificationSound()
          }
        } catch (error) {
          console.error('Error processing new message:', error)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log('📝 Message updated:', payload.new.id)
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
        console.log('💬 Conversation updated:', payload.new)
        setConversation(prev => prev ? { ...prev, ...payload.new } : null)
      })
      .subscribe((status) => {
        console.log('📡 Message channel status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Message channel subscribed successfully')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Message channel error')
        }
      })

    // ✅ CORRECTION 5 : Presence avec meilleure gestion d'erreurs
    presenceRef.current = supabase
      .channel(`presence-conversation-${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceRef.current?.presenceState()
        if (state) {
          const users = Object.keys(state).map(key => state[key][0]?.user_id).filter(Boolean)
          console.log('👥 Online users updated:', users)
          setOnlineUsers(users)
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('👋 User joined:', newPresences)
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('👋 User left:', leftPresences)
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        console.log('⌨️ User typing:', payload.user_id)
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
        console.log('⌨️ User stopped typing:', payload.user_id)
        setTypingUsers(prev => prev.filter(id => id !== payload.user_id))
      })
      .subscribe(async (status) => {
        console.log('📡 Presence channel status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Presence channel subscribed successfully')
          // Track presence
          try {
            await presenceRef.current?.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            })
            console.log('📍 Presence tracked successfully')
          } catch (error) {
            console.error('❌ Error tracking presence:', error)
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Presence channel error')
        }
      })

    return () => {
      console.log('🧹 Cleaning up realtime subscriptions')
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      if (presenceRef.current) {
        presenceRef.current.unsubscribe()
        presenceRef.current = null
      }
    }
  }, [conversationId, user])

  const loadMessages = async () => {
    if (!conversationId) {
      console.log('No conversation ID, skipping message loading')
      return
    }

    console.log('📥 Loading messages for conversation:', conversationId)

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('❌ Error loading messages:', error)
        throw error
      }

      console.log(`✅ Loaded ${data?.length || 0} messages`)
      setMessages(data || [])
    } catch (error) {
      console.error('❌ Error loading messages:', error)
    }
  }

  const loadConversation = async () => {
    if (!conversationId) {
      console.log('No conversation ID, skipping conversation loading')
      return
    }

    console.log('💬 Loading conversation:', conversationId)

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

      if (error) {
        console.error('❌ Error loading conversation:', error)
        throw error
      }

      console.log('✅ Conversation loaded successfully')
      setConversation(data)
    } catch (error) {
      console.error('❌ Error loading conversation:', error)
    }
  }

  // ✅ CORRECTION 6 : Améliorer la fonction sendMessage
  const sendMessage = async (content: string, metadata?: any) => {
    if (!conversationId || !user || !content.trim()) {
      console.log('Cannot send message: missing data', { conversationId, user: !!user, content: content.trim() })
      return
    }

    console.log('📤 Sending message:', content.substring(0, 50) + '...')

    try {
      const messageData = {
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        message_type: 'text' as const,
        metadata: metadata || null
      }

      console.log('📤 Message data:', messageData)

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(*)
        `)
        .single()

      if (error) {
        console.error('❌ Error sending message:', error)
        throw error
      }

      console.log('✅ Message sent successfully:', data.id)

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

      // ✅ CORRECTION 7 : Ajouter immédiatement le message localement pour un feedback immédiat
      setMessages(prev => {
        const exists = prev.find(m => m.id === data.id)
        if (exists) return prev
        
        return [...prev, data].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      })

    } catch (error) {
      console.error('❌ Error sending message:', error)
      throw error
    }
  }

  const sendTypingIndicator = () => {
    if (!presenceRef.current || !user) {
      console.log('Cannot send typing indicator: missing presence or user')
      return
    }

    console.log('⌨️ Sending typing indicator')

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
      console.log('⌨️ Auto-stopping typing indicator')
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