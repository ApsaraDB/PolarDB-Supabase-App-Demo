/// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 类型定义
export interface Meeting {
  id: string
  created_at: string
  title: string
  description: string | null
}

export interface Note {
  id: string
  created_at: string
  meeting_id: string
  content: any
  updated_at: string
}

export interface UserPresence {
  id: string
  meeting_id: string
  user_name: string
  user_color: string
  is_typing: boolean
  last_seen: string
  created_at: string
}

export interface Tag {
  id: string
  meeting_id: string
  name: string
  color: string
  created_at: string
}

export interface Task {
  id: string
  meeting_id: string
  title: string
  description: string | null
  assignee: string | null
  status: string
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  meeting_id: string
  user_name: string
  activity_type: string
  activity_data: any
  created_at: string
}

export interface MeetingFile {
  id: string
  meeting_id: string
  file_name: string
  file_url: string
  uploader: string
  uploaded_at: string
  file_size: number
  mime_type: string
}
