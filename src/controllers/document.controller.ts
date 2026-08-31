// 文档控制器
// 作用：处理知识库文档的创建、列表、详情、删除
// 说明：本阶段只做"文本入库"，不做文件/PDF 解析

import { Request, Response } from 'express'
import { z } from 'zod' // 参数校验
import { prisma } from '../lib/prisma'

// ============================================================
// 创建文档的参数校验规则
// sessionId 是可选参数（z.coerce...optional()）：创建文档时顺便绑到一个会话
// ============================================================
const createDocumentSchema = z.object({
  filename: z.string().min(1, '文档名不能为空').max(100, '文档名最多100字'),
  content: z.string().min(1, '文档内容不能为空'), // 文档正文（原始文本）
  sessionId: z.coerce.number().int().positive('sessionId 必须是正整数').optional(), // 可选：绑定到某个会话
})

// 创建文档
// 请求方式：POST /api/documents
// 请求头：Authorization: Bearer <token>（必须登录）
// 请求体：{ filename, content, sessionId? }
export async function createDocument(req: Request, res: Response) {
  try {
    // 1. 校验参数
    const { filename, content, sessionId } = createDocumentSchema.parse(req.body)

    // 2. 如果传了 sessionId，先防越权校验这个会话是不是当前用户的
    //    注意顺序：先校验会话、再建文档，避免"文档建好了才发现会话不是你的"（留下孤儿数据）
    let session = null
    if (sessionId) {
      session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId: req.user!.id },
      })
      if (!session) {
        return res.status(403).json({ error: '会话不存在' })
      }
    }

    // 3. 创建文档，绑定当前登录用户
    const document = await prisma.document.create({
      data: {
        filename,
        content,
        userId: req.user!.id, // 归属当前用户
      },
    })

    // 4. 可选：把这篇文档绑到会话
    //    注意 schema 的关系方向：是 ChatSession.documentId 指向 Document（一个会话可选绑一篇文档）
    //    所以"绑定" = 更新该会话的 documentId 为新文档 id
    if (session) {
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { documentId: document.id },
      })
    }

    // 5. 返回创建的文档
    return res.status(201).json({
      message: '文档创建成功',
      data: document,
    })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '参数校验失败' })
  }
}

// 获取我的文档列表
// 请求方式：GET /api/documents
// 请求头：Authorization: Bearer <token>（必须登录）
// 场景：文档列表页展示所有文档
// 注意：用 select 只取轻量字段，不返回大 content（列表页用不到全文，省流量、省内存）
export async function documentList(req: Request, res: Response) {
  try {
    // 1. 只查当前登录用户的文档
    const documents = await prisma.document.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        filename: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }, // 新的在前
    })

    // 2. 返回列表
    return res.json({
      message: '获取文档列表成功',
      data: documents,
    })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '参数校验失败' })
  }
}

// 获取单篇文档详情
// 请求方式：GET /api/documents/:id
// 请求头：Authorization: Bearer <token>（必须登录）
// 场景：点开一篇文档，加载完整内容
export async function documentDetail(req: Request, res: Response) {
  try {
    // 1. 从 URL 路径参数取 id（req.params 对应路由里的 :id）
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id 必须是正整数' })
    }

    // 2. 防越权：文档必须属于当前用户（findFirst 同时查 id + userId）
    const document = await prisma.document.findFirst({
      where: { id, userId: req.user!.id },
    })
    if (!document) {
      return res.status(404).json({ error: '文档不存在' })
    }

    // 3. 详情返回完整内容（和列表的区别就在这：这里不带 select，全字段返回）
    return res.json({
      message: '获取文档成功',
      data: document,
    })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '参数校验失败' })
  }
}

// 删除文档
// 请求方式：DELETE /api/documents/:id
// 请求头：Authorization: Bearer <token>（必须登录）
export async function deleteDocument(req: Request, res: Response) {
  try {
    // 1. 从路径参数取 id 并校验
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id 必须是正整数' })
    }

    // 2. 防越权：先确认文档属于当前用户，再删
    const document = await prisma.document.findFirst({
      where: { id, userId: req.user!.id },
    })
    if (!document) {
      return res.status(404).json({ error: '文档不存在' })
    }

    // 3. 删除文档
    //    schema 里 ChatSession 的 document 关系配了 onDelete: SetNull
    //    → 数据库会自动把关联会话的 documentId 置为 null，会话本身保留，不用我们手动处理
    await prisma.document.delete({
      where: { id },
    })

    // 4. 返回成功（删除操作一般不需要返回数据）
    return res.json({ message: '文档删除成功' })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '参数校验失败' })
  }
}

// 更新文档（编辑）
// 请求方式：PUT /api/documents/:id
// 请求头：Authorization: Bearer <token>（必须登录）
// 请求体：{ filename?, content? }（两个都可选，但至少要传一个）
export async function updateDocument(req: Request, res: Response) {
  try {
    // 1. 从路径参数取 id 并校验
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id 必须是正整数' })
    }

    // 2. 校验请求体：两个字段都可选，但至少要有一个（否则没东西可改）
    //    refine：额外规则 —— 传上来的两个字段都是 undefined 就报错
    const updateSchema = z
      .object({
        filename: z
          .string()
          .min(1, '文档名不能为空')
          .max(100, '文档名最多100字')
          .optional(),
        content: z.string().min(1, '文档内容不能为空').optional(),
      })
      .refine(d => d.filename !== undefined || d.content !== undefined, {
        message: '请至少提供要修改的字段（filename 或 content）',
      })
    const data = updateSchema.parse(req.body)

    // 3. 防越权：文档必须属于当前用户才能改
    const exists = await prisma.document.findFirst({
      where: { id, userId: req.user!.id },
    })
    if (!exists) {
      return res.status(404).json({ error: '文档不存在' })
    }

    // 4. 更新（updatedAt 字段 Prisma 会自动刷新）
    const document = await prisma.document.update({
      where: { id },
      data,
    })

    return res.json({ message: '文档更新成功', data: document })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '参数校验失败' })
  }
}

// 上传文档（把本地 .txt/.md 文本文件的内容读进库）
// 请求方式：POST /api/documents/upload
// 请求头：Authorization: Bearer <token>（必须登录）
// 请求体：multipart/form-data，文件字段名必须是 file（multer 中间件已解析好）
// 注意：文件内容存在 req.file.buffer（内存），不需要真正写进磁盘
export async function uploadDocument(req: Request, res: Response) {
  try {
    // 1. 前置的 multer 中间件（upload.single('file')）已经把文件解析到 req.file
    const file = (req as any).file
    if (!file) {
      return res.status(400).json({ error: '请选择要上传的文件' })
    }

    // 2. 只放行文本文件（.txt/.md）
    //    PDF/Word 需要额外解析库，本阶段还不支持，直接拒绝并说明原因
    if (!/\.(txt|md)$/i.test(file.originalname)) {
      return res.status(400).json({ error: '目前只支持 .txt / .md 文本文件' })
    }

    // 3. 把内存里的文件内容按 utf-8 解码成文本
    //    Windows 记事本保存的 utf-8 文件开头常带 BOM（\uFEFF 不可见字符），顺手去掉，避免污染内容
    //    限制内容长度，防止有人传超大文件撑爆内存
    let content = file.buffer.toString('utf-8').replace(/^\uFEFF/, '')
    if (content.length > 50000) {
      return res.status(400).json({ error: '文件太大，最多支持 50KB 文本内容' })
    }

    // 4. 文件名：取上传文件名的最后一段（去掉可能带的多余路径），内容为空时给个兜底名
    const filename = file.originalname.split(/[\\/]/).pop() || '未命名文档'

    // 5. 和手动创建一样，写入文档表，归属当前登录用户
    const document = await prisma.document.create({
      data: { filename, content, userId: req.user!.id },
    })

    return res.status(201).json({ message: '文档上传成功', data: document })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '上传失败' })
  }
}
