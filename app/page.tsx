"use client"

import { supabase } from "@/lib/supabase"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Users, FileText, Clock, Calendar, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ToastContainer } from "@/components/Toast"
import { UserProfile } from "@/components/UserProfile"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/hooks/useAuth"

export default function HomePage() {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const router = useRouter()
  const { toasts, success, error } = useToast()
  const { user, isAuthenticated, loading: authLoading } = useAuth()

  // 移除调试日志，优化已完成

  // 使用 useCallback 优化回调函数，避免不必要的重新渲染
  const handleUserProfileSuccess = useCallback((message: string) => {
    success("操作成功", message)
  }, [success])

  const handleUserProfileError = useCallback((message: string) => {
    error("操作失败", message)
  }, [error])

  const createMeeting = async () => {
    if (!title.trim()) {
      error("创建失败", "请输入会议标题")
      return
    }

    if (!isAuthenticated) {
      error("需要登录", "请先登录或匿名加入后再创建会议")
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("meetings")
        .insert([
          {
            title: title,
            description: description || "",
          },
        ])
        .select()
        .single()

      if (error) throw error

      // 创建初始笔记
      await supabase.from("notes").insert([
        {
          meeting_id: data.id,
          content: {
            text: `欢迎参加会议：${title}`,
          },
        },
      ])

      success("会议创建成功", `会议"${title}"已创建，正在跳转到协同编辑页面...`)
      setTimeout(() => {
        router.push(`/meeting/${data.id}`)
      }, 1500)

    } catch (error) {
      console.error("Error creating meeting:", error)
      alert("创建会议失败，请重试")
    } finally {
      setLoading(false)
    }
  }
  // 在 joinExistingMeeting 函数开始处添加日志
  const joinExistingMeeting = async () => {
    console.log("joinExistingMeeting called - isAuthenticated:", isAuthenticated)
    if (!isAuthenticated) {
      error("需要登录", "请先登录或匿名加入后再进入会议")
      return
    }

    setLoading(true)
    try {
      // 查询数据库中最早的会议
      const { data: latestMeetings, error: queryError } = await supabase
        .from("meetings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)

      if (queryError) throw queryError

      let meetingId: string

      if (latestMeetings && latestMeetings.length > 0) {
        // 使用最新的会议
        const latestMeeting = latestMeetings[0]
        meetingId = latestMeeting.id
        success("正在加入会议", `即将进入"${latestMeeting.title}"...`)
      } else {
        // 如果没有会议，创建新的演示会议
        const { data: newMeeting, error: createError } = await supabase
          .from("meetings")
          .insert([
            {
              title: "产品规划会议",
              description: "讨论Q1产品路线图和功能优先级",
            },
          ])
          .select()
          .single()

        if (createError) throw createError

        // 创建初始笔记
        const noteContent = ``

        await supabase.from("notes").insert([
          {
            meeting_id: newMeeting.id,
            content: {
              text: noteContent,
            },
          },
        ])

        meetingId = newMeeting.id
        success("演示会议创建成功", "正在进入产品规划会议...")
      }

      setTimeout(() => {
        router.push(`/meeting/${meetingId}`)
      }, 1000)

    } catch (err) {
      console.error("Error joining demo meeting:", err)
      error("加入会议失败", "请重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Toast 容器 */}
      <ToastContainer toasts={toasts} />

      {/* 头部导航 */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-800">智能会议记录系统</h1>
          </div>

          <UserProfile
            onSuccess={handleUserProfileSuccess}
            onError={handleUserProfileError}
          />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">实时协同会议记录</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            创建会议，生成协同笔记链接，支持实时编辑、标签管理和任务追踪
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              实时协同
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              智能记录
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              任务追踪
            </Badge>
          </div>

          {/* 用户状态提示 */}
          {isAuthenticated && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-800 text-sm">
                👋 欢迎 <strong>{user?.name}</strong>！
                {user?.is_anonymous
                  ? " 您当前以匿名身份使用，可升级为实名用户获得更多功能。"
                  : " 您已登录，可以创建和管理会议。"}
              </p>
            </div>
          )}

          {!isAuthenticated && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-800 text-sm">💡 请先登录或匿名加入，然后即可创建会议或加入现有会议</p>
            </div>
          )}
        </div>

        <div className="max-w-6xl mx-auto">
          {/* 功能特性展示 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="text-center p-6">
                <Users className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">实时协同</h3>
                <p className="text-gray-600 text-sm">多人同时编辑笔记，实时显示在线状态和打字指示</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="text-center p-6">
                <FileText className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">智能记录</h3>
                <p className="text-gray-600 text-sm">支持富文本编辑、标签分类、截图插入等功能</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="text-center p-6">
                <MessageSquare className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">活动追踪</h3>
                <p className="text-gray-600 text-sm">实时显示用户活动，记录完整的会议动态</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="text-center p-6">
                <Calendar className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">任务管理</h3>
                <p className="text-gray-600 text-sm">创建和分配任务，跟踪进度和截止时间</p>
              </CardContent>
            </Card>
          </div>

          {/* 演示入口 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* 创建新会议 */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-center text-gray-800 flex items-center justify-center">
                  <Plus className="mr-3 h-6 w-6" />
                  创建新会议
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                      会议标题
                    </label>
                    <Input
                      id="title"
                      placeholder="输入会议标题..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={loading || !isAuthenticated}
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                      会议描述（可选）
                    </label>
                    <Textarea
                      id="description"
                      rows={4}
                      placeholder="输入会议描述..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={loading || !isAuthenticated}
                    />
                  </div>

                  <Button
                    onClick={createMeeting}
                    disabled={loading || !isAuthenticated || !title.trim()}
                    className="w-full h-12 text-lg font-semibold"
                  >
                    {loading ? "创建中..." : "创建会议并生成协同链接"}
                  </Button>

                  {!isAuthenticated && <p className="text-xs text-gray-500 text-center mt-2">需要登录后才能创建会议</p>}
                </div>
              </CardContent>
            </Card>

            {/* 加入演示会议 */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-center text-gray-800 flex items-center justify-center">
                  <Users className="mr-3 h-6 w-6" />
                  体验演示会议
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-800 mb-2">最新会议</h4>
                      <p className="text-gray-600 text-sm mb-3">自动加入数据库中最新创建的会议</p>
                      <div className="flex justify-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          实时协同
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          智能记录
                        </Badge>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">
                      系统会自动查找并加入最新创建的会议，如果没有会议则创建新的演示会议。
                    </p>
                  </div>

                  <Button
                    onClick={joinExistingMeeting}
                    disabled={loading || !isAuthenticated}
                    variant="outline"
                    className="w-full h-12 text-lg font-semibold bg-transparent"
                  >
                    {loading ? "加入中..." : "加入演示会议"}
                  </Button>

                  {!isAuthenticated && (
                    <p className="text-xs text-gray-500 text-center mt-2">请先登录或匿名加入后即可体验</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 功能亮点 */}
          <div className="text-center">
            <div className="flex gap-8 justify-center text-gray-500 flex-wrap">
              <span className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                实时同步
              </span>
              <span className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                多人协作
              </span>
              <span className="flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                智能记录
              </span>
              <span className="flex items-center">
                <MessageSquare className="mr-2 h-4 w-4" />
                活动追踪
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
