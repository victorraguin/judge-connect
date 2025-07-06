import { supabase } from './supabase'

export const notificationService = {
  // Create notification for question assignment
  async notifyQuestionAssigned(questionId: string, userId: string, judgeId: string) {
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: '⚖️ Juge assigné !',
        content: 'Un juge a pris en charge votre question et va bientôt vous répondre.',
        type: 'question_assigned',
        data: {
          question_id: questionId,
          judge_id: judgeId,
          url: `/conversation/${questionId}`
        }
      })
    } catch (error) {
      console.error('Error creating assignment notification:', error)
    }
  },

  // Create notification for new message
  async notifyNewMessage(conversationId: string, senderId: string, recipientId: string, messageContent: string) {
    try {
      await supabase.from('notifications').insert({
        user_id: recipientId,
        title: '💬 Nouveau message',
        content: messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent,
        type: 'question_answered',
        data: {
          conversation_id: conversationId,
          sender_id: senderId,
          url: `/conversation/${conversationId}`
        }
      })
    } catch (error) {
      console.error('Error creating message notification:', error)
    }
  },

  // Create notification for question completion
  async notifyQuestionCompleted(conversationId: string, userId: string, judgeId: string) {
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: '✅ Question résolue !',
        content: 'Votre question a été marquée comme résolue. N\'oubliez pas d\'évaluer votre juge !',
        type: 'question_completed',
        data: {
          conversation_id: conversationId,
          judge_id: judgeId,
          url: `/conversation/${conversationId}`
        }
      })
    } catch (error) {
      console.error('Error creating completion notification:', error)
    }
  },

  // Create notification for rating received
  async notifyRatingReceived(judgeId: string, rating: number, conversationId: string) {
    try {
      const stars = '⭐'.repeat(rating)
      await supabase.from('notifications').insert({
        user_id: judgeId,
        title: '🌟 Nouvelle évaluation !',
        content: `Vous avez reçu une note de ${rating}/5 ${stars}`,
        type: 'rating_received',
        data: {
          rating,
          conversation_id: conversationId,
          url: `/conversation/${conversationId}`
        }
      })
    } catch (error) {
      console.error('Error creating rating notification:', error)
    }
  },

  // Create notification for reward earned
  async notifyRewardEarned(judgeId: string, points: number, reason: string) {
    try {
      await supabase.from('notifications').insert({
        user_id: judgeId,
        title: '🎁 Récompense gagnée !',
        content: `Vous avez gagné ${points} points : ${reason}`,
        type: 'reward_earned',
        data: {
          points,
          reason,
          url: '/profile?tab=rewards'
        }
      })
    } catch (error) {
      console.error('Error creating reward notification:', error)
    }
  },

  // Create notification for judge when new question is available
  async notifyNewQuestionAvailable(judgeId: string, questionId: string, questionTitle: string) {
    try {
      await supabase.from('notifications').insert({
        user_id: judgeId,
        title: '🎯 Nouvelle question disponible',
        content: `"${questionTitle}" - Cliquez pour la prendre en charge`,
        type: 'question_available',
        data: {
          question_id: questionId,
          url: `/conversation/${questionId}`
        }
      })
    } catch (error) {
      console.error('Error creating question available notification:', error)
    }
  }
}