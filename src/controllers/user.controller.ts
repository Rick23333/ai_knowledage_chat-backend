// 用户控制器
// 作用：处理用户相关的业务逻辑（注册、查询等）
// 控制器负责：接收请求 → 校验参数 → 操作数据库 → 返回结果

import { Request, Response } from 'express'
import bcrypt from 'bcryptjs' // 密码加密库
import { z } from 'zod' // 参数校验库
import { prisma } from '../lib/prisma'

// 注册接口的参数校验规则
const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  username: z.string().min(2, '用户名至少2个字符'),
  password: z.string().min(6, '密码至少6位'),
})

// 注册用户
// 请求方式：POST /api/users/register
// 请求体：{ email, username, password }
export async function register(req: Request, res: Response) {
  try {
    // 1. 校验前端传来的参数（不合法会抛错，被 catch 捕获）
    const data = registerSchema.parse(req.body)

    // 2. 检查邮箱是否已被注册
    const exists = await prisma.user.findUnique({ where: { email: data.email } })
    if (exists) {
      return res.status(400).json({ error: '该邮箱已被注册' })
    }

    // 3. 加密密码（不能存明文！bcrypt 第二个参数是加密强度，10 是默认值）
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // 4. 存入数据库
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: hashedPassword,
      },
    })

    // 5. 返回用户信息（不含密码）
    return res.status(201).json({
      message: '注册成功',
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

// 查询用户列表
// 请求方式：GET /api/users
export async function list(_req: Request, res: Response) {
  try {
    // select 指定只返回这些字段（不返回密码）
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
      },
      orderBy: { id: 'desc' }, // 按 id 倒序，最新的在前
    })
    return res.json({ users })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || '服务器错误' })
  }
}
