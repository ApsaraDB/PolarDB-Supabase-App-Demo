// lib/ai-service.ts
import { supabase } from './supabase'


// 调用Supabase Edge Function的通用方法
async function callEdgeFunction(
  functionName: string,
  data: any,
  options: { 
    timeout?: number;
    retries?: number;
  } = {}
): Promise<any> {
  const { timeout = 30000, retries = 2 } = options
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data: result, error } = await supabase.functions.invoke(functionName, {
        body: data,
      })

      if (error) {
        throw new Error(`Edge Function调用失败: ${error.message}`)
      }

      return result
    } catch (error) {
      console.error(`Edge Function调用失败 (尝试 ${attempt + 1}/${retries + 1}):`, error)
      
      if (attempt === retries) {
        throw error
      }
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }
}

// 生成会议纪要
export async function generateMeetingSummary(
  meetingTitle: string,
  meetingContent: string,
  userId: string,
  functionName: string = 'tongyi'
): Promise<{ answer: string; usage?: any }> {
      try {
      // 构建提示词
      const prompt = `请根据以下会议内容生成一份结构化的会议纪要：

会议标题：${meetingTitle}

会议内容：
${meetingContent}

请按照以下格式生成会议纪要：

## 会议概述
简要总结会议的主要目的和议程。

## 主要讨论内容
1. [要点1]
2. [要点2]
3. [要点3]

## 重要决策
- [决策1]
- [决策2]

## 行动项
- [ ] [行动项1] - 负责人：[姓名] - 截止日期：[日期]
- [ ] [行动项2] - 负责人：[姓名] - 截止日期：[日期]

## 后续跟进
需要跟进的事项和下次会议安排。

请确保纪要内容准确、简洁、实用。`

      // 调用Edge Function
      const response = await callEdgeFunction(functionName, {
        prompt,
      })

      // 如果response是字符串，尝试解析为JSON
      let parsedResponse = response
      if (typeof response === 'string') {
        try {
          parsedResponse = JSON.parse(response)
        } catch (e) {
          return {
            answer: response, // 如果解析失败，直接使用原始字符串
            usage: undefined,
          }
        }
      }
    
    return {
      answer: parsedResponse.answer || parsedResponse.response || parsedResponse.content || parsedResponse.text || '生成失败',
      usage: parsedResponse.usage,
    }
  } catch (error) {
    console.error('生成会议纪要失败:', error)
    throw new Error('生成会议纪要失败，请稍后重试')
  }
}



// 获取可用的AI函数列表
export async function getAvailableAIFunctions(): Promise<string[]> {
  try {
    // 只返回通义千问
    return ['tongyi']
  } catch (error) {
    console.error('获取AI函数列表失败:', error)
    return ['tongyi']
  }
}

// 验证AI函数是否可用
export async function validateAIFunction(functionName: string): Promise<boolean> {
  try {
    // 只验证通义千问
    if (functionName !== 'tongyi') {
      return false
    }
    
    const response = await callEdgeFunction(functionName, {
      prompt: '测试连接',
      type: 'test',
    })
    

    return !!response
  } catch (error) {
    console.error(`AI函数 ${functionName} 验证失败:`, error)
    return false
  }
}

 