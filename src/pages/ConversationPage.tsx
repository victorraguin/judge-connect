// src/pages/ConversationPage.tsx - PARTIE 1/4
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Image, Paperclip, Star, Flag, CheckCircle, X, Search, Plus, Clock, AlertTriangle, Eye, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { notificationService } from '../lib/notificationService'
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
  const [question, setQuestion] = useState<Question & { user: Profile } | null>(null)
  const [loading, setLoading] = useState(true)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [showCardSearch, setShowCardSearch] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [showRating, setShowRating] = useState(false)
  const [showTakeQuestion, setShowTakeQuestion] = useState(false)
  const [takingQuestion, setTakingQuestion] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>('')

  // Effects
  useEffect(() => {
    if (id) {
      loadQuestionOrConversation()
    }
  }, [id])

  useEffect(() => {
    if (conversation?.messages) {
      scrollToBottom()
    }
  }, [conversation?.messages])

  useEffect(() => {
    if (conversation) {
      subscribeToMessages()
    }
  }, [conversation?.id])

  // Timer for timeout countdown
  useEffect(() => {
    if (question?.timeout_at) {
      const interval = setInterval(() => {
        const timeRemaining = new Date(question.timeout_at).getTime() - new Date().getTime()
        if (timeRemaining <= 0) {
          setTimeLeft('Expiré')
          clearInterval(interval)
        } else {
          const minutes = Math.floor(timeRemaining / 60000)
          const seconds = Math.floor((timeRemaining % 60000) / 1000)
          setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [question?.timeout_at])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // src/pages/ConversationPage.tsx - PARTIE 2/4 (Functions de chargement)

  const loadQuestionOrConversation = async () => {
    if (!id) return

    try {
      setLoading(true)

      // First try to load existing conversation by conversation ID
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

      // If no conversation found, try to find conversation by question_id
      if (!conversationData) {
        const { data: convByQuestion, error: convByQuestionError } = await supabase
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
          .eq('question_id', id)
          .single()

        conversationData = convByQuestion
        convError = convByQuestionError
      }

      if (conversationData) {
        // Load messages for existing conversation
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

        // Mark messages as read for the current user
        if (messagesData?.length && user?.id) {
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('conversation_id', conversationData.id)
            .neq('sender_id', user.id)
            .is('read_at', null)
        }
      } else {
        // No conversation found, try to load question
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

        setQuestion(questionData)

        // If it's a judge viewing a waiting question, show take question modal
        if (user?.profile?.role === 'judge' && questionData.status === 'waiting_for_judge') {
          setShowTakeQuestion(true)
        }
      }

    } catch (error) {
      console.error('Error loading question/conversation:', error)
      navigate('/questions')
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    if (!conversation?.id) return

    const subscription = supabase
      .channel(`conversation-${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
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

  // src/pages/ConversationPage.tsx - PARTIE 3/4 (Functions d'actions)

  const takeQuestion = async () => {
    if (!question || !user || user.profile?.role !== 'judge') return

    try {
      setTakingQuestion(true)

      // Update question status and assign judge
      const { error: updateError } = await supabase
        .from('questions')
        .update({
          status: 'assigned',
          assigned_judge_id: user.id,
          assigned_at: new Date().toISOString()
        })
        .eq('id', question.id)

      if (updateError) throw updateError

      // Create conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          question_id: question.id,
          user_id: question.user_id,
          judge_id: user.id,
          status: 'active',
          started_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) throw createError

      // Add system message to indicate conversation started
      await supabase
        .from('messages')
        .insert({
          conversation_id: newConversation.id,
          sender_id: user.id,
          content: `Juge ${user.profile?.full_name || user.email} a pris en charge cette question.`,
          message_type: 'system'
        })

      // Send notification to user
      await notificationService.notifyQuestionAssigned(
        question.id,
        question.user_id,
        user.id
      )

      // Load the full conversation data
      const { data: fullConversation } = await supabase
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

      if (fullConversation) {
        // Load initial system message
        const { data: messagesData } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(*)
          `)
          .eq('conversation_id', newConversation.id)
          .order('created_at', { ascending: true })

        setConversation({
          ...fullConversation,
          messages: messagesData || []
        })
        setQuestion(null)
        setShowTakeQuestion(false)
      }

    } catch (error) {
      console.error('Error taking question:', error)
    } finally {
      setTakingQuestion(false)
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

      // Update conversation last message time and status
      await supabase
        .from('conversations')
        .update({ 
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversation.id)

      // Update question status to in_progress if it's the first non-system message
      if (conversation.question.status === 'assigned') {
        await supabase
          .from('questions')
          .update({ status: 'in_progress' })
          .eq('id', conversation.question.id)

        // Update local state
        setConversation(prev => prev ? {
          ...prev,
          question: { ...prev.question, status: 'in_progress' }
        } : null)
      }

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

      // Add system message
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: 'Question marquée comme résolue par le juge.',
          message_type: 'system'
        })

      // Send notification to user
      await notificationService.notifyQuestionCompleted(
        conversation.id,
        conversation.user_id,
        user.id
      )

      // Update local state
      setConversation(prev => prev ? {
        ...prev,
        status: 'ended',
        ended_at: new Date().toISOString(),
        question: { ...prev.question, status: 'completed', completed_at: new Date().toISOString() }
      } : null)

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

      // Send notification to judge about rating
      await notificationService.notifyRatingReceived(
        conversation.judge_id,
        rating,
        conversation.id
      )

      // Send notification about reward earned
      await notificationService.notifyRewardEarned(
        conversation.judge_id,
        rating * 10,
        `Question résolue avec note ${rating}/5`
      )

      // Update judge stats
      const { data: judgeInfo } = await supabase
        .from('judge_info')
        .select('total_questions_answered, average_rating, total_points')
        .eq('user_id', conversation.judge_id)
        .single()

      if (judgeInfo) {
        const newTotal = (judgeInfo.total_questions_answered || 0) + 1
        const newAverage = judgeInfo.average_rating 
          ? ((judgeInfo.average_rating * (newTotal - 1)) + rating) / newTotal
          : rating
        const newPoints = (judgeInfo.total_points || 0) + (rating * 10)

        await supabase
          .from('judge_info')
          .update({
            total_questions_answered: newTotal,
            average_rating: newAverage,
            total_points: newPoints
          })
          .eq('user_id', conversation.judge_id)
      }

      navigate('/questions')
    } catch (error) {
      console.error('Error submitting rating:', error)
    }
  }

  // src/pages/ConversationPage.tsx - PARTIE 4/4 (Helper functions et JSX)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting_for_judge':
        return 'text-yellow-400'
      case 'assigned':
        return 'text-blue-400'
      case 'in_progress':
        return 'text-green-400'
      case 'completed':
        return 'text-green-400'
      case 'disputed':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting_for_judge':
        return '🕐 En attente de juge'
      case 'assigned':
        return '⚖️ Juge assigné'
      case 'in_progress':
        return '💬 En cours de traitement'
      case 'completed':
        return '✅ Résolue'
      case 'disputed':
        return '⚠️ En dispute'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">🔄 Chargement...</p>
        </div>
      </div>
    )
  }

  // Show question view for judges who haven't taken the question yet
  if (question && !conversation) {
    const isJudge = user?.profile?.role === 'judge'
    const canTakeQuestion = isJudge && question.status === 'waiting_for_judge'
    const isOwner = user?.id === question.user_id

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
                  {question.title}
                </h1>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <span>par {question.user.full_name || question.user.email}</span>
                  <Badge variant="info" size="sm">
                    {question.category}
                  </Badge>
                  <Badge variant="warning" size="sm">
                    <span className={getStatusColor(question.status)}>
                      {getStatusLabel(question.status)}
                    </span>
                  </Badge>
                </div>
              </div>
            </div>
            
            {canTakeQuestion && (
              <Button onClick={() => setShowTakeQuestion(true)} variant="success">
                <span className="mr-2">⚖️</span>
                Prendre cette question
              </Button>
            )}
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white mb-3 flex items-center">
                  <span className="mr-2">📋</span>
                  Question complète :
                </h2>
                <p className="text-gray-300 leading-relaxed">{question.content}</p>
              </div>
              
              {question.image_url && (
                <div className="mb-4">
                  <img
                    src={question.image_url}
                    alt="Question attachment"
                    className="max-w-full rounded-lg border border-gray-600"
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-400 pt-4 border-t border-gray-700">
                <span>
                  📅 Posée {formatDistanceToNow(new Date(question.created_at), {
                    addSuffix: true,
                    locale: fr
                  })}
                </span>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span className={`font-mono ${timeLeft === 'Expiré' ? 'text-red-400' : 'text-blue-400'}`}>
                    ⏰ {timeLeft || 'Calcul...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {isOwner && (
              <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-xl p-4">
                <div className="flex items-center">
                  <Eye className="h-5 w-5 text-blue-400 mr-2" />
                  <span className="text-blue-300">
                    🎯 Votre question est en attente d'un juge. Vous serez notifié dès qu'un juge la prendra en charge !
                  </span>
                </div>
              </div>
            )}

            {!canTakeQuestion && !isOwner && (
              <div className="mt-6 bg-yellow-900/20 border border-yellow-700 rounded-xl p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                  <span className="text-yellow-300">
                    {isJudge 
                      ? "⚖️ Cette question a déjà été assignée à un autre juge"
                      : "👀 Vous pouvez voir cette question publique mais ne pouvez pas la prendre"
                    }
                  </span>
                </div>
              </div>
            )}

            {/* Public Question Notice */}
            {question.is_public && !isOwner && !isJudge && (
              <div className="mt-6 bg-green-900/20 border border-green-700 rounded-xl p-4">
                <div className="flex items-center">
                  <MessageSquare className="h-5 w-5 text-green-400 mr-2" />
                  <span className="text-green-300">
                    🌍 Question publique - Vous pouvez voir la discussion mais pas y participer
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Take Question Modal */}
        {showTakeQuestion && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm" />
              <div className="relative bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 p-8">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">⚖️</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    🎯 Prendre cette question ?
                  </h3>
                  <p className="text-gray-300">
                    Vous allez devenir le juge assigné à cette question
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 mb-6 border border-blue-500/30">
                  <h4 className="font-semibold text-white mb-3 flex items-center">
                    <span className="mr-2">📋</span>
                    Rappel important :
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-start">
                      <span className="mr-2 text-yellow-400">⏰</span>
                      <span>Temps restant : <strong className={timeLeft === 'Expiré' ? 'text-red-400' : 'text-blue-400'}>{timeLeft}</strong></span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-blue-400">💬</span>
                      <span>Une conversation privée sera créée avec le joueur</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-green-400">⭐</span>
                      <span>Le joueur pourra vous évaluer à la fin</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-purple-400">🏆</span>
                      <span>Vous gagnerez des points selon votre évaluation</span>
                    </li>
                  </ul>
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowTakeQuestion(false)
                      navigate('/questions')
                    }}
                    className="flex-1"
                  >
                    ❌ Annuler
                  </Button>
                  <Button
                    onClick={takeQuestion}
                    disabled={takingQuestion || timeLeft === 'Expiré'}
                    className="flex-1"
                    loading={takingQuestion}
                  >
                    <span className="mr-2">⚖️</span>
                    {takingQuestion ? 'Prise en cours...' : 'Prendre la question'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300">❌ Conversation non trouvée</p>
          <Button onClick={() => navigate('/questions')} className="mt-4">
            🔙 Retour aux questions
          </Button>
        </div>
      </div>
    )
  }

  const isJudge = user?.id === conversation.judge_id
  const isUser = user?.id === conversation.user_id
  const canComplete = isJudge && conversation.status === 'active' && conversation.question.status === 'in_progress'
  const canViewOnly = conversation.question.is_public && !isJudge && !isUser

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
                <Badge variant={conversation.status === 'active' ? 'success' : 'default'} size="sm">
                  <span className={getStatusColor(conversation.question.status)}>
                    {getStatusLabel(conversation.question.status)}
                  </span>
                </Badge>
                {canViewOnly && (
                  <Badge variant="warning" size="sm">👀 Lecture seule</Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {canComplete && (
              <Button onClick={completeConversation} variant="success" size="sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                ✅ Marquer comme résolu
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Question Details */}
      <div className="bg-gray-800/30 border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="font-medium text-white mb-2 flex items-center">
              <span className="mr-2">📋</span>
              Question originale :
            </h3>
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
                📅 Posée par {conversation.question.user.full_name} • {' '}
                {formatDistanceToNow(new Date(conversation.question.created_at), {
                  addSuffix: true,
                  locale: fr
                })}
              </span>
              <span>
                ⚖️ Assignée {formatDistanceToNow(new Date(conversation.started_at), {
                  addSuffix: true,
                  locale: fr
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* View-only notice for public questions */}
      {canViewOnly && (
        <div className="bg-blue-900/20 border-b border-blue-700 p-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center text-blue-300 text-sm">
              <Eye className="h-4 w-4 mr-2" />
              🌍 Vous consultez une conversation publique - Vous ne pouvez pas envoyer de messages
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {conversation.messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">
                {isJudge 
                  ? "💬 Conversation créée ! Commencez par saluer le joueur et analyser sa question."
                  : "🎯 Un juge a pris votre question ! Il va bientôt vous répondre."
                }
              </p>
            </div>
          ) : (
            conversation.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === user?.id}
                isJudge={message.sender_id === conversation.judge_id}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      {conversation.status === 'active' && !canViewOnly && (
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
                    🃏 Ajouter une carte
                  </Button>
                </div>
                <div className="flex items-end space-x-2">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="💬 Tapez votre message..."
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

      {/* Conversation ended notice */}
      {conversation.status === 'ended' && (
        <div className="bg-green-900/20 border-t border-green-700 p-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center text-green-300 text-sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              ✅ Cette conversation a été marquée comme résolue
              {conversation.ended_at && (
                <span className="ml-2">
                  • {formatDistanceToNow(new Date(conversation.ended_at), {
                    addSuffix: true,
                    locale: fr
                  })}
                </span>
              )}
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
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <span className="mr-2">⭐</span>
                Évaluez votre expérience
              </h3>
              
              <div className="mb-4">
                <p className="text-gray-300 mb-3">
                  🎯 Comment évaluez-vous la réponse du juge ?
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
                placeholder="💭 Commentaire optionnel..."
                className="w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 mb-4"
                rows={3}
              />

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/questions')}
                  className="flex-1"
                >
                  ⏭️ Passer
                </Button>
                <Button
                  onClick={submitRating}
                  disabled={rating === 0}
                  className="flex-1"
                >
                  🚀 Envoyer
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