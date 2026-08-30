// 应用入口文件
// 作用：创建 Express 应用，注册中间件和路由，启动 HTTP 服务器
// 这是后端的"大门"，所有请求都从这里进来

import express, { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import 'dotenv/config'  // 加载 .env 文件里的环境变量到 process.env
import userRoutes from './routes/user.routes'  // 用户相关路由
import authRoutes from './routes/auth.routes'  // 认证相关路由（登录/JWT）
import goodsRoutes from './routes/goods.routes'  // 商品相关路由
import messageRoutes from './routes/message.routes'  // 聊天消息相关路由
import documentRoutes from './routes/document.routes'  // 文档相关路由
import adminRoutes from './routes/admin.routes'  // 管理员相关路由

// 创建 Express 应用实例
const app = express()

// ========== 注册中间件 ==========
// 中间件：每个请求进来都会先经过这里，做统一处理
app.use(helmet())         // 加安全响应头，防范常见 Web 攻击
app.use(cors())           // 允许前端跨域访问后端（否则浏览器会拦截）
app.use(express.json())   // 解析请求体里的 JSON，放到 req.body

// ========== 请求日志（开发期调试用） ==========
// 每个请求进来都会在终端打印方法、地址、请求体，方便排查问题
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`)
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('  请求体:', JSON.stringify(req.body))
  }
  next()
})

// ========== 路由 ==========
// 健康检查接口：前端/运维用来确认后端是否在运行
// 访问方式：浏览器打开 http://localhost:3000/health
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: '后端服务运行正常',
    timestamp: new Date().toISOString(),
  })
})

// ========== 业务路由 ==========
// 所有 /api/users 开头的请求，交给用户路由处理
app.use('/api/users', userRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/goods', goodsRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/admin', adminRoutes)

// ========== 启动服务器 ==========
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log('====================================')
  console.log(`后端服务已启动：http://localhost:${PORT}`)
  console.log(`健康检查接口：http://localhost:${PORT}/health`)
  console.log('====================================')
})
