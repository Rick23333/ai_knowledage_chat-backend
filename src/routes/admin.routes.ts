// 管理员路由
// 作用：管理员专属接口的路由表
// 关键点：一个请求可以串多个中间件 —— 先验登录(authMiddleware)，再验角色(adminMiddleware)

import { Router } from 'express'
import { getAllUsers, getAllSessions, getAllDocuments } from '../controllers/admin.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import { adminMiddleware } from '../middlewares/admin.middleware'

const router = Router()

// GET /api/admin/users → 全部用户列表（需登录 + 管理员）
// 中间件从左到右执行：先验登录 → 再验管理员 → 通过才进接口函数
router.get('/users', authMiddleware, adminMiddleware, getAllUsers)

// GET /api/admin/sessions → 全部会话列表（需登录 + 管理员）
router.get('/sessions', authMiddleware, adminMiddleware, getAllSessions)

// GET /api/admin/documents → 全部文档列表（需登录 + 管理员）
router.get('/documents', authMiddleware, adminMiddleware, getAllDocuments)

export default router
