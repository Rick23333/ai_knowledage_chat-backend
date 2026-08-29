// 用户路由
// 作用：把 URL 路径和控制器函数对应起来
// 路由负责：定义"哪个路径对应哪个处理函数"，不写具体业务逻辑

import { Router } from 'express'
import { register, list } from '../controllers/user.controller'

const router = Router()

// POST /api/users/register → 注册用户
router.post('/register', register)

// GET /api/users → 查询用户列表
router.get('/', list)

export default router
