// 管理员中间件
// 作用：检查当前登录用户是不是管理员（ADMIN）
// 注意：必须放在 authMiddleware 后面使用（先确认已登录、拿到 req.user，才能查角色）

import { Request, Response, NextFunction } from 'express'

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. 如果没登录（理论上走不到这，因为前面一定有 authMiddleware），兜底处理
  if (!req.user) {
    return res.status(401).json({ error: '未登录，请先登录' })
  }

  // 2. 检查角色：不是管理员就拒绝（403 表示"你登录了，但没有权限"）
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: '没有管理员权限' })
  }

  // 3. 是管理员，放行到下一个中间件或接口函数
  next()
}
