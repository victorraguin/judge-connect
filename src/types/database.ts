export type UserRole = 'user' | 'judge' | 'admin'
export type JudgeLevel = 'L1' | 'L2' | 'L3'
export type QuestionStatus = 'waiting_for_judge' | 'assigned' | 'in_progress' | 'completed' | 'disputed' | 'resolved'
export type ConversationStatus = 'active' | 'ended' | 'disputed'
export type MessageType = 'text' | 'image' | 'system'
export type DisputeStatus = 'pending' | 'under_review' | 'resolved'

export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role: UserRole
  created_at: string
  updated_at: string
  last_seen?: string
  is_online?: boolean
  notification_preferences?: {
    push: boolean
    email: boolean
  }
}

export interface JudgeInfo {
  id: string
  user_id: string
  judge_level: JudgeLevel
  specialties?: string[]
  languages?: string[]
  total_points?: number
  total_questions_answered?: number
  average_rating?: number
  average_response_time?: string
  badges?: string[]
  bio?: string
  is_available?: boolean
  created_at: string
  updated_at: string
  profile?: Profile
}

export interface Question {
  id: string
  user_id: string
  title: string
  content: string
  category: string
  image_url?: string
  status: QuestionStatus
  assigned_judge_id?: string
  created_at: string
  assigned_at?: string
  completed_at?: string
  timeout_at: string
  is_public?: boolean
  user?: Profile
  assigned_judge?: Profile
}

export interface Conversation {
  id: string
  question_id: string
  user_id: string
  judge_id: string
  status: ConversationStatus
  started_at: string
  ended_at?: string
  last_message_at: string
  video_enabled?: boolean
  question?: Question
  user?: Profile
  judge?: Profile
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content?: string
  message_type: MessageType
  image_url?: string
  metadata?: any
  created_at: string
  read_at?: string
  sender?: Profile
}

export interface Rating {
  id: string
  conversation_id: string
  user_id: string
  judge_id: string
  rating: number
  feedback?: string
  is_accepted: boolean
  created_at: string
}

export interface Dispute {
  id: string
  conversation_id: string
  user_id: string
  judge_id: string
  user_justification: string
  judge_justification?: string
  admin_notes?: string
  status: DisputeStatus
  resolved_by?: string
  created_at: string
  resolved_at?: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  content: string
  type: string
  data?: any
  read?: boolean
  created_at: string
}

export interface Reward {
  id: string
  judge_id: string
  points_earned: number
  reason: string
  conversation_id?: string
  created_at: string
}