// 消息路由
// 作用：把消息相关的 URL 和控制器函数对应起来
// 特点：所有消息接口都要登录，所以每个路由都先经过 authMiddleware 验 token

import { Router } from 'express'
import { addMessage, messageList } from '../controllers/message.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

// POST /api/messages → 新增消息（需登录）
// 第二个参数 authMiddleware 是中间件：请求先验 token，通过后才执行 addMessage
router.post('/', authMiddleware, addMessage)

// GET /api/messages?sessionId=1 → 获取某个会话的全部消息（需登录）
router.get('/', authMiddleware, messageList)

export default router
