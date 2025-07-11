"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { User, Edit3, Tag, Share, CheckSquare, Clock, Plus, Copy, Activity, Sparkles, ArrowLeft, Trash2 } from "lucide-react"
import {
  supabase,
  type Meeting,
  type Note,
  type UserPresence,
  type Tag as TagType,
  type Task,
  type MeetingFile,
} from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CollaborativeEditor } from "@/components/CollaborativeEditor"
import { ActivityFeed } from "@/components/ActivityFeed"
import { MeetingSummaryModal } from "@/components/MeetingSummaryModal"
import { UserProfile } from "@/components/UserProfile"
import { FileUpload } from "@/components/FileUpload"
import ConfigCheck from "@/components/ConfigCheck"
import { ToastContainer } from "@/components/Toast"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/hooks/useAuth"
import { useRealtime } from "@/hooks/useRealtime"

// 生成随机颜色
const generateColor = () => {
  const colors = ["#1890ff", "#52c41a", "#faad14", "#f5222d", "#722ed1", "#13c2c2", "#eb2f96"]
  return colors[Math.floor(Math.random() * colors.length)]
}

export default function MeetingPage() {
  const params = useParams()
  const router = useRouter()
  const meetingId = params.id as string
  const { toasts, success, error, info } = useToast()
  const { user, isAuthenticated, loading } = useAuth()

  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [note, setNote] = useState<Note | null>(null)
  const [noteContent, setNoteContent] = useState("")
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([])
  const [tags, setTags] = useState<TagType[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [files, setFiles] = useState<MeetingFile[]>([])
  const [currentUserPresence, setCurrentUserPresence] = useState<UserPresence | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [showActivityFeed, setShowActivityFeed] = useState(true)

  // 模态框状态
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)

  // 表单状态
  const [tagName, setTagName] = useState("")
  const [tagColor, setTagColor] = useState("#1890ff")
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [taskAssignee, setTaskAssignee] = useState("")

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const editActivityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastEditActivityRef = useRef<string | null>(null)
  const saveNoteTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 使用 useCallback 优化回调函数，避免不必要的重新渲染
  const handleUserProfileSuccess = useCallback((message: string) => {
    success("操作成功", message)
  }, [success])

  const handleUserProfileError = useCallback((message: string) => {
    error("操作失败", message)
  }, [error])
  // 修改登录检查逻辑，添加 loading 状态
  useEffect(() => {
    if (loading) return // 等待 loading 完成

    if (!isAuthenticated) {
      error("需要登录", "请先登录后再加入会议")
      router.push("/")
      return
    }
  }, [isAuthenticated, loading, router, error])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (editActivityTimeoutRef.current) {
        clearTimeout(editActivityTimeoutRef.current)
      }
      if (saveNoteTimeoutRef.current) {
        clearTimeout(saveNoteTimeoutRef.current)
      }
    }
  }, [])

  // 记录活动日志
  const logActivity = useCallback(
    async (activityType: string, activityData: any = {}) => {
      const userName = currentUserPresence?.user_name || user?.name || "未知用户"
      if (!userName) return

      try {
        await supabase.from("meeting_activities").insert({
          meeting_id: meetingId,
          user_name: userName,
          activity_type: activityType,
          activity_data: activityData,
        })
      } catch (error) {
        console.error("Error logging activity:", error)
      }
    },
    [meetingId, currentUserPresence, user],
  )

  // 实时回调函数 - 使用 useCallback 来稳定引用
  const onUserPresenceChange = useCallback((users: UserPresence[]) => {
    setOnlineUsers(users)
  }, [])

  const onNoteChange = useCallback((updatedNote: Note) => {
    // 使用函数式更新来避免依赖 noteContent
    setNoteContent((currentContent) => {
      if (updatedNote.content?.text !== currentContent) {
        setNote(updatedNote)
        return updatedNote.content?.text || ""
      }
      return currentContent
    })
  }, [])

  const onTagsChange = useCallback((updatedTags: TagType[]) => {
    setTags(updatedTags)
  }, [])

  const onTasksChange = useCallback((updatedTasks: Task[]) => {
    setTasks(updatedTasks)
  }, [])

  const onFilesChange = useCallback((updatedFiles: MeetingFile[]) => {
    console.log("Files updated via realtime:", updatedFiles)
    setFiles(updatedFiles)
  }, [])

  const onActivityChange = useCallback((activity: any) => {
    console.log("Activity change:", activity)
    // 检查是否已存在该活动（用于处理 UPDATE 事件）
    setActivities((prev) => {
      const existingIndex = prev.findIndex(a => a.id === activity.id)
      if (existingIndex >= 0) {
        // 更新现有活动
        const updated = [...prev]
        updated[existingIndex] = activity
        return updated
      } else {
        // 添加新活动
        return [activity, ...prev.slice(0, 19)]
      }
    })
  }, [])

  // 使用 useMemo 来稳定 realtimeCallbacks 的引用
  const realtimeCallbacks = useMemo(() => ({
    onUserPresenceChange,
    onNoteChange,
    onTagsChange,
    onTasksChange,
    onFilesChange,
    onActivityChange,
  }), [onUserPresenceChange, onNoteChange, onTagsChange, onTasksChange, onFilesChange, onActivityChange])

  // 使用实时 hook
  useRealtime(meetingId, realtimeCallbacks)

  // 初始化用户在线状态
  const initializeUserPresence = useCallback(async () => {
    if (!user) return

    const userColor = generateColor()

    try {
      // 使用 upsert 操作，如果用户已存在则更新，否则插入
      const { data, error } = await supabase
        .from("user_presence")
        .upsert(
          {
            meeting_id: meetingId,
            user_name: user.name,
            user_color: userColor,
            is_typing: false,
            last_seen: new Date().toISOString(),
          },
          {
            onConflict: "meeting_id,user_name",
            ignoreDuplicates: false,
          }
        )
        .select()
        .single()

      if (error) throw error
      setCurrentUserPresence(data)

      // 检查是否是新用户（通过检查 created_at 和 updated_at 是否相同）
      const isNewUser = data.created_at === data.updated_at
      
      if (isNewUser) {
        // 记录加入活动
        await supabase.from("meeting_activities").insert({
          meeting_id: meetingId,
          user_name: user.name,
          activity_type: "join",
          activity_data: { user_type: user.is_anonymous ? "anonymous" : "registered" },
        })

        success("成功加入会议", `您已以 ${user.name} 身份加入协同编辑`)
      }
    } catch (err) {
      console.error("Error initializing user presence:", err)
      error("加入会议失败", "请刷新页面重试")
    }
  }, [meetingId, user, success, error])

  // 加载会议数据
  const loadMeetingData = useCallback(async () => {
    try {
      // 加载会议信息
      const { data: meetingData, error: meetingError } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", meetingId)
        .single()

      if (meetingError) throw meetingError
      setMeeting(meetingData)

      // 加载笔记
      const { data: noteData, error: noteError } = await supabase
        .from("notes")
        .select("*")
        .eq("meeting_id", meetingId)
        .single()

      if (noteError && noteError.code !== "PGRST116") throw noteError
      if (noteData) {
        setNote(noteData)
        setNoteContent(noteData.content?.text || "")
      }

      // 加载标签
      const { data: tagsData, error: tagsError } = await supabase.from("tags").select("*").eq("meeting_id", meetingId)
      if (tagsError) throw tagsError
      setTags(tagsData || [])

      // 加载任务
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("meeting_id", meetingId)
      if (tasksError) throw tasksError
      setTasks(tasksData || [])

      // 加载在线用户
      const { data: usersData, error: usersError } = await supabase
        .from("user_presence")
        .select("*")
        .eq("meeting_id", meetingId)
        .gte("last_seen", new Date(Date.now() - 300000).toISOString()) // 5分钟

      if (usersError) throw usersError
      setOnlineUsers(usersData || [])

      // 加载活动历史
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("meeting_activities")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: false })
        .limit(20)

      if (activitiesError) throw activitiesError
      setActivities(activitiesData || [])

      // 加载文件
      const { data: filesData, error: filesError } = await supabase
        .from("meeting_files")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("uploaded_at", { ascending: false })

      if (filesError) throw filesError
      setFiles(filesData || [])
    } catch (err) {
      console.error("Error loading meeting data:", err)
      error("加载失败", "无法加载会议数据，请刷新页面重试")
    }
  }, [meetingId, error])

  // 设置打字状态
  const setTypingStatus = useCallback(
    async (typing: boolean) => {
      if (!currentUserPresence) return
      try {
        await supabase.from("user_presence").update({ is_typing: typing }).eq("id", currentUserPresence.id)
        setIsTyping(typing)
      } catch (error) {
        console.error("Error updating typing status:", error)
      }
    },
    [currentUserPresence],
  )

  // 处理笔记内容变化 - 优化版本，使用防抖减少数据库操作
  const handleNoteChange = useCallback(
    (value: string) => {
      // 立即更新本地状态，保证输入响应性
      setNoteContent(value)

      // 处理打字状态
      if (!isTyping) {
        setTypingStatus(true)
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(false)
      }, 1000)

      // 防抖保存到数据库 - 2秒后保存
      if (saveNoteTimeoutRef.current) {
        clearTimeout(saveNoteTimeoutRef.current)
      }

      saveNoteTimeoutRef.current = setTimeout(async () => {
        if (note) {
          try {
            await supabase
              .from("notes")
              .update({
                content: { text: value },
                updated_at: new Date().toISOString(),
              })
              .eq("id", note.id)

            // 防抖处理编辑活动记录 - 同一用户连续编辑只记录一条，但更新最后活动时间
            const currentUser = currentUserPresence?.user_name || user?.name
            if (currentUser) {
              // 清除之前的编辑活动定时器
              if (editActivityTimeoutRef.current) {
                clearTimeout(editActivityTimeoutRef.current)
              }

              // 如果当前用户没有正在记录的编辑活动，立即记录一条
              if (lastEditActivityRef.current !== currentUser) {
                await logActivity("edit", { content_length: value.length })
                lastEditActivityRef.current = currentUser
              } else {
                // 如果用户正在连续编辑，更新最后活动时间而不是创建新记录
                try {
                  // 先查询用户最近的编辑活动
                  const { data: recentActivity, error: queryError } = await supabase
                    .from("meeting_activities")
                    .select("id")
                    .eq("meeting_id", meetingId)
                    .eq("user_name", currentUser)
                    .eq("activity_type", "edit")
                    .gte("created_at", new Date(Date.now() - 20000).toISOString())
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single()

                  if (!queryError && recentActivity) {
                    const newTime = new Date().toISOString()
                    // 更新最近的活动记录时间
                    await supabase
                      .from("meeting_activities")
                      .update({ 
                        created_at: newTime,
                        activity_data: { content_length: value.length }
                      })
                      .eq("id", recentActivity.id)

                    // 直接更新本地状态，立即反映时间变化
                    setActivities((prev) => 
                      prev.map((activity) => 
                        activity.id === recentActivity.id 
                          ? { ...activity, created_at: newTime, activity_data: { content_length: value.length } }
                          : activity
                      )
                    )
                  }
                } catch (error) {
                  console.error("Error updating edit activity:", error)
                }
              }

              // 设置定时器，在用户停止编辑 20 秒后重置状态，允许下次编辑时重新记录
              editActivityTimeoutRef.current = setTimeout(() => {
                lastEditActivityRef.current = null
              }, 20000)
            }
          } catch (error) {
            console.error("Error updating note:", error)
          }
        }
      }, 2000) // 2秒防抖
    },
    [note, isTyping, setTypingStatus, logActivity, currentUserPresence, user, meetingId],
  )

  // 创建标签
  const createTag = async () => {
    if (!tagName.trim()) {
      error("创建失败", "请输入标签名称")
      return
    }

    try {
      const { data, error: createError } = await supabase
        .from("tags")
        .insert([
          {
            meeting_id: meetingId,
            name: tagName,
            color: tagColor,
          },
        ])
        .select()
        .single()

      if (createError) throw createError

      setTags((prev) => [...prev, data])
      setTagModalOpen(false)
      setTagName("")
      setTagColor("#1890ff")

      // 记录添加标签活动
      await logActivity("add_tag", { tag_name: tagName, tag_color: tagColor })

      success("标签创建成功", `已添加标签"${tagName}"`)
    } catch (err) {
      console.error("Error creating tag:", err)
      error("创建失败", "无法创建标签，请重试")
    }
  }

  // 创建任务
  const createTask = async () => {
    if (!taskTitle.trim()) {
      error("创建失败", "请输入任务标题")
      return
    }

    try {
      const { data, error: createError } = await supabase
        .from("tasks")
        .insert([
          {
            meeting_id: meetingId,
            title: taskTitle,
            description: taskDescription,
            assignee: taskAssignee,
            status: "pending",
          },
        ])
        .select()
        .single()

      if (createError) throw createError

      setTasks((prev) => [...prev, data])
      setTaskModalOpen(false)
      setTaskTitle("")
      setTaskDescription("")
      setTaskAssignee("")

      // 记录添加任务活动
      await logActivity("add_task", {
        task_title: taskTitle,
        task_assignee: taskAssignee,
      })

      success("任务创建成功", `已创建任务"${taskTitle}"${taskAssignee ? `，负责人：${taskAssignee}` : ""}`)
    } catch (err) {
      console.error("Error creating task:", err)
      error("创建失败", "无法创建任务，请重试")
    }
  }

  // 更新任务状态
  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", taskId)

      if (updateError) throw updateError

      setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status } : task)))

      // 记录更新任务活动
      await logActivity("update_task", { task_id: taskId, new_status: status })

      const statusText = status === "completed" ? "已完成" : status === "in_progress" ? "进行中" : "待办"
      success("状态更新成功", `任务状态已更新为"${statusText}"`)
    } catch (err) {
      console.error("Error updating task:", err)
      error("更新失败", "无法更新任务状态，请重试")
    }
  }

  // 删除任务
  const deleteTask = async (taskId: string, taskTitle: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId)

      if (deleteError) throw deleteError

      // 记录删除任务活动
      await logActivity("delete_task", { task_title: taskTitle })

      success("任务删除成功", `已删除任务"${taskTitle}"`)
    } catch (err) {
      console.error("Error deleting task:", err)
      error("删除失败", "无法删除任务，请重试")
    }
  }

  // 复制分享链接
  const copyShareLink = () => {
    const link = window.location.href
    navigator.clipboard.writeText(link)
    success("链接已复制", "协同笔记链接已复制到剪贴板")
    setShareModalOpen(false)
  }

  // 初始化
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeUserPresence()
      loadMeetingData()
    }
  }, [isAuthenticated, user, initializeUserPresence, loadMeetingData])

  // 组件卸载时记录离开活动
  useEffect(() => {
    return () => {
      // 清理定时器
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (editActivityTimeoutRef.current) {
        clearTimeout(editActivityTimeoutRef.current)
      }

      // 清理用户在线状态
      if (user && currentUserPresence) {
        try {
          // 删除用户在线状态
          supabase
            .from("user_presence")
            .delete()
            .eq("id", currentUserPresence.id)
          
          // 记录离开活动
          supabase.from("meeting_activities").insert({
            meeting_id: meetingId,
            user_name: user.name,
            activity_type: "leave",
            activity_data: {},
          })
        } catch (error) {
          console.error("Error cleaning up user presence on unmount:", error)
        }
      }
    }
  }, [meetingId, user, currentUserPresence])

  // 修改渲染逻辑
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">初始化用户状态中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // 会被重定向到首页
  }

  if (!meeting) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载会议数据中...</p>
        </div>
      </div>
    )
  }

  const typingUsers = onlineUsers.filter((user) => user.is_typing && user.id !== currentUserPresence?.id)

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Toast 容器 */}
        <ToastContainer toasts={toasts} />

        {/* 头部 */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="p-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <h1 className="text-xl font-semibold text-gray-800">{meeting.title}</h1>

            {/* 在线用户显示 */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-500 text-sm">在线:</span>
              <div className="flex -space-x-2">
                {onlineUsers.slice(0, 5).map((user) => (
                  <Tooltip key={user.id}>
                    <TooltipTrigger asChild>
                      <Avatar className="w-8 h-8 border-2 border-white cursor-pointer hover:scale-110 transition-transform">
                        <AvatarFallback style={{ backgroundColor: user.user_color }}>
                          <User className="h-4 w-4 text-white" />
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: user.user_color }} />
                        <span className="font-medium">{user.user_name}</span>
                        {user.is_typing && <span className="text-xs text-blue-500">(正在输入...)</span>}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {onlineUsers.length > 5 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                        <span className="text-xs text-gray-600">+{onlineUsers.length - 5}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        {onlineUsers.slice(5).map((user) => (
                          <div key={user.id} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: user.user_color }} />
                            <span className="text-sm">{user.user_name}</span>
                            {user.is_typing && <span className="text-xs text-blue-500">(正在输入...)</span>}
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {onlineUsers.length}人在线
              </Badge>
            </div>

            {/* 打字指示 */}
            {typingUsers.length > 0 && (
              <div className="flex items-center space-x-1 text-blue-500">
                <Edit3 className="h-4 w-4 animate-pulse" />
                <span className="text-sm">{typingUsers.map((user) => user.user_name).join(", ")} 正在输入...</span>
              </div>
            )}

          </div>

          <div className="flex items-center space-x-2">
            <UserProfile
              meetingId={meetingId}
              onSuccess={handleUserProfileSuccess}
              onError={handleUserProfileError}
            />

            <Button variant="outline" size="sm" onClick={() => setShowActivityFeed(!showActivityFeed)}>
              <Activity className="h-4 w-4 mr-2" />
              {showActivityFeed ? "隐藏" : "显示"}动态
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSummaryModalOpen(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none hover:from-purple-600 hover:to-pink-600"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI 纪要总结
            </Button>

            <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Share className="h-4 w-4 mr-2" />
                  分享链接
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>分享协同笔记链接</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">任何人都可以通过此链接匿名加入协同编辑：</p>
                  <div className="flex items-center space-x-2">
                    <Input value={window.location.href} readOnly className="bg-gray-50" />
                    <Button onClick={copyShareLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Tag className="h-4 w-4 mr-2" />
                  添加标签
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加标签</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">标签名称</label>
                    <Input placeholder="输入标签名称" value={tagName} onChange={(e) => setTagName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">标签颜色</label>
                    <Select value={tagColor} onValueChange={setTagColor}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="#1890ff">蓝色</SelectItem>
                        <SelectItem value="#52c41a">绿色</SelectItem>
                        <SelectItem value="#faad14">橙色</SelectItem>
                        <SelectItem value="#f5222d">红色</SelectItem>
                        <SelectItem value="#722ed1">紫色</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createTag} className="w-full">
                    创建标签
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  添加任务
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加任务</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">任务标题</label>
                    <Input
                      placeholder="输入任务标题"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">任务描述</label>
                    <Textarea
                      rows={3}
                      placeholder="输入任务描述"
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">负责人</label>
                    <Input
                      placeholder="输入负责人姓名"
                      value={taskAssignee}
                      onChange={(e) => setTaskAssignee(e.target.value)}
                    />
                  </div>
                  <Button onClick={createTask} className="w-full">
                    创建任务
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* 主体内容 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 笔记编辑区 */}
          <div className="flex-1 flex flex-col p-6 bg-white mr-1">
            {/* 标签显示 */}
            {tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-white">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* 协同编辑器 */}
            <CollaborativeEditor
              meetingId={meetingId}
              currentUserId={currentUserPresence?.id || ""}
              value={noteContent}
              onChange={handleNoteChange}
              placeholder="开始记录会议笔记..."
            />

            {/* 工具栏 */}
            <div className="flex items-center justify-between border-t pt-4 mt-4">
              <span className="text-sm text-gray-500">
                最后更新: {note?.updated_at ? new Date(note.updated_at).toLocaleString() : "未保存"}
              </span>
              <span className="text-sm text-gray-400">{noteContent.length} 字符</span>
            </div>
          </div>

          {/* 右侧边栏 */}
          <div className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            {/* 右侧内容区域 - 可滚动 */}
            <div className="flex-1 overflow-y-auto sidebar-scrollbar">
              {/* 活动动态 */}
              {showActivityFeed && (
                <div className="p-4 border-b border-gray-200">
                  <ActivityFeed meetingId={meetingId} activities={activities} />
                </div>
              )}

              {/* 文件上传 */}
              <div className="p-4 border-b border-gray-200">
                <FileUpload
                  meetingId={meetingId}
                  currentUser={currentUserPresence?.user_name || user?.name || ""}
                  files={files}
                  onFilesChange={setFiles}
                  onSuccess={success}
                  onError={error}
                />
              </div>

              {/* 任务列表 */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-gray-700 flex items-center">
                    <CheckSquare className="h-4 w-4 mr-2" />
                    任务列表
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setTaskModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <div className="flex items-center gap-1">
                            <Select value={task.status} onValueChange={(value) => updateTaskStatus(task.id, value)}>
                              <SelectTrigger className="w-20 h-6 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">待办</SelectItem>
                                <SelectItem value="in_progress">进行中</SelectItem>
                                <SelectItem value="completed">已完成</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTask(task.id, task.title)}
                              title="删除任务"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {task.description && <p className="text-xs text-gray-500">{task.description}</p>}

                        <div className="flex items-center justify-between text-xs text-gray-400">
                          {task.assignee && (
                            <span className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {task.assignee}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* 任务状态指示器 */}
                        <div className="flex items-center">
                          <div
                            className={`w-2 h-2 rounded-full mr-2 ${
                              task.status === "completed"
                                ? "bg-green-500"
                                : task.status === "in_progress"
                                  ? "bg-blue-500"
                                  : "bg-gray-400"
                            }`}
                          />
                          <span className="text-xs text-gray-500">
                            {task.status === "completed" ? "已完成" : task.status === "in_progress" ? "进行中" : "待办"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {tasks.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">暂无任务</p>
                      <p className="text-xs mt-1">点击上方按钮添加任务</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI 纪要总结模态框 */}
        <MeetingSummaryModal
          open={summaryModalOpen}
          onOpenChange={setSummaryModalOpen}
          meetingTitle={meeting.title}
          meetingContent={noteContent}
          onSuccess={(message) => success("操作成功", message)}
        />
      </div>
    </TooltipProvider>
  )
}
