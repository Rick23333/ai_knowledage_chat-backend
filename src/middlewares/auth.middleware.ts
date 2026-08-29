// 认证中间件
// 作用：拦截请求，检查有没有带合法的 JWT token
// 带了且合法 → 把用户信息挂到 req.user 上，放行
// 没带或非法 → 返回 401 拒绝访问

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// 扩展 Express 的 Request 类型，加一个 user 字段
// 这样后续接口里就能用 req.user 拿到当前登录用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        email: string
        username: string
        role: string
      }
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. 从请求头读 token
  // 前端传 token 的格式：Authorization: Bearer xxxxx
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录，请先登录' })
  }

  // 2. 提取 token（去掉 "Bearer " 前缀，拿到后半段）
  const token = authHeader.split(' ')[1]

  try {
    // 3. 验证 token 真假（用 .env 里的 JWT_SECRET 校验签名）
    // 验证通过会返回 token 里存的数据（登录时塞进去的用户信息）
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number
      email: string
      username: string
      role: string
    }

    // 4. 把用户信息挂到 req 上，后续接口直接用 req.user
    req.user = payload

    // 5. 放行，继续往下走（到下一个中间件或路由处理函数）
    next()
  } catch {
    return res.status(401).json({ error: 'token 无效或已过期，请重新登录' })
  }
}
