'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

export default function ConfigCheck() {
  const [configStatus, setConfigStatus] = useState<{
    envVars: boolean
    supabaseConnection: boolean
    storageBucket: boolean
  }>({
    envVars: false,
    supabaseConnection: false,
    storageBucket: false
  })

  useEffect(() => {
    const checkConfig = async () => {
      // 检查环境变量
      const hasEnvVars = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      
      setConfigStatus(prev => ({ ...prev, envVars: hasEnvVars }))

      if (!hasEnvVars) return

      try {
        // 检查 Supabase 连接
        const { supabase } = await import('@/lib/supabase')
        const { data, error } = await supabase.from('meetings').select('count').limit(1)
        
        if (!error) {
          setConfigStatus(prev => ({ ...prev, supabaseConnection: true }))
          
          // 检查存储桶
          const { data: bucketData, error: bucketError } = await supabase.storage
            .from('meeting-files')
            .list('', { limit: 1 })
          
          if (!bucketError) {
            setConfigStatus(prev => ({ ...prev, storageBucket: true }))
          }
        }
      } catch (error) {
        console.error('配置检查失败:', error)
      }
    }

    checkConfig()
  }, [])

  const allPassed = Object.values(configStatus).every(Boolean)

  if (allPassed) return null

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          配置检查
        </CardTitle>
        <CardDescription>
          检测到配置问题，请按以下步骤解决
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!configStatus.envVars && (
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>环境变量缺失</strong>
              <br />
              请在项目根目录创建 <code>.env.local</code> 文件，添加以下配置：
              <br />
              <code className="block mt-2 p-2 bg-gray-100 rounded">
                NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url<br />
                NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
              </code>
            </AlertDescription>
          </Alert>
        )}

        {configStatus.envVars && !configStatus.supabaseConnection && (
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Supabase 连接失败</strong>
              <br />
              请检查环境变量中的 URL 和 API Key 是否正确
            </AlertDescription>
          </Alert>
        )}

        {configStatus.supabaseConnection && !configStatus.storageBucket && (
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>存储桶配置问题</strong>
              <br />
              请在 Supabase 控制台中创建名为 <code>meeting-files</code> 的存储桶，
              并确保已执行存储权限策略脚本
            </AlertDescription>
          </Alert>
        )}

        {allPassed && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              所有配置检查通过！
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
} 