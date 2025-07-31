"use client"

import { useState } from "react"
import { FileText, Loader2, Download, Copy, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

import { generateMeetingSummary } from "@/lib/ai-service"

interface MeetingSummaryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meetingTitle: string
  meetingContent: string
  currentUserId?: string
  onSuccess?: (message: string) => void
}

export function MeetingSummaryModal({
  open,
  onOpenChange,
  meetingTitle,
  meetingContent,
  currentUserId = "anonymous",
  onSuccess,
}: MeetingSummaryModalProps) {
  const [summary, setSummary] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)


  // 生成会议纪要
  const handleGenerateSummary = async () => {
    if (!meetingContent.trim()) {
      onSuccess?.("会议内容为空，无法生成纪要")
      return
    }

    setIsGenerating(true)
    setSummary("")

    try {
      const response = await generateMeetingSummary(
        meetingTitle, 
        meetingContent, 
        currentUserId,
        'tongyi'
      )

      setSummary(response.answer)
      onSuccess?.("会议纪要生成成功！")
    } catch (error) {
      console.error("Error generating summary:", error)
      onSuccess?.("生成会议纪要失败，请重试")
    } finally {
      setIsGenerating(false)
    }
  }

  // 复制纪要内容
  const handleCopySummary = () => {
    if (summary) {
      navigator.clipboard.writeText(summary)
      onSuccess?.("会议纪要已复制到剪贴板")
    }
  }

  // 下载纪要为 Markdown 文件
  const handleDownloadSummary = () => {
    if (!summary) return

    const blob = new Blob([summary], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${meetingTitle}-会议纪要-${new Date().toLocaleDateString()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    onSuccess?.("会议纪要文件下载成功！")
  }

  const hasContent = summary.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI 会议纪要总结
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 操作区域 */}
          <div className="space-y-4 mb-4">
            {/* 基本信息 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {meetingTitle}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {meetingContent.length} 字符
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handleGenerateSummary} disabled={isGenerating} size="sm">
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  {isGenerating ? "生成中..." : "生成纪要"}
                </Button>
              </div>
            </div>


          </div>

          <Separator className="mb-4" />

          {/* 内容显示区域 */}
          <div className="flex-1 overflow-y-auto">
            {!hasContent && !isGenerating && (
              <Card className="p-8 text-center">
                <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">智能会议纪要生成</h3>
                <p className="text-gray-500 mb-4">点击上方按钮，AI 将为您自动分析会议内容并生成结构化纪要</p>
                <div className="flex justify-center gap-4 text-sm text-gray-400">
                  <span>• 核心要点提取</span>
                  <span>• 行动项汇总</span>
                  <span>• 决策事项整理</span>
                </div>
              </Card>
            )}

            {isGenerating && (
              <Card className="p-6">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin mr-3" />
                  <span className="text-gray-600">AI 正在分析会议内容...</span>
                </div>
              </Card>
            )}

            {hasContent && (
              <Card className="p-6">
                <div className="prose prose-sm max-w-none">
                  <div
                    className="text-gray-700 leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: summary.replace(/\n/g, "<br>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                    }}
                  />
                </div>
              </Card>
            )}
          </div>

          {/* 操作按钮 */}
          {hasContent && (
            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
              <Button onClick={handleCopySummary} variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                复制内容
              </Button>
              <Button onClick={handleDownloadSummary} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                下载 MD
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
