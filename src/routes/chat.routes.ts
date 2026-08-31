// 聊天路由
// 作用：AI 流式聊天的路由表
import { Router } from 'express'
import { chatStream } from '../controllers/chat.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

// POST /api/chat/stream → AI 流式聊天（需登录）
// 注意：这个接口不是一次性返回，而是建立 SSE 连接持续推送
router.post('/stream', authMiddleware, chatStream)

export default router
