"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"

interface UserCursor {
  id: string
  user_name: string
  user_color: string
  cursor_position: number
  selection_start: number
  selection_end: number
}

interface CollaborativeEditorProps {
  meetingId: string
  currentUserId: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function CollaborativeEditor({
  meetingId,
  currentUserId,
  value,
  onChange,
  placeholder = "开始记录会议笔记...",
}: CollaborativeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div className="relative flex-1">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full resize-none text-base leading-relaxed border-none shadow-none focus-visible:ring-0 relative z-0 font-mono"
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        }}
      />
    </div>
  )
}
