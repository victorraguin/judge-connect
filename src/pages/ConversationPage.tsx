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

  return (
    <div>
      {/* Content will be added in subsequent parts */}
    </div>
  )
}