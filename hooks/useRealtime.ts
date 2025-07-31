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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const isReconnectingRef = useRef(false)

  // 更新 callbacks 引用
  callbacksRef.current = callbacks

  // 清理函数
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = undefined
    }
    
    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    channelsRef.current = []
    isReconnectingRef.current = false
  }, [])

  const loadOnlineUsers = useCallback(async () => {
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
  }, [meetingId])

  const loadTags = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("tags").select("*").eq("meeting_id", meetingId)

      if (error) throw error
      if (callbacksRef.current.onTagsChange) {
        callbacksRef.current.onTagsChange(data || [])
      }
    } catch (error) {
      console.error("Error loading tags:", error)
    }
  }, [meetingId])

  const loadTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("tasks").select("*").eq("meeting_id", meetingId)

      if (error) throw error
      if (callbacksRef.current.onTasksChange) {
        callbacksRef.current.onTasksChange(data || [])
      }
    } catch (error) {
      console.error("Error loading tasks:", error)
    }
  }, [meetingId])

  const loadFiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("meeting_files")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("uploaded_at", { ascending: false })

      if (error) throw error
      if (callbacksRef.current.onFilesChange) {
        callbacksRef.current.onFilesChange(data || [])
      }
    } catch (error) {
      console.error("Error loading files:", error)
    }
  }, [meetingId])

  // 重连函数
  const reconnect = useCallback(() => {
    if (isReconnectingRef.current) return // 避免重复重连
    
    console.log('检测到连接错误，开始重连...')
    isReconnectingRef.current = true
    
    // 清理当前连接
    cleanup()
    
    // 延迟重连，避免立即重连
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('执行重连...')
      isReconnectingRef.current = false
      // 重新建立连接
      setupChannels()
    }, 2000)
  }, [cleanup])

  // 设置频道的函数
  const setupChannels = useCallback(() => {
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
            loadOnlineUsers()
          }
        },
      )
      .subscribe((status) => {
        console.log("Presence channel status:", status)
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reconnect()
        }
      })

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
      .subscribe((status) => {
        console.log("Notes channel status:", status)
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reconnect()
        }
      })

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
      .subscribe((status) => {
        console.log("Tags channel status:", status)
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reconnect()
        }
      })

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
      .subscribe((status) => {
        console.log("Tasks channel status:", status)
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reconnect()
        }
      })

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
          if (callbacksRef.current.onFilesChange) {
            loadFiles()
          }
        },
      )
      .subscribe((status) => {
        console.log("Files channel subscription status:", status)
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reconnect()
        }
      })

    // 活动日志实时订阅
    const activitiesChannel = supabase
      .channel(`activities:${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
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
      .subscribe((status) => {
        console.log("Activities channel status:", status)
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reconnect()
        }
      })

    // 保存频道引用
    channelsRef.current = [presenceChannel, notesChannel, tagsChannel, tasksChannel, filesChannel, activitiesChannel]

  }, [meetingId, cleanup, reconnect, loadOnlineUsers, loadTags, loadTasks, loadFiles])

  // 主要effect
  useEffect(() => {
    if (!meetingId) return

    setupChannels()

    return cleanup
  }, [meetingId, setupChannels, cleanup])

  return cleanup
}
