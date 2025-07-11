"use client"

import { useState, useEffect } from "react"
import { Clock, User, Tag, CheckSquare, Edit, UserPlus, UserMinus, File, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"

interface Activity {
  id: string
  user_name: string
  activity_type: string
  activity_data: any
  created_at: string
}

interface ActivityFeedProps {
  meetingId: string
  activities?: Activity[]
}

export function ActivityFeed({ meetingId, activities: externalActivities }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([])

  useEffect(() => {
    // 加载活动历史
    const loadActivities = async () => {
      try {
        const { data, error } = await supabase
          .from("meeting_activities")
          .select("*")
          .eq("meeting_id", meetingId)
          .order("created_at", { ascending: false })
          .limit(20)

        if (error) throw error
        setActivities(data || [])
      } catch (error) {
        console.error("Error loading activities:", error)
      }
    }

    loadActivities()
  }, [meetingId])

  // 如果外部传入了活动数据，使用外部的数据
  const displayActivities = externalActivities || activities

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "join":
        return <UserPlus className="h-4 w-4 text-green-500" />
      case "leave":
        return <UserMinus className="h-4 w-4 text-red-500" />
      case "edit":
        return <Edit className="h-4 w-4 text-blue-500" />
      case "add_tag":
        return <Tag className="h-4 w-4 text-purple-500" />
      case "add_task":
        return <CheckSquare className="h-4 w-4 text-orange-500" />
      case "update_task":
        return <CheckSquare className="h-4 w-4 text-blue-500" />
      case "delete_task":
        return <Trash2 className="h-4 w-4 text-red-500" />
      case "upload_file":
        return <File className="h-4 w-4 text-blue-600" />
      case "delete_file":
        return <Trash2 className="h-4 w-4 text-red-600" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getActivityMessage = (activity: Activity) => {
    switch (activity.activity_type) {
      case "join":
        return `${activity.user_name} 加入了会议`
      case "leave":
        return `${activity.user_name} 离开了会议`
      case "edit":
        return `${activity.user_name} 编辑了笔记`
      case "add_tag":
        return `${activity.user_name} 添加了标签 "${activity.activity_data?.tag_name}"`
      case "add_task":
        return `${activity.user_name} 创建了任务 "${activity.activity_data?.task_title}"`
      case "update_task":
        return `${activity.user_name} 更新了任务状态`
      case "delete_task":
        return `${activity.user_name} 删除了任务 "${activity.activity_data?.task_title}"`
      case "upload_file":
        return `${activity.user_name} 上传了文件 "${activity.activity_data?.file_name}"`
      case "delete_file":
        return `${activity.user_name} 删除了文件 "${activity.activity_data?.file_name}"`
      default:
        return `${activity.user_name} 进行了操作`
    }
  }

  return (
    <div>
      <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center">
        <Clock className="h-4 w-4 mr-2" />
        活动动态
      </h3>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {displayActivities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            {getActivityIcon(activity.activity_type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 break-words leading-tight">{getActivityMessage(activity)}</p>
              <p className="text-xs text-gray-500 mt-1">{new Date(activity.created_at).toLocaleTimeString()}</p>
            </div>
          </div>
        ))}

        {displayActivities.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无活动记录</p>
          </div>
        )}
      </div>
    </div>
  )
}
