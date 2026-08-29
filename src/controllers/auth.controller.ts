// 认证控制器
// 作用：处理登录、获取当前用户信息

import { Request, Response } from 'express'
import bcrypt from 'bcryptjs' // 比对密码
import jwt from 'jsonwebtoken' // 生成 token
import { z } from 'zod' // 参数校验
import { prisma } from '../lib/prisma'

// 登录参数校验规则
const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
})

// 登录
// 请求方式：POST /api/auth/login
// 请求体：{ email, password }
// 返回：{ token, user }
export async function login(req: Request, res: Response) {
  try {
    // 1. 校验参数
    const { email, password } = loginSchema.parse(req.body)

    // 2. 按邮箱查用户
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // 出于安全，邮箱和密码错误都返回同样的提示，避免暴露邮箱是否存在
      return res.status(401).json({ error: '邮箱或密码错误' })
    }

    // 3. 校验密码：bcrypt.compare(明文, 加密后的) 返回 true/false
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) {
      return res.status(401).json({ error: '邮箱或密码错误' })
    }

    // 4. 生成 JWT token
    // 第一个参数：要存进 token 的数据（用户信息）
    // 第二个参数：密钥（.env 里的 JWT_SECRET，用来签名防伪造）
    // 第三个参数：有效期（7 天后过期，需重新登录）
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    // 5. 返回 token 和用户信息（前端拿到 token 存起来，之后请求带上）
    return res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '参数校验失败' })
  }
}

// 获取当前登录用户信息
// 请求方式：GET /api/auth/me
// 前提：这个路由前面挂了 authMiddleware，请求必须带合法 token 才能进来
export async function me(req: Request, res: Response) {
  // authMiddleware 已经把用户信息挂到 req.user 上了，直接返回
  return res.json({ user: req.user })
}
