// 文档路由
// 作用：把文档相关的 URL 和控制器函数对应起来
// 特点：所有文档接口都要登录，且用了 RESTful 风格（GET 查、POST 增、DELETE 删）

import { Router } from 'express'
import {
  createDocument,
  documentList,
  documentDetail,
  deleteDocument,
} from '../controllers/document.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

// POST /api/documents → 创建文档（需登录）
router.post('/', authMiddleware, createDocument)

// GET /api/documents → 获取我的文档列表（需登录）
router.get('/', authMiddleware, documentList)

// GET /api/documents/:id → 获取单篇文档详情（需登录）
// :id 是路径参数，会被 Express 解析到 req.params.id
router.get('/:id', authMiddleware, documentDetail)

// DELETE /api/documents/:id → 删除文档（需登录）
router.delete('/:id', authMiddleware, deleteDocument)

export default router
