// 会话控制器
// 作用：处理"会话"的创建、列表、删除
// 会话（ChatSession）= 一次对话，对应 AI 聊天页左侧列表里的每一项
// 前端流程：打开聊天页 → 拉我的会话列表；点"新建对话" → 创建会话；点某个会话 → 再查它的消息

import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

// 创建会话的参数校验
const createSessionSchema = z.object({
  title: z.string().max(100, '标题最多100字').optional(), // 标题可空，空了后端自动起名
  documentId: z.coerce.number().int().positive('documentId 必须是正整数').optional(), // 可选：绑定一篇知识库文档
})

// 创建会话
// 请求方式：POST /api/sessions
// 请求头：Authorization: Bearer <token>（需登录）
// 请求体：{ title?, documentId? }
// 返回：{ message, data: session }
export async function createSession(req: Request, res: Response) {
  try {
    const { title, documentId } = createSessionSchema.parse(req.body)

    // 如果传了 documentId，防越权校验这篇文档属于当前用户（findFirst 同时查 id + userId）
    if (documentId) {
      const doc = await prisma.document.findFirst({
        where: { id: documentId, userId: req.user!.id },
      })
      if (!doc) return res.status(403).json({ error: '文档不存在' })
    }

    // 创建会话，归属当前登录用户；没传标题就用默认名"新对话"
    const session = await prisma.chatSession.create({
      data: {
        title: title || '新对话',
        userId: req.user!.id,
        documentId: documentId ?? null,
      },
    })

    return res.status(201).json({ message: '会话创建成功', data: session })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '参数校验失败' })
  }
}

// 获取我的会话列表
// 请求方式：GET /api/sessions
// 请求头：Authorization: Bearer <token>（需登录）
// 返回：{ message, data: sessions }
export async function sessionList(req: Request, res: Response) {
  try {
    // 只查当前用户的会话；include 顺带带上"消息条数"和"绑定的文档"，前端列表展示更直观
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.user!.id },
      include: {
        _count: { select: { messages: true } }, // 会话里有几条消息
        document: { select: { id: true, filename: true } }, // 绑定的文档（没有就是 null）
      },
      orderBy: { updatedAt: 'desc' }, // 最近活跃的会话排前面
    })

    return res.json({ message: '获取会话列表成功', data: sessions })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '查询失败' })
  }
}

// 删除会话
// 请求方式：DELETE /api/sessions/:id
// 请求头：Authorization: Bearer <token>（需登录）
// 说明：删会话时数据库外键 onDelete: Cascade 会自动连带删掉里面的所有消息，不用手动处理
export async function deleteSession(req: Request, res: Response) {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id 必须是正整数' })
    }

    // 防越权：先确认这个会话属于当前用户，再删
    const session = await prisma.chatSession.findFirst({
      where: { id, userId: req.user!.id },
    })
    if (!session) return res.status(404).json({ error: '会话不存在' })

    await prisma.chatSession.delete({ where: { id } })
    return res.json({ message: '会话删除成功' })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '删除失败' })
  }
}
