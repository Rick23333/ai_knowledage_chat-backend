// 认证路由
// 作用：把认证相关 URL 和控制器函数对应起来

import { Router } from 'express'
import { login, me } from '../controllers/auth.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

// POST /api/auth/login → 登录（无需登录即可访问）
router.post('/login', login)

// GET /api/auth/me → 获取当前用户信息（需登录）
// 第二个参数 authMiddleware 是中间件，请求会先经过它验证 token，通过后才到 me
router.get('/me', authMiddleware, me)

export default router
