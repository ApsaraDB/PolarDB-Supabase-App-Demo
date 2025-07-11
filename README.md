# 智能会议记录系统

一个基于 Next.js 和 Supabase 的实时协同会议记录系统，支持多人实时编辑、任务管理、标签分类和文件上传功能。

## 功能特性

- 🚀 **实时协同编辑** - 多人同时编辑会议笔记，实时显示在线状态和打字指示
- 📝 **智能记录** - 支持富文本编辑、标签分类、截图插入等功能
- 📊 **任务管理** - 创建和分配任务，跟踪进度和截止时间
- 📁 **文件上传** - 支持拖拽上传会议资料，自动存储到 Supabase Storage
- 🔄 **活动追踪** - 实时显示用户活动，记录完整的会议动态
- 🤖 **AI 纪要总结** - 智能生成会议纪要总结

## 技术栈

- **前端**: Next.js 15, React 18, TypeScript
- **UI 组件**: shadcn/ui, Tailwind CSS
- **后端**: Supabase (PostgreSQL, Realtime, Storage)
- **状态管理**: React Hooks
- **实时通信**: Supabase Realtime

## 快速开始

### 1. 环境配置

复制 `.env.example` 为 `.env.local` 并填入您的 Supabase 配置：

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. 数据库初始化

在 Supabase SQL 编辑器中依次执行以下脚本：

1. **创建基础表结构**：
   ```sql
   -- 执行 scripts/01-create-tables.sql
   ```


### 3. Supabase Storage 配置

1. 在 Supabase 控制台中创建名为 `meeting-files` 的存储桶
2. 设置存储桶为私有（推荐）或公开
3. 确保已执行上述存储策略脚本

### 4. 安装依赖

```bash
pnpm install
```

### 5. 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 开始使用。

## 使用说明

### 创建会议

1. 在首页点击"创建新会议"
2. 输入会议标题和描述
3. 系统自动生成协同编辑链接

### 加入会议

1. 使用会议链接直接访问
2. 或点击"体验演示会议"加入预设会议

### 文件上传

1. 在会议页面右侧找到"会议资料"区域
2. 拖拽文件到上传区域或点击选择文件
3. 支持多种文件格式：图片、文档、压缩包等
4. 上传后可下载或删除文件

### 实时协作

- 多人可同时编辑会议笔记
- 实时显示在线用户和打字状态
- 支持标签管理和任务分配
- 活动动态实时更新

## 项目结构

```
meeting-notes-system-v5/
├── app/                    # Next.js App Router
│   ├── meeting/[id]/      # 会议页面
│   └── page.tsx           # 首页
├── components/            # React 组件
│   ├── ui/               # shadcn/ui 组件
│   ├── CollaborativeEditor.tsx
│   ├── FileUpload.tsx    # 文件上传组件
│   └── ...
├── hooks/                # 自定义 Hooks
├── lib/                  # 工具库
│   ├── supabase.ts      # Supabase 客户端
│   └── ...
├── scripts/              # 数据库脚本
└── styles/               # 样式文件
```

## 故障排除

### 文件上传失败

1. 确认 Supabase Storage 已正确配置
2. 检查存储桶名称是否为 `meeting-files`
3. 确认已执行存储权限策略脚本
4. 检查浏览器控制台错误信息

### 实时功能不工作

1. 确认 Supabase Realtime 已启用
2. 检查数据库表是否已添加到实时发布
3. 确认网络连接正常

### 数据库连接问题

1. 检查环境变量配置
2. 确认 Supabase 项目状态
3. 验证 API 密钥权限

## 开发指南

### 添加新功能

1. 在 `components/` 目录创建新组件
2. 在 `hooks/` 目录添加相关逻辑
3. 更新数据库结构（如需要）
4. 添加相应的类型定义

### 样式定制

项目使用 Tailwind CSS，可通过修改 `tailwind.config.ts` 进行主题定制。
