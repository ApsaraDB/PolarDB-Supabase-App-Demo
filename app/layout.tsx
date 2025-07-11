import type { ReactNode } from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/hooks/useAuth"

export const metadata: Metadata = {
  title: "智能会议记录系统",
  description: "实时协同笔记与任务追踪系统",
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
