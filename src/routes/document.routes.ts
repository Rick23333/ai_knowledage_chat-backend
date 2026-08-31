// 文档路由
// 作用：把文档相关的 URL 和控制器函数对应起来
// 特点：所有文档接口都要登录，且用了 RESTful 风格（GET 查、POST 增、DELETE 删）

import { Router } from 'express'
import multer from 'multer'
import {
  createDocument,
  documentList,
  documentDetail,
  deleteDocument,
  updateDocument,
  uploadDocument,
} from '../controllers/document.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

// 文件上传中间件：内存存储（文件内容直接放内存，读文本入库够用，不写磁盘）
// limits.fileSize：限制单个文件最大 1MB，超出会被 multer 拒绝
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 },
})

// POST /api/documents → 创建文档（需登录）
router.post('/', authMiddleware, createDocument)

// POST /api/documents/upload → 上传 .txt/.md 文件（需登录）
// 注意：必须放在 PUT/DELETE /:id 之前没关系，方法不同不会冲突；
//       upload.single('file') 先解析 multipart 表单，再把解析结果交给 uploadDocument
router.post('/upload', authMiddleware, upload.single('file'), uploadDocument)

// GET /api/documents → 获取我的文档列表（需登录）
router.get('/', authMiddleware, documentList)

// GET /api/documents/:id → 获取单篇文档详情（需登录）
// :id 是路径参数，会被 Express 解析到 req.params.id
router.get('/:id', authMiddleware, documentDetail)

// PUT /api/documents/:id → 更新文档（编辑，需登录）
router.put('/:id', authMiddleware, updateDocument)

// DELETE /api/documents/:id → 删除文档（需登录）
router.delete('/:id', authMiddleware, deleteDocument)

export default router
