// 商品路由
// 作用：把 URL 和控制器函数对应起来
// 注意：app.ts 已挂载 /api/goods 前缀，这里只写后面的部分

import { Router } from 'express'
import { goodsList, goodsDetail, goodsAdd, goodsUpdate, goodsDelete } from '../controllers/goods.controller'

const router = Router()

// POST /api/goods/list → 获取商品列表（无需登录即可访问）
router.post('/list', goodsList)
router.post('/detail', goodsDetail)
router.post('/add', goodsAdd)
router.post('/update', goodsUpdate)
router.post('/delete', goodsDelete)

export default router
