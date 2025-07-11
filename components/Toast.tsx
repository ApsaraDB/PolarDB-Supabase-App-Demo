"use client"

import { useState, useEffect } from "react"
import { CheckCircle, AlertCircle, Info, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export type ToastType = "success" | "error" | "info" | "warning"

export interface ToastProps {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
  onClose: (id: string) => void
}

export function Toast({ id, type, title, description, duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // 入场动画
    const timer = setTimeout(() => setIsVisible(true), 50)

    // 自动关闭
    const autoCloseTimer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => {
      clearTimeout(timer)
      clearTimeout(autoCloseTimer)
    }
  }, [duration])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onClose(id)
    }, 300)
  }

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getStyles = () => {
    const baseStyles = "border-l-4"
    switch (type) {
      case "success":
        return `${baseStyles} border-green-500 bg-green-50/90 backdrop-blur-sm`
      case "error":
        return `${baseStyles} border-red-500 bg-red-50/90 backdrop-blur-sm`
      case "warning":
        return `${baseStyles} border-yellow-500 bg-yellow-50/90 backdrop-blur-sm`
      default:
        return `${baseStyles} border-blue-500 bg-blue-50/90 backdrop-blur-sm`
    }
  }

  return (
    <Card
      className={`
        ${getStyles()}
        p-4 shadow-lg transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
        ${isLeaving ? "scale-95" : "scale-100"}
        min-w-[320px] max-w-[480px]
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">{title}</h4>
          {description && <p className="text-sm text-gray-600 leading-relaxed">{description}</p>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="flex-shrink-0 h-6 w-6 p-0 hover:bg-gray-200/50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}

// Toast 容器组件
export function ToastContainer({ toasts }: { toasts: ToastProps[] }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  )
}
