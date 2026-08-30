// 消息控制器
// 作用：处理聊天消息的新增、查询
// 注意：本阶段只做消息"入库"和"查询"，不调用大模型（AI 流式接口在下一阶段做）

import { Request, Response } from 'express'
import { z } from 'zod' // 参数校验库
import { prisma } from '../lib/prisma'

// ============================================================
// 新增消息的参数校验规则
// z.coerce.number()：把前端传来的值转成数字（哪怕传的是 "1" 字符串）
// z.enum([...])：限定只能是这几个值（和数据库的 ENUM 枚举列对应）
// ============================================================
const addMessageSchema = z.object({
  sessionId: z.coerce.number().int().positive('sessionId 必须是正整数'),
  role: z.enum(['user', 'assistant'], '角色只能是 user 或 assistant'),
  content: z.string().min(1, '消息内容不能为空').max(2000, '消息内容最多2000字'),
})

// 新增消息
// 请求方式：POST /api/messages
// 请求头：Authorization: Bearer <token>（必须登录，路由挂了 authMiddleware）
// 请求体：{ sessionId, role, content }
// 场景：前端发送一条聊天消息时调用（用户说的或 AI 回复的，都走这个接口入库）
export async function addMessage(req: Request, res: Response) {
  try {
    // 1. 校验参数（不合法会抛错，被下面的 catch 捕获）
    const { sessionId, role, content } = addMessageSchema.parse(req.body)

    // 2. 防越权：确认这个会话存在，且属于当前登录用户
    // req.user 是 authMiddleware 验证 token 后挂上的当前登录用户信息
    // 用 findFirst 一次性校验"存在 + 归属"，查不到 = 会话不存在 或 不是你的
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: req.user!.id },
    })
    if (!session) {
      // 统一返回"会话不存在"，不区分"没有"和"不是你的"，避免泄露别人的会话信息
      return res.status(403).json({ error: '会话不存在' })
    }

    // 3. 写入消息表（sessionId/role/content 都是校验过的）
    const message = await prisma.chatMessage.create({
      data: { sessionId, role, content },
    })

    // 4. 返回刚创建的消息（前端拿到后可直接追加到聊天列表，不用再查一次）
    return res.status(201).json({
      message: '消息发送成功',
      data: message,
    })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '参数校验失败' })
  }
}

// 获取某个会话的全部消息
// 请求方式：GET /api/messages?sessionId=1
// 请求头：Authorization: Bearer <token>（必须登录）
// 场景：前端点开某个对话时，加载历史聊天记录
export async function messageList(req: Request, res: Response) {
  try {
    // 1. 从 URL 查询参数里取 sessionId（?sessionId=1 这样的问号参数）
    // req.query 里拿到的都是字符串，要转成数字
    const sessionId = Number(req.query.sessionId)
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({ error: 'sessionId 必须是正整数' })
    }

    // 2. 防越权：先确认这个会话属于当前登录用户（同上）
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: req.user!.id },
    })
    if (!session) {
      return res.status(403).json({ error: '会话不存在' })
    }

    // 3. 拉取该会话全部消息，按创建时间升序（老的在上、新的在下，像聊天记录）
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    })

    // 4. 返回消息列表
    return res.json({
      message: '获取消息成功',
      data: messages,
    })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '参数校验失败' })
  }
}
