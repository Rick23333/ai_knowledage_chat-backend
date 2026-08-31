// 聊天控制器
// 作用：AI 流式聊天 —— 先存用户提问，再调大模型流式返回，结束后存 AI 完整回复
// 核心概念：SSE（Server-Sent Events，服务器推送事件）
//   —— 普通接口一次只返回一个结果；SSE 让后端可以"持续"向前端推送多个数据片段

import { Request, Response } from 'express'
import OpenAI from 'openai' // 大模型官方 SDK（兼容所有 OpenAI 协议厂商）
import { z } from 'zod'
import { prisma } from '../lib/prisma'

// ========== 大模型配置（从 .env 读取） ==========
const AI_BASE_URL = process.env.AI_BASE_URL || 'https://api.deepseek.com'
const AI_API_KEY = process.env.AI_API_KEY || ''
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat'

// 是否启用"模拟流式回答"（演示模式）
//  .env 里 AI_MOCK=true  → 不调真实大模型，把一段预设文字逐字推给前端，演示流式效果
//  .env 里 AI_MOCK=false → 调真实大模型（需填好 AI_API_KEY）
// 默认 true：用户还没配 key 也能开箱即用演示
const AI_MOCK = (process.env.AI_MOCK || 'true').toLowerCase() === 'true'

// 工具：让当前协程暂停 ms 毫秒（模拟"逐字输出"的节奏用）
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// 创建大模型客户端（把 baseURL 换成任意 OpenAI 兼容厂商的地址即可）
const client = new OpenAI({
  baseURL: AI_BASE_URL,
  apiKey: AI_API_KEY,
})

// 流式聊天参数校验
const chatSchema = z.object({
  sessionId: z.coerce.number().int().positive('sessionId 必须是正整数'),
  content: z.string().min(1, '提问内容不能为空').max(2000, '提问内容最多2000字'),
})

// AI 流式聊天
// 请求方式：POST /api/chat/stream
// 请求头：Authorization: Bearer <token>（需登录）
// 请求体：{ sessionId, content }
// 响应：SSE 流（Content-Type: text/event-stream），逐段推送 { type: 'delta' | 'done' | 'error' }
export async function chatStream(req: Request, res: Response) {
  // streaming 标记：是否已进入"流式"阶段
  // 进入流式后就不能再用 res.json 了，出错只能发 SSE error 事件
  let streaming = false

  try {
    // 1. 校验参数
    const { sessionId, content } = chatSchema.parse(req.body)

    // 2. 防越权：会话必须属于当前登录用户
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: req.user!.id },
    })
    if (!session) {
      return res.status(403).json({ error: '会话不存在' })
    }

    // 3. 先把用户提问存库（即使后面 AI 调用失败，用户的话也留下了）
    await prisma.chatMessage.create({
      data: { sessionId, role: 'user', content },
    })

    // 4. 拉取该会话全部历史消息，组装成大模型需要的对话上下文
    //    角色 user/assistant 正好和 OpenAI 协议的角色一致，直接映射
    const history = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    })
    const messages: any[] = [
      { role: 'system', content: '你是一个智能助手，请用中文简洁准确地回答问题。' },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ]

    // 5. 设置 SSE 响应头（关键）
    //    text/event-stream 告诉前端"我要持续推送数据"，不能提前断开
    //    注意：必须带 charset=utf-8！
    //    不带 charset 时 Node 会默认按 latin1 编码字符串，遇到中文（码点>255）就会抛
    //    "Cannot convert argument to a ByteString..."，导致 SSE 流中断
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache') // 禁止缓存（数据是实时的）
    res.setHeader('Connection', 'keep-alive') // 保持连接不断
    res.flushHeaders() // 立刻把响应头发给前端（让前端马上知道"开始接收了"）

    // 响应头已发出，进入流式阶段 → 之后的错误都走 SSE 事件
    streaming = true

    // 6. 二选一：模拟流式（演示） 或 调真实大模型
    let fullReply = ''
    if (AI_MOCK) {
      // ===== 模拟模式（演示用，不开真实模型） =====
      // .env 里 AI_MOCK=true 时走这里：把一段预设文字逐字推给前端，展示流式回答效果。
      // 文案面向普通用户：要如实告知"token 不足、当前为模拟回答"，但不暴露具体配置细节
      // （不出现 backend/.env、AI_MOCK、API Key 等内部信息）。
      // 内容用 Markdown 写（前端会渲染成标题/列表/表格），并在末尾放一个 ```echarts {json} ```
      // 代码块，前端检测到后会把这段数据渲染成 ECharts 图表。
      const mockText = [
        '你好！目前大模型接口的 token 额度不足，暂时用模拟回答为你演示完整的流式回复效果。',
        '',
        '## 我可以帮你做什么？',
        '',
        '- 整理和总结文档内容，快速提取重点',
        '- 根据文档内容解答你的疑问',
        '- 支持多轮对话，持续记住上下文',
        '',
        '## 功能状态',
        '',
        '| 功能 | 状态 |',
        '| --- | --- |',
        '| 流式回答 | 已可用 |',
        '| 文档问答 | 已可用 |',
        '| 多轮对话 | 已可用 |',
        '',
        '## 数据可视化示例',
        '',
        '下面是本周文档访问量的柱状图：',
        '',
        '```echarts',
        '{',
        '  "title": { "text": "本周文档访问量", "left": "center" },',
        '  "tooltip": { "trigger": "axis" },',
        '  "xAxis": { "type": "category", "data": ["周一", "周二", "周三", "周四", "周五"] },',
        '  "yAxis": { "type": "value" },',
        '  "series": [',
        '    { "name": "访问量", "type": "bar", "data": [120, 200, 150, 80, 170], "itemStyle": { "color": "#409EFF" } }',
        '  ]',
        '}',
        '```',
        '',
        '你可以继续提问，我会结合图表给出更直观的答复。',
      ].join('\n')
      // Array.from：按"字符"切分（中文字符也能正确逐字输出，不能直接 for...of 字符串索引）
      for (const ch of Array.from(mockText)) {
        fullReply += ch // 边推送边累积，最后用于存库
        // SSE 格式：data: JSON + 两个换行（\n\n 是每条事件的结束标志）
        res.write(`data: ${JSON.stringify({ type: 'delta', content: ch })}\n\n`)
        await sleep(30) // 每 30ms 吐一个字，模拟真实模型的"逐字返回"节奏
      }
    } else {
      // ===== 真实模式（调大模型） =====
      // 校验 AI 配置：key 未配置（空 或 仍是含中文的占位符）时给用户一个友好提示，
      // 真实原因只打印到后端日志，方便自己排查，不暴露给前端用户。
      if (!AI_API_KEY || /[^\x00-\x7F]/.test(AI_API_KEY)) {
        console.error(
          '[chat-stream] AI_API_KEY 未配置或包含非 ASCII 字符，无法调用大模型（请在 backend/.env 检查配置）'
        )
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            error: 'AI 服务暂时不可用，请稍后再试',
          })}\n\n`
        )
        res.end()
        return
      }

      // 调大模型，stream: true 让 AI 一个词一个词地吐出来
      const stream = await client.chat.completions.create({
        model: AI_MODEL,
        messages,
        stream: true,
      })

      // 实时把 AI 的每个片段转发给前端
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        if (!delta) continue // 跳过空片段
        fullReply += delta // 边转发边累积，最后用于存库
        res.write(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`)
      }
    }

    // 8. AI 完整回复结束 → 把完整 assistant 消息存库
    await prisma.chatMessage.create({
      data: { sessionId, role: 'assistant', content: fullReply },
    })

    // 9. 通知前端流结束
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()
  } catch (err: any) {
    // 临时调试：打印完整堆栈定位 ByteString 错误来源
    console.error('[chat-stream 错误堆栈]', err?.stack || err)
    // 流式阶段的错误 → 发 SSE error 事件（前端靠 type 区分处理）
    if (streaming) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message || 'AI 调用失败' })}\n\n`)
      res.end()
    } else {
      // 还没开始流式（参数/权限/入库阶段出错）→ 正常返回 JSON 错误
      res.status(400).json({ error: err.message || '参数校验失败' })
    }
  }
}
