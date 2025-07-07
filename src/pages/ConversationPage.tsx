// src/pages/ConversationPage.tsx - PARTIE 1/4
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Image, Paperclip, Star, Flag, CheckCircle, X, Search, Plus, Clock, AlertTriangle, Eye, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { CardSearchModal } from '../components/cards/CardSearchModal'
import { MessageBubble } from '../components/chat/MessageBubble'
import { TypingIndicator } from '../components/chat/TypingIndicator'
import { OnlineIndicator } from '../components/chat/OnlineIndicator'
import { useRealtimeConversation } from '../hooks/useRealtimeConversation'
import { notificationService } from '../lib/notificationService'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Question, Profile } from '../types/database'

export function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // ✅ CORRECTION 1 : États améliorés avec gestion d'erreurs
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
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: Profile }>({})
  const [actualConversationId, setActualConversationId] = useState<string | null>(null)
  
  // ✅ NOUVEAUX ÉTATS pour un meilleur débogage
  const [chatError, setChatError] = useState<string>('')
  const [isReconnecting, setIsReconnecting] = useState(false)

  // ✅ CORRECTION 2 : Hook realtime avec fallback amélioré
  const {
    messages,
    conversation: realtimeConversation,
    onlineUsers,
    typingUsers,
    sendMessage: realtimeSendMessage,
    sendTypingIndicator,
    loadConversation
  } = useRealtimeConversation({ 
    conversationId: actualConversationId || id // Fallback sur id si actualConversationId est null
  })

  // ✅ CORRECTION 3 : Variable de conversation unifiée
  const conversation = realtimeConversation || question
  // src/pages/ConversationPage.tsx - PARTIE 2/4

  // ✅ CORRECTION 4 : Effects améliorés avec logs de debug
  useEffect(() => {
    if (id) {
      console.log('🔄 Loading conversation/question for ID:', id)
      loadQuestionOrConversation()
    }
  }, [id])

  useEffect(() => {
    if (messages.length > 0) {
      console.log(`📄 Scrolling to bottom (${messages.length} messages)`)
      scrollToBottom()
    }
  }, [messages])

  // ✅ CORRECTION 5 : Synchronisation des données de conversation
  useEffect(() => {
    if (realtimeConversation && !conversation) {
      console.log('🔄 Syncing conversation data from realtime hook')
      // Cette logique est déjà gérée par la variable unifiée conversation
    }
  }, [realtimeConversation])

  // ✅ CORRECTION 6 : Timer pour timeout countdown amélioré
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

  // ✅ CORRECTION 7 : Chargement des profils utilisateurs amélioré
  useEffect(() => {
    const loadUserProfiles = async () => {
      const currentConversation = realtimeConversation || conversation
      if (currentConversation) {
        const userIds = [currentConversation.user_id, currentConversation.judge_id].filter(Boolean)
        
        try {
          const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds)

          if (error) throw error

          const profileMap: { [key: string]: Profile } = {}
          profiles?.forEach(profile => {
            profileMap[profile.id] = profile
          })
          setUserProfiles(profileMap)
          console.log('👥 User profiles loaded:', Object.keys(profileMap))
        } catch (error) {
          console.error('❌ Error loading user profiles:', error)
        }
      }
    }

    loadUserProfiles()
  }, [realtimeConversation, conversation])

  // ✅ CORRECTION 8 : Gestion de la reconnexion réseau
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Back online, reloading conversation data')
      setIsReconnecting(true)
      setChatError('')
      if (actualConversationId) {
        loadConversation?.()
      }
      setTimeout(() => setIsReconnecting(false), 2000)
    }

    const handleOffline = () => {
      console.log('📴 Gone offline')
      setChatError('Connexion perdue - reconnexion en cours...')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [actualConversationId, loadConversation])

  // ✅ FONCTIONS UTILITAIRES
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleChatError = (error: any, context: string) => {
    console.error(`❌ Chat error in ${context}:`, error)
    setChatError(`Erreur dans ${context}: ${error.message || 'Erreur inconnue'}`)
    
    // Auto-clear error after 5 seconds
    setTimeout(() => setChatError(''), 5000)
  }

  // ✅ FONCTION DE DEBUG (à supprimer en production)
  const debugChatState = () => {
    console.log('🐛 CHAT DEBUG STATE:', {
      id,
      actualConversationId,
      hasUser: !!user,
      messagesCount: messages.length,
      hasConversation: !!conversation,
      hasRealtimeConversation: !!realtimeConversation,
      conversationStatus: conversation?.status || realtimeConversation?.status,
      onlineUsersCount: onlineUsers.length,
      typingUsersCount: typingUsers.length
    })
  }

  // Exposer la fonction de debug globalement (développement uniquement)
  if (process.env.NODE_ENV === 'development') {
    (window as any).debugChatState = debugChatState
  }

  // src/pages/ConversationPage.tsx - PARTIE 3/4

  // ✅ CORRECTION 9 : loadQuestionOrConversation améliorée
  const loadQuestionOrConversation = async () => {
    if (!id) return

    try {
      setLoading(true)
      console.log('🔍 Loading question or conversation for ID:', id)

      // First try to load existing conversation by conversation ID
      let { data: conversationData } = await supabase
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
        .maybeSingle()

      // If no conversation found, try to find conversation by question_id
      if (!conversationData) {
        console.log('🔍 No conversation found by ID, trying by question_id')
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
          .maybeSingle()

        conversationData = convByQuestion
        if (convByQuestionError) {
          console.error('Error loading conversation by question:', convByQuestionError)
        }
      }

      if (conversationData) {
        // Conversation exists, set the actual conversation ID
        console.log('✅ Found existing conversation:', conversationData.id)
        setActualConversationId(conversationData.id)
        
        // Set question data immediately to avoid loading delay
        if (conversationData.question) {
          setQuestion(conversationData.question)
        }
      } else {
        // No conversation found, try to load question
        console.log('🔍 No conversation found, loading question...')
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .select(`
            *,
            user:profiles!questions_user_id_fkey(*)
          `)
          .eq('id', id)
          .single()

        if (questionError) {
          console.error('❌ Error loading question:', questionError)
          throw questionError
        }

        // Check if user can access this question
        const canAccess = questionData.user_id === user?.id || 
                         questionData.assigned_judge_id === user?.id ||
                         questionData.is_public ||
                         user?.profile?.role === 'admin' ||
                         (user?.profile?.role === 'judge' && questionData.status === 'waiting_for_judge')

        if (!canAccess) {
          console.log('❌ Access denied to question')
          navigate('/questions')
          return
        }

        console.log('✅ Question loaded successfully')
        setQuestion(questionData)

        // If it's a judge viewing a waiting question, show take question modal
        if (user?.profile?.role === 'judge' && questionData.status === 'waiting_for_judge') {
          setShowTakeQuestion(true)
        }
      }

    } catch (error) {
      console.error('❌ Error loading question/conversation:', error)
      handleChatError(error, 'chargement de la conversation')
      navigate('/questions')
    } finally {
      setLoading(false)
    }
  }

  // ✅ CORRECTION 10 : takeQuestion améliorée
  const takeQuestion = async () => {
    if (!question || !user || user.profile?.role !== 'judge') {
      console.log('❌ Cannot take question: invalid conditions')
      return
    }

    try {
      setTakingQuestion(true)
      console.log('⚖️ Taking question:', question.id)

      // Update question status and assign judge
      const { error: updateError } = await supabase
        .from('questions')
        .update({
          status: 'assigned',
          assigned_judge_id: user.id,
          assigned_at: new Date().toISOString()
        })
        .eq('id', question.id)

      if (updateError) {
        console.error('❌ Error updating question:', updateError)
        throw updateError
      }

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

      if (createError) {
        console.error('❌ Error creating conversation:', createError)
        throw createError
      }

      console.log('✅ Conversation created:', newConversation.id)

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

      console.log('✅ Question taken successfully, navigating to conversation')
      // Navigate to the new conversation
      navigate(`/conversation/${newConversation.id}`)

    } catch (error) {
      console.error('❌ Error taking question:', error)
      handleChatError(error, 'prise en charge de la question')
    } finally {
      setTakingQuestion(false)
    }
  }

  // ✅ CORRECTION 11 : sendMessageHandler améliorée
  const sendMessageHandler = async () => {
    if (!messageText.trim()) {
      console.log('⚠️ Cannot send empty message')
      return
    }
    
    // Utiliser actualConversationId au lieu de conversation pour plus de fiabilité
    if (!actualConversationId || !user) {
      console.log('⚠️ Missing conversation ID or user', { 
        conversationId: actualConversationId, 
        user: !!user 
      })
      handleChatError(new Error('Données manquantes'), 'envoi de message')
      return
    }

    try {
      console.log('📤 Sending message via handler')
      setSending(true)
      await realtimeSendMessage(messageText)
      setMessageText('')
      console.log('✅ Message sent successfully')
      
      // Clear any previous errors
      setChatError('')
    } catch (error) {
      console.error('❌ Error sending message:', error)
      handleChatError(error, 'envoi de message')
    } finally {
      setSending(false)
    }
  }

  // ✅ CORRECTION 12 : sendCardMessage améliorée
  const sendCardMessage = async (card: any) => {
    if (!actualConversationId || !user) {
      console.log('⚠️ Cannot send card: missing conversation or user')
      handleChatError(new Error('Conversation ou utilisateur manquant'), 'envoi de carte')
      return
    }

    try {
      console.log('🃏 Sending card:', card.name)
      const cardData = {
        name: card.name,
        image_url: card.image_uris?.normal || card.image_uris?.large,
        scryfall_url: card.scryfall_uri,
        mana_cost: card.mana_cost,
        type_line: card.type_line,
        oracle_text: card.oracle_text
      }

      await realtimeSendMessage(`Carte partagée: ${card.name}`, { card: cardData })
      console.log('✅ Card sent successfully')
      
      setChatError('')
    } catch (error) {
      console.error('❌ Error sending card:', error)
      handleChatError(error, 'envoi de carte')
    }
  }

  // ✅ CORRECTION 13 : completeConversation améliorée
  const completeConversation = async () => {
    // Utiliser les données de conversation les plus récentes
    const currentConversation = realtimeConversation
    
    if (!currentConversation || !user) {
      console.log('⚠️ Cannot complete conversation: missing data')
      handleChatError(new Error('Données de conversation manquantes'), 'finalisation')
      return
    }

    console.log('✅ Completing conversation:', currentConversation.id)

    try {
      // Update conversation status
      await supabase
        .from('conversations')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', currentConversation.id)

      // Update question status
      await supabase
        .from('questions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', currentConversation.question.id)

      // Add system message
      await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversation.id,
          sender_id: user.id,
          content: 'Question marquée comme résolue par le juge.',
          message_type: 'system'
        })

      // Send notification to user
      await notificationService.notifyQuestionCompleted(
        currentConversation.id,
        currentConversation.user_id,
        user.id
      )

      // Show rating modal if user
      if (user.id === currentConversation.user_id) {
        setShowRating(true)
      } else {
        navigate('/questions')
      }

      console.log('✅ Conversation completed successfully')
    } catch (error) {
      console.error('❌ Error completing conversation:', error)
      handleChatError(error, 'finalisation de la conversation')
    }
  }

  // src/pages/ConversationPage.tsx - PARTIE 4/4

  // ✅ CORRECTION 14 : submitRating inchangée mais avec gestion d'erreur
  const submitRating = async () => {
    const currentConversation = realtimeConversation
    if (!currentConversation || !user || rating === 0) return

    try {
      await supabase
        .from('ratings')
        .insert({
          conversation_id: currentConversation.id,
          user_id: user.id,
          judge_id: currentConversation.judge_id,
          rating,
          feedback: feedback.trim() || null,
          is_accepted: true
        })

      // Award points to judge
      await supabase
        .from('rewards')
        .insert({
          judge_id: currentConversation.judge_id,
          points_earned: rating * 10, // 10 points per star
          reason: `Question résolue avec note ${rating}/5`,
          conversation_id: currentConversation.id
        })

      // Send notification to judge about rating
      await notificationService.notifyRatingReceived(
        currentConversation.judge_id,
        rating,
        currentConversation.id
      )

      // Send notification about reward earned
      await notificationService.notifyRewardEarned(
        currentConversation.judge_id,
        rating * 10,
        `Question résolue avec note ${rating}/5`
      )

      // Update judge stats
      const { data: judgeInfo } = await supabase
        .from('judge_info')
        .select('total_questions_answered, average_rating, total_points')
        .eq('user_id', currentConversation.judge_id)
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
          .eq('user_id', currentConversation.judge_id)
      }

      navigate('/questions')
    } catch (error) {
      console.error('Error submitting rating:', error)
      handleChatError(error, 'soumission de l\'évaluation')
    }
  }

  const handleTyping = () => {
    sendTypingIndicator()
  }

  // Fonctions utilitaires pour le statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting_for_judge': return 'text-yellow-400'
      case 'assigned': return 'text-blue-400'
      case 'in_progress': return 'text-green-400'
      case 'completed': return 'text-green-400'
      case 'disputed': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting_for_judge': return '🕐 En attente de juge'
      case 'assigned': return '⚖️ Juge assigné'
      case 'in_progress': return '💬 En cours de traitement'
      case 'completed': return '✅ Résolue'
      case 'disputed': return '⚠️ En dispute'
      default: return status
    }
  }

  // ✅ AFFICHAGE CONDITIONNEL AVEC GESTION D'ERREURS
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">🔄 Chargement...</p>
          {isReconnecting && (
            <p className="text-blue-400 text-sm mt-2">📡 Reconnexion en cours...</p>
          )}
        </div>
      </div>
    )
  }

  // ✅ AFFICHAGE DES ERREURS
  if (chatError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">❌ Erreur de chat</h2>
          <p className="text-red-400 mb-4">{chatError}</p>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()} variant="primary">
              🔄 Recharger la page
            </Button>
            <Button onClick={() => navigate('/questions')} variant="outline">
              🔙 Retour aux questions
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <Button 
              onClick={() => (window as any).debugChatState?.()} 
              variant="ghost" 
              size="sm"
              className="mt-4"
            >
              🐛 Debug état
            </Button>
          )}
        </div>
      </div>
    )
  }

  // ✅ VUE QUESTION POUR LES JUGES (inchangée mais avec meilleure gestion d'erreur)
  if (question && !realtimeConversation) {
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

  // ✅ VÉRIFICATION DE L'EXISTENCE DE LA CONVERSATION
  if (!realtimeConversation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-300 mb-4">❌ Conversation non trouvée</p>
          <Button onClick={() => navigate('/questions')}>
            🔙 Retour aux questions
          </Button>
        </div>
      </div>
    )
  }

  // ✅ INTERFACE PRINCIPALE DE CONVERSATION
  const isJudge = user?.id === realtimeConversation.judge_id
  const isUser = user?.id === realtimeConversation.user_id
  const canComplete = isJudge && realtimeConversation.status === 'active' && (realtimeConversation.question?.status === 'in_progress' || realtimeConversation.question?.status === 'assigned')
  const canViewOnly = realtimeConversation.question?.is_public && !isJudge && !isUser

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* ✅ INDICATEUR DE RECONNEXION */}
      {isReconnecting && (
        <div className="bg-blue-900/20 border-b border-blue-700 p-2 text-center">
          <span className="text-blue-300 text-sm">📡 Reconnexion en cours...</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/questions')}>
              <X className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-white">
                {realtimeConversation.question?.title}
              </h1>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>avec {isJudge ? realtimeConversation.question?.user?.full_name : realtimeConversation.judge?.full_name}</span>
                <Badge variant="info" size="sm">
                  {realtimeConversation.question?.category}
                </Badge>
                <Badge variant={realtimeConversation.status === 'active' ? 'success' : 'default'} size="sm">
                  <span className={getStatusColor(realtimeConversation.question?.status || '')}>
                    {getStatusLabel(realtimeConversation.question?.status || '')}
                  </span>
                </Badge>
                {canViewOnly && (
                  <Badge variant="warning" size="sm">👀 Lecture seule</Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Online indicator */}
            {realtimeConversation.judge_id && realtimeConversation.user_id && (
              <OnlineIndicator
                onlineUsers={onlineUsers}
                currentUserId={user?.id || ''}
                otherUserId={isJudge ? realtimeConversation.user_id : realtimeConversation.judge_id}
                otherUserName={isJudge ? 
                  realtimeConversation.question?.user?.full_name || realtimeConversation.question?.user?.email || 'Utilisateur' :
                  realtimeConversation.judge?.full_name || realtimeConversation.judge?.email || 'Juge'
                }
              />
            )}
            
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
            <p className="text-gray-300 mb-3">{realtimeConversation.question?.content}</p>
            {realtimeConversation.question?.image_url && (
              <img
                src={realtimeConversation.question.image_url}
                alt="Question attachment"
                className="max-w-sm rounded-lg border border-gray-600"
              />
            )}
            <div className="flex items-center justify-between mt-3 text-sm text-gray-400">
              <span>
                📅 Posée par {realtimeConversation.question?.user?.full_name} • {' '}
                {formatDistanceToNow(new Date(realtimeConversation.question?.created_at || ''), {
                  addSuffix: true,
                  locale: fr
                })}
              </span>
              <span>
                ⚖️ Assignée {formatDistanceToNow(new Date(realtimeConversation.started_at), {
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
          {messages.length === 0 ? (
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
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === user?.id}
                isJudge={message.sender_id === realtimeConversation.judge_id}
              />
            ))
          )}
          
          {/* Typing Indicator */}
          <TypingIndicator 
            typingUsers={typingUsers} 
            userProfiles={userProfiles}
          />
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      {realtimeConversation.status === 'active' && !canViewOnly && (
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
                    onChange={(e) => {
                      setMessageText(e.target.value)
                      handleTyping()
                    }}
                    placeholder="💬 Tapez votre message..."
                    className="flex-1 rounded-lg bg-gray-800 border-gray-600 text-white placeholder-gray-400 resize-none min-h-[44px] max-h-32 px-4 py-3"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessageHandler()
                      }
                    }}
                  />
                  <Button
                    onClick={sendMessageHandler}
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
      {realtimeConversation.status === 'ended' && (
        <div className="bg-green-900/20 border-t border-green-700 p-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center text-green-300 text-sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              ✅ Cette conversation a été marquée comme résolue
              {realtimeConversation.ended_at && (
                <span className="ml-2">
                  • {formatDistanceToNow(new Date(realtimeConversation.ended_at), {
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