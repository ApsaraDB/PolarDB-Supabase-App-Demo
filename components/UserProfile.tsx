"use client"

import { useState, useEffect, useCallback, memo } from "react"
import { User, LogOut, Settings, Crown, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AuthModal } from "./AuthModal"
import { useAuth } from "@/hooks/useAuth"

interface UserProfileProps {
  meetingId?: string
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

function UserProfileComponent({ meetingId, onSuccess, onError }: UserProfileProps) {
  const { user, logout, login, isAuthenticated, isAnonymous, loading } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  
  const handleLogout = useCallback(async () => {
    await logout(meetingId)
  }, [logout, meetingId])

  const handleAuthSuccess = useCallback((userData: any) => {
    setAuthModalOpen(false)

    if (userData.is_anonymous) {
      onSuccess?.(`欢迎 ${userData.name}，您已匿名加入会议`)
    } else {
      onSuccess?.(`欢迎回来，${userData.name}！`)
    }
  }, [onSuccess])

  const handleAuthError = useCallback((message: string) => {
    onError?.(message)
  }, [onError])

  const handleOpenAuthModal = useCallback(() => {
    setAuthModalOpen(true)
  }, [])

  const handleCloseAuthModal = useCallback((open: boolean) => {
    setAuthModalOpen(open)
  }, [])

  const handleUpgradeToRealUser = useCallback(() => {
    setAuthModalOpen(true)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <>
      {!isAuthenticated ? (
        <Button key="login-button" onClick={handleOpenAuthModal} variant="outline" size="sm">
          <User className="h-4 w-4 mr-2" />
          登录 / 注册
        </Button>
      ) : (
        <DropdownMenu key={`user-menu-${user?.id || 'anonymous'}`}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-auto p-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className={isAnonymous ? "bg-gray-400" : "bg-blue-500"}>
                  {isAnonymous ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <span className="text-white text-sm font-medium">{user?.name.charAt(0).toUpperCase()}</span>
                  )}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{user?.name}</span>
                  {isAnonymous ? (
                    <Badge variant="secondary" className="text-xs bg-gray-100">
                      匿名
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                      <Crown className="h-3 w-3 mr-1" />
                      实名
                    </Badge>
                  )}
                </div>
                {!isAnonymous && user?.email && <span className="text-xs text-gray-500">{user.email}</span>}
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={isAnonymous ? "bg-gray-400" : "bg-blue-500"}>
                    {isAnonymous ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <span className="text-white text-sm font-medium">{user?.name.charAt(0).toUpperCase()}</span>
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user?.name}</span>
                  {!isAnonymous && user?.email && <span className="text-xs text-gray-500">{user.email}</span>}
                </div>
              </div>
            </div>

            <DropdownMenuSeparator />

            {isAnonymous && (
              <>
                <DropdownMenuItem onClick={handleUpgradeToRealUser}>
                  <UserCheck className="h-4 w-4 mr-2" />
                  升级为实名用户
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {!isAnonymous && (
              <>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  个人设置
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <AuthModal
        open={authModalOpen}
        onOpenChange={handleCloseAuthModal}
        onSuccess={handleAuthSuccess}
        onError={handleAuthError}
      />
    </>
  )
}


export const UserProfile = memo(UserProfileComponent, (prevProps, nextProps) => {
  // 自定义比较函数，只有当关键 props 变化时才重新渲染
  return (
    prevProps.meetingId === nextProps.meetingId &&
    prevProps.onSuccess === nextProps.onSuccess &&
    prevProps.onError === nextProps.onError
  )
})
