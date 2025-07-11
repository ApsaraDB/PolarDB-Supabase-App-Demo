"use client"

import { useState, useCallback } from "react"
import type { ToastProps, ToastType } from "@/components/Toast"

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const addToast = useCallback((type: ToastType, title: string, description?: string, duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastProps = {
      id,
      type,
      title,
      description,
      duration,
      onClose: (toastId) => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId))
      },
    }

    setToasts((prev) => [...prev, newToast])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = useCallback(
    (title: string, description?: string, duration?: number) => {
      return addToast("success", title, description, duration)
    },
    [addToast],
  )

  const error = useCallback(
    (title: string, description?: string, duration?: number) => {
      return addToast("error", title, description, duration)
    },
    [addToast],
  )

  const info = useCallback(
    (title: string, description?: string, duration?: number) => {
      return addToast("info", title, description, duration)
    },
    [addToast],
  )

  const warning = useCallback(
    (title: string, description?: string, duration?: number) => {
      return addToast("warning", title, description, duration)
    },
    [addToast],
  )

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
  }
}
