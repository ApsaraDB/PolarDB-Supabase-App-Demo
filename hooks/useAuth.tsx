"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import type { User as SupabaseUser } from '@supabase/supabase-js'

export interface User {
  id: string
  email: string | null
  name: string
  avatar_url: string | null
  created_at: string
  is_anonymous: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; user?: User; error?: string }>
  anonymousLogin: () => Promise<{ success: boolean; user?: User; error?: string }>
  logout: (meetingId?: string) => Promise<void>
  updateUser: (updates: Partial<User>) => Promise<void>
  isAuthenticated: boolean
  isAnonymous: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 转换 Supabase 用户为应用用户格式
  const transformSupabaseUser = useCallback((supabaseUser: SupabaseUser): User => ({
    id: supabaseUser.id,
    email: supabaseUser.email || null,
    name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || '用户',
    avatar_url: supabaseUser.user_metadata?.avatar_url || null,
    created_at: supabaseUser.created_at,
    is_anonymous: supabaseUser.user_metadata?.is_anonymous || false,
  }), [])

  // 初始化时优先从 localStorage 恢复匿名或实名用户
  useEffect(() => {
    let isMounted = true
    
    const initializeAuth = async () => {
      try {
        // 1. 先检查 localStorage
        const savedUser = localStorage.getItem("meeting_user")
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser)
            if (isMounted) {
              setUser(parsedUser)
              setLoading(false)
            }
            return
          } catch (e) {
            console.error("Failed to parse saved user:", e)
            localStorage.removeItem("meeting_user")
          }
        }

        // 2. 没有本地用户再查 Supabase Auth
        const { data: { session } } = await supabase.auth.getSession()
        if (isMounted) {
          if (session?.user) {
            const userData = transformSupabaseUser(session.user)
            setUser(userData)
            localStorage.setItem("meeting_user", JSON.stringify(userData))
          } else {
            setUser(null)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
        if (isMounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // 3. 监听 auth 状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        
        if (event === 'SIGNED_IN' && session?.user) {
          const userData = transformSupabaseUser(session.user)
          setUser(userData)
          localStorage.setItem("meeting_user", JSON.stringify(userData))
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          localStorage.removeItem("meeting_user")
        }
        setLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [transformSupabaseUser])

  // 登录
  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (data.user) {
        const userData = transformSupabaseUser(data.user)
        setUser(userData)
        localStorage.setItem("meeting_user", JSON.stringify(userData))
        setLoading(false)
        return { success: true, user: userData }
      }
      setLoading(false)
      return { success: false, error: '登录失败' }
    } catch (error: any) {
      setLoading(false)
      return { success: false, error: error.message || '登录失败' }
    }
  }, [transformSupabaseUser])

  // 注册
  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      })
      if (error) throw error
      if (data.user) {
        const userData = transformSupabaseUser(data.user)
        setUser(userData)
        localStorage.setItem("meeting_user", JSON.stringify(userData))
        setLoading(false)
        return { success: true, user: userData }
      }
      setLoading(false)
      return { success: false, error: '注册失败' }
    } catch (error: any) {
      setLoading(false)
      return { success: false, error: error.message || '注册失败' }
    }
  }, [transformSupabaseUser])

  // 匿名登录（前端访客模式，持久化到 localStorage）
  const anonymousLogin = useCallback(async () => {
    try {
      setLoading(true)
      const name = `访客${Math.floor(Math.random() * 1000)}`
      const userData = {
        id: `anon_${Date.now()}`,
        email: null,
        name,
        avatar_url: null,
        created_at: new Date().toISOString(),
        is_anonymous: true,
      }
      setUser(userData)
      localStorage.setItem("meeting_user", JSON.stringify(userData))
      setLoading(false)
      return { success: true, user: userData }
    } catch (error: any) {
      setLoading(false)
      return { success: false, error: error.message || '匿名登录失败' }
    }
  }, [])

  // 登出
  const logout = useCallback(async (meetingId?: string) => {
    if (user && meetingId) {
      try {
        await supabase
          .from("user_presence")
          .delete()
          .eq("meeting_id", meetingId)
          .eq("user_name", user.name)
        await supabase.from("meeting_activities").insert({
          meeting_id: meetingId,
          user_name: user.name,
          activity_type: "leave",
          activity_data: {},
        })
      } catch (error) {}
    }
    await supabase.auth.signOut()
    setUser(null)
    localStorage.removeItem("meeting_user")
    if (typeof window !== 'undefined' && window.location.pathname.includes('/meeting/')) {
      window.location.href = '/'
    }
  }, [user])

  // 更新用户信息
  const updateUser = useCallback(async (updates: Partial<User>) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return
      const { data, error } = await supabase.auth.updateUser({ data: updates })
      if (error) throw error
      if (data.user) {
        const userData = transformSupabaseUser(data.user)
        setUser(userData)
        localStorage.setItem("meeting_user", JSON.stringify(userData))
      }
    } catch (error) {}
  }, [transformSupabaseUser])

  const isAuthenticated = useMemo(() => !!user, [user])
  const isAnonymous = useMemo(() => user?.is_anonymous || false, [user])

  const value = useMemo(() => ({
    user,
    loading,
    login,
    register,
    anonymousLogin,
    logout,
    updateUser,
    isAuthenticated,
    isAnonymous,
  }), [
    user,
    loading,
    login,
    register,
    anonymousLogin,
    logout,
    updateUser,
    isAuthenticated,
    isAnonymous,
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 