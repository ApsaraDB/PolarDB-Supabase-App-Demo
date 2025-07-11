"use client"

import { useState, useCallback, useEffect } from "react"
import { Upload, File, Download, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase, type MeetingFile } from "@/lib/supabase"



interface FileUploadProps {
  meetingId: string
  currentUser: string
  files: MeetingFile[]
  onFilesChange: (files: MeetingFile[]) => void
  onSuccess?: (title: string, message?: string) => void
  onError?: (title: string, message?: string) => void
}

export function FileUpload({ meetingId, currentUser, files, onFilesChange, onSuccess, onError }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // 检查 bucket 是否可访问（公共访问版本）
  useEffect(() => {
    const checkBucket = async () => {
      try {
        const { data, error: bucketError } = await supabase.storage
          .from('meeting-files')
          .list('', { limit: 1 })
        
        if (bucketError) {
          console.error("Error accessing bucket:", bucketError)
          console.log("Bucket error details:", {
            message: bucketError.message
          })
        } else {
          console.log("Bucket 'meeting-files' is accessible")
        }
      } catch (err) {
        console.error("Error checking bucket:", err)
      }
    }
    
    checkBucket()
  }, [])

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 获取文件图标
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "🖼️"
    if (mimeType.includes("pdf")) return "📄"
    if (mimeType.includes("word") || mimeType.includes("document")) return "📝"
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📊"
    if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📈"
    if (mimeType.includes("zip") || mimeType.includes("rar")) return "📦"
    return "📎"
  }



  // 上传文件
  const uploadFile = useCallback(async (file: File) => {
    if (!file) return

    // 文件大小限制 (50MB)
    const maxFileSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxFileSize) {
      onError?.("文件过大", `文件 ${file.name} 超过 50MB 限制，请选择较小的文件`)
      return
    }

    // 文件类型验证
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-rar-compressed',
      'video/mp4', 'video/avi', 'video/mov'
    ]
    
    if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
      onError?.("不支持的文件类型", `文件 ${file.name} 的类型不支持，请选择其他文件`)
      return
    }

    setIsUploading(true)
    try {
      console.log("开始上传文件:", file.name, "大小:", file.size, "类型:", file.type)

      // 生成唯一文件名
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = fileName // 直接上传到根目录
      
      console.log("文件路径:", filePath)

      // 上传到 Supabase Storage
      console.log("开始上传到 Storage...")
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('meeting-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error("Storage upload error:", uploadError)
        console.error("Error details:", {
          message: uploadError.message,
          name: uploadError.name,
          stack: uploadError.stack
        })
        
        // 检查是否是配置问题
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          throw new Error("Supabase 配置缺失，请检查环境变量")
        }
        
        // 尝试获取更详细的错误信息
        if (uploadError.message) {
          throw new Error(`上传失败: ${uploadError.message}`)
        } else {
          throw new Error("上传失败: 请检查存储桶配置和权限设置")
        }
      }

      console.log("文件上传成功:", uploadData)

      // 获取文件URL
      const { data: urlData } = supabase.storage
        .from('meeting-files')
        .getPublicUrl(filePath)

      console.log("文件URL:", urlData.publicUrl)

      // 保存文件信息到数据库
      const { data: fileRecord, error: dbError } = await supabase
        .from('meeting_files')
        .insert([
          {
            meeting_id: meetingId,
            file_name: file.name,
            file_url: urlData.publicUrl,
            uploader: currentUser,
            file_size: file.size,
            mime_type: file.type,
          },
        ])
        .select()
        .single()

      if (dbError) {
        console.error("Database insert error:", dbError)
        // 如果数据库插入失败，尝试删除已上传的文件
        try {
          await supabase.storage.from('meeting-files').remove([filePath])
          console.log("已删除上传失败的文件:", filePath)
        } catch (cleanupError) {
          console.error("清理上传文件失败:", cleanupError)
        }
        throw new Error(`数据库保存失败: ${dbError.message}`)
      }

      console.log("数据库记录创建成功:", fileRecord)

      // 记录文件上传活动
      try {
        await supabase.from("meeting_activities").insert({
          meeting_id: meetingId,
          user_name: currentUser,
          activity_type: "upload_file",
          activity_data: {
            file_name: file.name,
            file_size: file.size,
            file_id: fileRecord.id
          },
        })
        console.log("文件上传活动记录成功")
      } catch (activityError) {
        console.error("Error logging file upload activity:", activityError)
        // 活动记录失败不影响文件上传成功
      }

      // 不直接更新本地状态，让实时订阅处理
      onSuccess?.("文件上传成功", `${file.name} 已上传`)

    } catch (err) {
      console.error("Error uploading file:", err)
      const errorMessage = err instanceof Error ? err.message : "未知错误"
      
      onError?.("上传失败", errorMessage)
    } finally {
      setIsUploading(false)
    }
  }, [meetingId, currentUser, onSuccess, onError])

  // 删除文件
  const deleteFile = useCallback(async (fileId: string, fileName: string) => {
    try {
      // 从数据库删除
      const { error: dbError } = await supabase
        .from('meeting_files')
        .delete()
        .eq('id', fileId)

      if (dbError) {
        console.error("Database delete error:", dbError)
        throw new Error(`数据库删除失败: ${dbError.message}`)
      }

      // 记录文件删除活动
      try {
        await supabase.from("meeting_activities").insert({
          meeting_id: meetingId,
          user_name: currentUser,
          activity_type: "delete_file",
          activity_data: {
            file_name: fileName
          },
        })
        console.log("文件删除活动记录成功")
      } catch (activityError) {
        console.error("Error logging file delete activity:", activityError)
        // 活动记录失败不影响文件删除成功
      }

      // 不直接更新本地状态，让实时订阅处理
      console.log("等待实时订阅更新文件列表...")
      onSuccess?.("文件删除成功", `${fileName} 已删除`)

    } catch (err) {
      console.error("Error deleting file:", err)
      const errorMessage = err instanceof Error ? err.message : "未知错误"
      
      // 根据错误类型提供更具体的提示
      if (errorMessage.includes("权限")) {
        onError?.("权限不足", "您没有删除此文件的权限")
      } else if (errorMessage.includes("网络")) {
        onError?.("网络错误", "网络连接异常，请检查网络后重试")
      } else if (errorMessage.includes("数据库")) {
        onError?.("数据库错误", "文件删除失败，请稍后重试")
      } else {
        onError?.("删除失败", `文件删除失败: ${errorMessage}`)
      }
    }
  }, [meetingId, currentUser, onSuccess, onError])

  // 处理文件选择
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      // 文件数量限制 (最多同时上传 10 个文件)
      if (selectedFiles.length > 10) {
        onError?.("文件数量过多", "一次最多只能选择 10 个文件，请分批上传")
        return
      }

      // 检查是否有重复文件
      const fileNames = Array.from(selectedFiles).map(f => f.name)
      const uniqueNames = new Set(fileNames)
      if (fileNames.length !== uniqueNames.size) {
        onError?.("重复文件", "检测到重复文件，请检查后重新选择")
        return
      }

      // 检查是否与已上传文件重复
      const existingFileNames = files.map(f => f.file_name)
      const duplicateFiles = fileNames.filter(name => existingFileNames.includes(name))
      if (duplicateFiles.length > 0) {
        onError?.("文件已存在", `以下文件已存在: ${duplicateFiles.join(', ')}`)
        return
      }

      // 显示上传开始提示
      if (selectedFiles.length === 1) {
        onSuccess?.("开始上传", `正在上传 ${selectedFiles[0].name}`)
      } else {
        onSuccess?.("开始上传", `正在上传 ${selectedFiles.length} 个文件`)
      }

      Array.from(selectedFiles).forEach(uploadFile)
    }
    
    // 清空 input 值，允许重复选择同一文件
    event.target.value = ''
  }, [uploadFile, files, onSuccess, onError])

  // 处理拖拽
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    
    if (droppedFiles.length === 0) {
      onError?.("无效文件", "请拖拽有效的文件")
      return
    }

    // 文件数量限制
    if (droppedFiles.length > 10) {
      onError?.("文件数量过多", "一次最多只能拖拽 10 个文件，请分批上传")
      return
    }

    // 检查是否有重复文件
    const fileNames = droppedFiles.map(f => f.name)
    const uniqueNames = new Set(fileNames)
    if (fileNames.length !== uniqueNames.size) {
      onError?.("重复文件", "检测到重复文件，请检查后重新拖拽")
      return
    }

    // 检查是否与已上传文件重复
    const existingFileNames = files.map(f => f.file_name)
    const duplicateFiles = fileNames.filter(name => existingFileNames.includes(name))
    if (duplicateFiles.length > 0) {
      onError?.("文件已存在", `以下文件已存在: ${duplicateFiles.join(', ')}`)
      return
    }

    // 显示上传开始提示
    if (droppedFiles.length === 1) {
      onSuccess?.("开始上传", `正在上传 ${droppedFiles[0].name}`)
    } else {
      onSuccess?.("开始上传", `正在上传 ${droppedFiles.length} 个文件`)
    }

    droppedFiles.forEach(uploadFile)
  }, [uploadFile, files, onSuccess, onError])

  return (
    <div>
      <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center">
        <File className="h-4 w-4 mr-2" />
        会议资料
      </h3>
      <div className="space-y-3">
        {/* 上传区域 */}
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-6 w-6 mx-auto mb-1 text-gray-400" />
          <p className="text-xs text-gray-600 mb-2">
            拖拽文件到此处或点击选择文件
          </p>
          <p className="text-xs text-gray-500 mb-3">
            支持图片、文档、视频等格式，单个文件最大 50MB
          </p>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={isUploading}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.mp4,.avi,.mov"
          />
          <label htmlFor="file-upload">
            <Button
              variant="outline"
              size="sm"
              disabled={isUploading}
              className="cursor-pointer text-xs"
              asChild
            >
              <span>
                {isUploading ? "上传中..." : "选择文件"}
              </span>
            </Button>
          </label>
        </div>

        {/* 文件列表 */}
        {files.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="font-medium text-xs text-gray-700">已上传文件</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-start justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0 mt-0.5">{getFileIcon(file.mime_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 break-words leading-tight">
                        {file.file_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500 mt-1">
                        <span className="bg-gray-200 px-1.5 py-0.5 rounded">{formatFileSize(file.file_size)}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="truncate max-w-20">{file.uploader}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="text-xs">{new Date(file.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(file.file_url, '_blank')}
                      title="下载文件"
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFile(file.id, file.file_name)}
                      title="删除文件"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 