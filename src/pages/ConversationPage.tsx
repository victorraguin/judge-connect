import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Image, Paperclip, Star, Flag, CheckCircle, X, Search, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { CardSearchModal } from '../components/cards/CardSearchModal'
import { MessageBubble } from '../components/chat/MessageBubble'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Question, Conversation, Message, Profile } from '../types/database'

interface ConversationWithDetails extends Conversation {
  question: Question & { user: Profile }
  messages: (Message & { sender: Profile })[]
}

export function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [conversation, setConversation] = useState<ConversationWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [showCardSearch, setShowCardSearch] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [showRating, setShowRating] = useState(false)

  useEffect(() => {
    if (id) {
      loadConversation()
      subscribeToMessages()
    }
  }, [id])

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversation = async () => {
    if (!id) return

    try {
      setLoading(true)

      // First try to load existing conversation
      let { data: conversationData, error: convError } = await supabase
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
        .eq('id', id)
        .single()

      // If no conversation found, try to find by question ID and create one
      if (convError && convError.code === 'PGRST116') {
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .select(`
            *,
            user:profiles!questions_user_id_fkey(*)
          `)
          .eq('id', id)
          .single()

        if (questionError) throw questionError

        // Check if user can access this question
        const canAccess = questionData.user_id === user?.id || 
                         questionData.assigned_judge_id === user?.id ||
                         questionData.is_public ||
                         user?.profile?.role === 'admin' ||
                         (user?.profile?.role === 'judge' && questionData.status === 'waiting_for_judge')

        if (!canAccess) {
          navigate('/questions')
          return
        }

        // If it's a judge taking the question, create conversation and assign
        if (user?.profile?.role === 'judge' && questionData.status === 'waiting_for_judge') {
          // Update question status and assign judge
          await supabase
            .from('questions')
            .update({
              status: 'assigned',
              assigned_judge_id: user.id,
              assigned_at: new Date().toISOString()
            })
            .eq('id', questionData.id)

          // Create conversation
          const { data: newConversation, error: createError } = await supabase
            .from('conversations')
            .insert({
              question_id: questionData.id,
              user_id: questionData.user_id,
              judge_id: user.id,
              status: 'active'
            })
            .select()
            .single()

          if (createError) throw createError

          // Send system message
          await supabase
            .from('messages')
            .insert({
              conversation_id: newConversation.id,
              sender_id: user.id,
              content: `Bonjour ! Je suis ${user.profile?.full_name || 'votre juge'} et je vais vous aider avec votre question. N'hésitez pas à me donner plus de détails si nécessaire.`,
              message_type: 'system'
            })

          // Reload conversation
          const { data: updatedConversation } = await supabase
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
            .eq('id', newConversation.id)
            .single()

          conversationData = updatedConversation
        } else {
          // Just viewing the question, redirect to questions page
          navigate('/questions')
          return
        }
      }

      if (!conversationData) throw new Error('Conversation not found')

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(*)
        `)
        .eq('conversation_id', conversationData.id)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError

      setConversation({
        ...conversationData,
        messages: messagesData || []
      })

      // Mark messages as read
      if (messagesData?.length) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('conversation_id', conversationData.id)
          .neq('sender_id', user?.id)
          .is('read_at', null)
      }

    } catch (error) {
      console.error('Error loading conversation:', error)
      navigate('/questions')
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    if (!id) return

    const subscription = supabase
      .channel(`conversation-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${id}`
      }, async (payload) => {
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

        setConversation(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newMessage]
        } : null)
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !conversation || !user) return

    try {
      setSending(true)

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: messageText.trim(),
          message_type: 'text'
        })

      if (error) throw error

      // Update conversation last message time
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id)

      setMessageText('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const sendCardMessage = async (card: any) => {
    if (!conversation || !user) return

    try {
      const cardData = {
        name: card.name,
        image_url: card.image_uris?.normal || card.image_uris?.large,
        scryfall_url: card.scryfall_uri,
        mana_cost: card.mana_cost,
        type_line: card.type_line,
        oracle_text: card.oracle_text
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: `Carte partagée: ${card.name}`,
          message_type: 'text',
          metadata: { card: cardData }
        })

      if (error) throw error

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id)

    } catch (error) {
      console.error('Error sending card:', error)
    }
  }

  const completeConversation = async () => {
    if (!conversation || !user) return

    try {
      // Update conversation status
      await supabase
        .from('conversations')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', conversation.id)

      // Update question status
      await supabase
        .from('questions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', conversation.question.id)

      // Show rating modal if user
      if (user.id === conversation.user_id) {
        setShowRating(true)
      } else {
        navigate('/questions')
      }

    } catch (error) {
      console.error('Error completing conversation:', error)
    }
  }

  const submitRating = async () => {
    if (!conversation || !user || rating === 0) return

    try {
      await supabase
        .from('ratings')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          judge_id: conversation.judge_id,
          rating,
          feedback: feedback.trim() || null,
          is_accepted: true
        })

      // Award points to judge
      await supabase
        .from('rewards')
        .insert({
          judge_id: conversation.judge_id,
          points_earned: rating * 10, // 10 points per star
          reason: `Question résolue avec note ${rating}/5`,
          conversation_id: conversation.id
        })

      navigate('/questions')
    } catch (error) {
      console.error('Error submitting rating:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Chargement de la conversation...</p>
        </div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300">Conversation non trouvée</p>
          <Button onClick={() => navigate('/questions')} className="mt-4">
            Retour aux questions
          </Button>
        </div>
      </div>
    )
  }

  const isJudge = user?.id === conversation.judge_id
  const isUser = user?.id === conversation.user_id
  const canComplete = isJudge && conversation.status === 'active'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/questions')}>
              <X className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-white">
                {conversation.question.title}
              </h1>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>avec {isJudge ? conversation.question.user.full_name : conversation.judge?.full_name}</span>
                <Badge variant="info" size="sm">
                  {conversation.question.category}
                </Badge>
                {conversation.status === 'active' && (
                  <Badge variant="success" size="sm">En cours</Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {canComplete && (
              <Button onClick={completeConversation} variant="success" size="sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                Marquer comme résolu
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Question Details */}
      <div className="bg-gray-800/30 border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">Question originale :</h3>
            <p className="text-gray-300 mb-3">{conversation.question.content}</p>
            {conversation.question.image_url && (
              <img
                src={conversation.question.image_url}
                alt="Question attachment"
                className="max-w-sm rounded-lg border border-gray-600"
              />
            )}
            <div className="flex items-center justify-between mt-3 text-sm text-gray-400">
              <span>
                Posée par {conversation.question.user.full_name} • {' '}
                {formatDistanceToNow(new Date(conversation.question.created_at), {
                  addSuffix: true,
                  locale: fr
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {conversation.messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === user?.id}
              isJudge={message.sender_id === conversation.judge_id}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      {conversation.status === 'active' && (
        <div className="bg-gray-800/50 backdrop-blur-sm border-t border-gray-700 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCardSearch(true)}
                  >
                    <Search className="h-4 w-4 mr-1" />
                    Ajouter une carte
                  </Button>
                </div>
                <div className="flex items-end space-x-2">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Tapez votre message..."
                    className="flex-1 rounded-lg bg-gray-800 border-gray-600 text-white placeholder-gray-400 resize-none min-h-[44px] max-h-32 px-4 py-3"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!messageText.trim() || sending}
                    loading={sending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRating && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm" />
            <div className="relative bg-gray-800 rounded-lg shadow-2xl w-full max-w-md border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Évaluez votre expérience
              </h3>
              
              <div className="mb-4">
                <p className="text-gray-300 mb-3">
                  Comment évaluez-vous la réponse du juge ?
                </p>
                <div className="flex justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`p-1 transition-colors ${
                        star <= rating ? 'text-yellow-400' : 'text-gray-600'
                      }`}
                    >
                      <Star className="h-8 w-8 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Commentaire optionnel..."
                className="w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 mb-4"
                rows={3}
              />

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/questions')}
                  className="flex-1"
                >
                  Passer
                </Button>
                <Button
                  onClick={submitRating}
                  disabled={rating === 0}
                  className="flex-1"
                >
                  Envoyer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CardSearchModal
        isOpen={showCardSearch}
        onClose={() => setShowCardSearch(false)}
        onSelectCard={sendCardMessage}
      />
    </div>
  )
}