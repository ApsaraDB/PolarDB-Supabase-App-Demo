"use client"

import { useState } from "react"
import { User, Mail, Lock, UserPlus, LogIn, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/hooks/useAuth"

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (user: any) => void
  onError: (message: string) => void
}

export function AuthModal({ open, onOpenChange, onSuccess, onError }: AuthModalProps) {
  const { login, register, anonymousLogin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // 登录表单
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  // 注册表单
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerName, setRegisterName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // 处理登录
  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      onError("请填写邮箱和密码")
      return
    }

    setLoading(true)
    try {
      const result = await login(loginEmail, loginPassword)
      
      if (result.success) {
        onSuccess(result.user)
        onOpenChange(false)
        // 清空表单
        setLoginEmail("")
        setLoginPassword("")
      } else {
        onError(result.error || "登录失败")
      }
    } catch (error) {
      onError("登录失败，请检查邮箱和密码")
    } finally {
      setLoading(false)
    }
  }

  // 处理注册
  const handleRegister = async () => {
    if (!registerEmail.trim() || !registerPassword.trim() || !registerName.trim()) {
      onError("请填写所有必填字段")
      return
    }

    if (registerPassword !== confirmPassword) {
      onError("两次输入的密码不一致")
      return
    }

    if (registerPassword.length < 6) {
      onError("密码长度至少6位")
      return
    }

    setLoading(true)
    try {
      const result = await register(registerEmail, registerPassword, registerName)
      
      if (result.success) {
        onSuccess(result.user)
        onOpenChange(false)
        // 清空表单
        setRegisterEmail("")
        setRegisterPassword("")
        setRegisterName("")
        setConfirmPassword("")
      } else {
        onError(result.error || "注册失败")
      }
    } catch (error) {
      onError("注册失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  // 匿名登录
  const handleAnonymousLogin = async () => {
    setLoading(true)
    try {
      const result = await anonymousLogin()
      
      if (result.success) {
        onSuccess(result.user)
        onOpenChange(false)
      } else {
        onError(result.error || "匿名登录失败")
      }
    } catch (error) {
      onError("匿名登录失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <User className="h-5 w-5" />
            用户登录
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>

          {/* 登录表单 */}
          <TabsContent value="login" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="login-email">邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="输入邮箱地址"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="login-password">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="输入密码"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button onClick={handleLogin} disabled={loading} className="w-full">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    登录中...
                  </div>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    登录
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* 注册表单 */}
          <TabsContent value="register" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="register-name">姓名</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="输入真实姓名"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="register-email">邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="输入邮箱地址"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="register-password">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="设置密码（至少6位）"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-password">确认密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="再次输入密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button onClick={handleRegister} disabled={loading} className="w-full">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    注册中...
                  </div>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    注册
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* 分隔线 */}
        <div className="relative">
          <Separator />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-white px-2 text-sm text-gray-500">或</span>
          </div>
        </div>

        {/* 匿名登录 */}
        <Button onClick={handleAnonymousLogin} disabled={loading} variant="outline" className="w-full bg-transparent">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              加入中...
            </div>
          ) : (
            <>
              <User className="h-4 w-4 mr-2" />
              匿名加入会议
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">匿名用户可以参与会议，但无法保存个人设置</p>
      </DialogContent>
    </Dialog>
  )
}
