// 管理员控制器
// 作用：管理员专属的管理接口（用户/会话/文档的全量查看）
// 注意：本阶段不做"网页改角色"，管理员账号靠手动改数据库 role 字段（User 表 role = ADMIN）

import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'

// 获取全部用户列表
// 请求方式：GET /api/admin/users
// 请求头：Authorization: Bearer <token>（需登录 + 管理员）
export async function getAllUsers(req: Request, res: Response) {
  try {
    // 关键：用 select 只挑要返回的字段
    // 不 select password，密码哈希就不会被带出来（漏密码是最常见的管理接口事故）
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
      orderBy: { id: 'asc' },
    })

    return res.json({ message: '获取用户列表成功', data: users })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '查询失败' })
  }
}

// 获取全部会话列表（全局，不分用户）
// 请求方式：GET /api/admin/sessions
// 请求头：Authorization: Bearer <token>（需登录 + 管理员）
export async function getAllSessions(req: Request, res: Response) {
  try {
    // include：把关联的数据一起带出来（谁创建的 + 绑定了哪篇文档），管理员看着直观
    const sessions = await prisma.chatSession.findMany({
      include: {
        user: { select: { id: true, username: true } }, // 会话所属用户
        document: { select: { id: true, filename: true } }, // 绑定的文档
      },
      orderBy: { updatedAt: 'desc' }, // 最近活跃的在前
    })

    return res.json({ message: '获取会话列表成功', data: sessions })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '查询失败' })
  }
}

// 获取全部文档列表
// 请求方式：GET /api/admin/documents
// 请求头：Authorization: Bearer <token>（需登录 + 管理员）
export async function getAllDocuments(req: Request, res: Response) {
  try {
    // 列表轻量化：不返回大 content，带上所属用户
    const documents = await prisma.document.findMany({
      select: {
        id: true,
        filename: true,
        userId: true,
        createdAt: true,
        user: { select: { id: true, username: true } }, // 嵌套查询：文档所属用户
      },
      orderBy: { createdAt: 'desc' },
    })

    return res.json({ message: '获取文档列表成功', data: documents })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '查询失败' })
  }
}
