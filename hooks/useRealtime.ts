"use client"

import { useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"

export interface RealtimeCallbacks {
  onUserPresenceChange?: (users: any[]) => void
  onNoteChange?: (note: any) => void
  onTagsChange?: (tags: any[]) => void
  onTasksChange?: (tasks: any[]) => void
  onFilesChange?: (files: any[]) => void
  onCursorChange?: (cursors: any[]) => void
  onActivityChange?: (activity: any) => void
}

export function useRealtime(meetingId: string, callbacks: RealtimeCallbacks) {
  const channelsRef = useRef<any[]>([])
  const callbacksRef = useRef(callbacks)

  // 更新 callbacks 引用
  callbacksRef.current = callbacks

  const cleanup = useCallback(() => {
    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    channelsRef.current = []
  }, [])

  useEffect(() => {
    if (!meetingId) return

    // 清理之前的连接
    cleanup()

    // 用户在线状态实时订阅
    const presenceChannel = supabase
      .channel(`presence:${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          console.log("User presence change:", payload)
          if (callbacksRef.current.onUserPresenceChange) {
            // 重新获取所有在线用户
            loadOnlineUsers()
          }
        },
      )
      .subscribe()

    // 笔记实时订阅
    const notesChannel = supabase
      .channel(`notes:${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notes",
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          console.log("Note change:", payload)
          if (callbacksRef.current.onNoteChange) {
            callbacksRef.current.onNoteChange(payload.new)
          }
        },
      )
      .subscribe()

    // 标签实时订阅
    const tagsChannel = supabase
      .channel(`tags:${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tags",
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          console.log("Tags change:", payload)
          if (callbacksRef.current.onTagsChange) {
            loadTags()
          }
        },
      )
      .subscribe()

    // 任务实时订阅
    const tasksChannel = supabase
      .channel(`tasks:${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          console.log("Tasks change:", payload)
          if (callbacksRef.current.onTasksChange) {
            loadTasks()
          }
        },
      )
      .subscribe()

    // 文件实时订阅
    const filesChannel = supabase
      .channel(`files:${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meeting_files",
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          console.log("Files change detected:", payload)
          console.log("Event type:", payload.eventType)
          console.log("Table:", payload.table)
          console.log("Schema:", payload.schema)
          if (callbacksRef.current.onFilesChange) {
            console.log("Loading files after change...")
            loadFiles()
          } else {
            console.log("onFilesChange callback not provided")
          }
        },
      )
      .subscribe((status) => {
        console.log("Files channel subscription status:", status)
      })

    // 活动日志实时订阅
    const activitiesChannel = supabase
      .channel(`activities:${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // 监听所有事件：INSERT, UPDATE, DELETE
          schema: "public",
          table: "meeting_activities",
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          console.log("Activity change:", payload)
          if (callbacksRef.current.onActivityChange) {
            callbacksRef.current.onActivityChange(payload.new)
          }
        },
      )
      .subscribe()

    // 保存频道引用
    channelsRef.current = [presenceChannel, notesChannel, tagsChannel, tasksChannel, filesChannel, activitiesChannel]

    // 辅助函数
    const loadOnlineUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("user_presence")
          .select("*")
          .eq("meeting_id", meetingId)
          .gte("last_seen", new Date(Date.now() - 300000).toISOString()) // 5分钟

        if (error) throw error
        if (callbacksRef.current.onUserPresenceChange) {
          callbacksRef.current.onUserPresenceChange(data || [])
        }
      } catch (error) {
        console.error("Error loading online users:", error)
      }
    }

    const loadTags = async () => {
      try {
        const { data, error } = await supabase.from("tags").select("*").eq("meeting_id", meetingId)

        if (error) throw error
        if (callbacksRef.current.onTagsChange) {
          callbacksRef.current.onTagsChange(data || [])
        }
      } catch (error) {
        console.error("Error loading tags:", error)
      }
    }

    const loadTasks = async () => {
      try {
        const { data, error } = await supabase.from("tasks").select("*").eq("meeting_id", meetingId)

        if (error) throw error
        if (callbacksRef.current.onTasksChange) {
          callbacksRef.current.onTasksChange(data || [])
        }
      } catch (error) {
        console.error("Error loading tasks:", error)
      }
    }

    const loadFiles = async () => {
      try {
        console.log("Loading files for meeting:", meetingId)
        const { data, error } = await supabase
          .from("meeting_files")
          .select("*")
          .eq("meeting_id", meetingId)
          .order("uploaded_at", { ascending: false })

        if (error) throw error
        console.log("Files loaded:", data)
        if (callbacksRef.current.onFilesChange) {
          callbacksRef.current.onFilesChange(data || [])
        }
      } catch (error) {
        console.error("Error loading files:", error)
      }
    }

    return cleanup
  }, [meetingId, cleanup])

  return cleanup
}
