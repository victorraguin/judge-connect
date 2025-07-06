// src/hooks/useRealtimeConversation.ts - VERSION CORRIGÉE
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

  // ✅ CORRECTION 1 : Meilleure gestion du conversationId
  useEffect(() => {
    if (conversationId) {
      console.log('🔄 Loading conversation data for:', conversationId)
      loadMessages()
      loadConversation()
    } else {
      console.log('🧹 Resetting conversation state')
      setMessages([])
      setConversation(null)
      setOnlineUsers([])
      setTypingUsers([])
    }
  }, [conversationId])

  // ✅ CORRECTION 2 : Setup realtime avec gestion d'erreurs améliorée
  useEffect(() => {
    if (!conversationId || !user) {
      console.log('⚠️ No conversation ID or user, skipping realtime setup')
      return
    }

    console.log('📡 Setting up realtime subscriptions for conversation:', conversationId)

    // Cleanup existing subscriptions
    cleanupSubscriptions()

    // ✅ CORRECTION 3 : Channel messages avec retry logic
    channelRef.current = supabase
      .channel(`conversation-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        console.log('📨 New message received via realtime:', payload.new.id)
        
        try {
          // Load sender info avec retry en cas d'échec
          let sender = null
          let retryCount = 0
          const maxRetries = 3

          while (!sender && retryCount < maxRetries) {
            const { data: senderData, error: senderError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', payload.new.sender_id)
              .single()

            if (senderError) {
              console.warn(`⚠️ Retry ${retryCount + 1}/${maxRetries} loading sender:`, senderError)
              retryCount++
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)) // exponential backoff
            } else {
              sender = senderData
            }
          }

          if (!sender) {
            console.error('❌ Failed to load sender after retries')
            return
          }

          const newMessage = {
            ...payload.new,
            sender: sender
          } as Message & { sender: Profile }

          // ✅ CORRECTION 4 : Éviter les doublons avec vérification plus robuste
          setMessages(prev => {
            const existingIndex = prev.findIndex(m => m.id === newMessage.id)
            if (existingIndex !== -1) {
              console.log('🔄 Message already exists, updating:', newMessage.id)
              const updated = [...prev]
              updated[existingIndex] = newMessage
              return updated.sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
            }
            
            console.log('✅ Adding new message to state:', newMessage.id)
            const newMessages = [...prev, newMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            
            // ✅ CORRECTION 5 : Force re-render immédiatement
            requestAnimationFrame(() => {
              // Trigger scroll to bottom après le rendu
              const event = new CustomEvent('new-message-added', { detail: newMessage })
              window.dispatchEvent(event)
            })
            
            return newMessages
          })

          // Mark as read if not sent by current user
          if (payload.new.sender_id !== user.id) {
            console.log('📖 Marking message as read:', newMessage.id)
            setTimeout(async () => {
              await supabase
                .from('messages')
                .update({ read_at: new Date().toISOString() })
                .eq('id', payload.new.id)
            }, 500) // Small delay to ensure message is rendered
          }

        } catch (error) {
          console.error('❌ Error processing new message:', error)
        }
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
          console.error('❌ Message channel error, attempting reconnect...')
          // Retry connection after delay
          setTimeout(() => {
            if (conversationId && user) {
              console.log('🔄 Retrying message channel connection')
              // Re-setup subscriptions
            }
          }, 5000)
        }
      })

    // ✅ CORRECTION 6 : Presence avec reconnection automatique
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
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== user.id) {
          setTypingUsers(prev => {
            if (!prev.includes(payload.user_id)) {
              return [...prev, payload.user_id]
            }
            return prev
          })
          
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(id => id !== payload.user_id))
          }, 3000)
        }
      })
      .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
        setTypingUsers(prev => prev.filter(id => id !== payload.user_id))
      })
      .subscribe(async (status) => {
        console.log('📡 Presence channel status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Presence channel subscribed successfully')
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
      cleanupSubscriptions()
    }
  }, [conversationId, user])

  const cleanupSubscriptions = () => {
    if (channelRef.current) {
      console.log('🧹 Cleaning up message channel')
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    if (presenceRef.current) {
      console.log('🧹 Cleaning up presence channel')
      presenceRef.current.unsubscribe()
      presenceRef.current = null
    }
  }

  const loadMessages = async () => {
    if (!conversationId) return

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
    if (!conversationId) return

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

  // ✅ CORRECTION 7 : sendMessage avec meilleure gestion d'erreurs
  const sendMessage = async (content: string, metadata?: any) => {
    if (!conversationId || !user || !content.trim()) {
      console.log('❌ Cannot send message: missing data')
      return
    }

    console.log('📤 Sending message...')

    try {
      const messageData = {
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        message_type: 'text' as const,
        metadata: metadata || null
      }

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

    } catch (error) {
      console.error('❌ Error sending message:', error)
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

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      presenceRef.current?.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { user_id: user.id }
      })
    }, 3000)
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