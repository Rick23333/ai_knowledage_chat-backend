// 会话路由
// 作用：把会话相关的 URL 和控制器函数对应起来
// 特点：会话接口都要登录，所以每个路由先过 authMiddleware 验 token

import { Router } from 'express'
import { createSession, sessionList, deleteSession } from '../controllers/session.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

// POST /api/sessions → 创建会话（需登录）
router.post('/', authMiddleware, createSession)

// GET /api/sessions → 获取我的会话列表（需登录）
router.get('/', authMiddleware, sessionList)

// DELETE /api/sessions/:id → 删除会话（需登录，且只能删自己的）
router.delete('/:id', authMiddleware, deleteSession)

export default router
