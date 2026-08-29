// 商品控制器
// 作用：处理商品相关的增删改查业务逻辑

import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'

// 获取商品列表
// 请求方式：POST /api/goods/list
// 请求体：{ page, pageSize }  （可选，默认第1页、每页10条）
// 返回：{ list, total, page, pageSize }
export async function goodsList(req: Request, res: Response) {
  try {
    // 分页参数：转数字，取不到就给默认值
    const page = Number(req.body.page) || 1
    const pageSize = Number(req.body.pageSize) || 10

    // 查询总数（分页组件要知道一共有多少条）
    const total = await prisma.goods.count()

    // 按 id 倒序 + 分页取数据
    // skip: 跳过前 (page-1)*pageSize 条；take: 只取 pageSize 条
    const list = await prisma.goods.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { id: 'desc' },
    })

    return res.json({
      message: '获取商品列表成功',
      data: { list, total, page, pageSize },
    })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '参数校验失败' })
  }
}

// 商品详情
// 请求方式：POST /api/goods/detail
// 请求体：{ id }
// 返回：{ goodsDetail }
export async function goodsDetail(req: Request, res: Response) {
  try {
    const { id } = req.body;

    let goodsDetail: any = {};

    // 5. 从数据库查询商品详情
    const goods = await prisma.goods.findUnique({ where: { id } })
    if (!goods) {
      return res.status(404).json({ error: '商品不存在' })
    }

    // 5. 赋值给商品详情
    goodsDetail = goods;

    // 5. 返回商品详情
    return res.json({
      message: '获取商品详情成功',
      data: goodsDetail,
    })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '参数校验失败' })
  }
}

// 商品新增
// 请求方式：POST /api/goods/add
// 请求体：{
//   name,
//   price,
//   stock,
//   description,
//   category,
//   image,
//}
// 返回：{
//   message: '商品新增成功',
//   data: goodsDetail,
//}
export async function goodsAdd(req: Request, res: Response) {
  try {
    const { name, price, stock, description, image } = req.body;

    let goodsDetail: any = {};

    // 5. 从数据库查询商品详情
    const goods = await prisma.goods.create({
      data: {
        name,
        price,
        stock,
        description,
        image,
      },
    })
    if (!goods) {
      return res.status(404).json({ error: '商品新增失败' })
    }

    // 5. 赋值给商品详情
    goodsDetail = goods;

    // 5. 返回商品详情
    return res.json({
      message: '商品新增成功',
      data: goodsDetail,
    })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '参数校验失败' })
  }
}

// 商品更新
// 请求方式：POST /api/goods/update
// 请求体：{
//   name,
//   price,
//   stock,
//   description,
//   category,
//   image,
//}
// 返回：{
//   message: '商品更新成功',
//   data: goodsDetail,
//}
export async function goodsUpdate(req: Request, res: Response) {
  try {
    const { id, name, price, stock, description, image } = req.body;

    let goodsDetail: any = {};

    // 5. 从数据库查询商品详情
    const goods = await prisma.goods.update({
      where: { id },
      data: {
        name,
        price,
        stock,
        description,
        image,
      },
    })
    if (!goods) {
      return res.status(404).json({ error: '商品更新失败' })
    }

    // 5. 赋值给商品详情
    goodsDetail = goods;

    // 5. 返回商品详情
    return res.json({
      message: '商品更新成功',
      data: goodsDetail,
    })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '参数校验失败' })
  }
}

// 商品删除
// 请求方式：POST /api/goods/delete
// 请求体：{
//   name,
//   price,
//   stock,
//   description,
//   category,
//   image,
//}
// 返回：{
//   message: '商品删除成功',
//   data: goodsDetail,
//}
export async function goodsDelete(req: Request, res: Response) {
  try {
    const { id, name, price, stock, description, image } = req.body;

    let goodsDetail: any = {};

    // 5. 从数据库查询商品详情
    const goods = await prisma.goods.delete({
      where: { id },
    })
    if (!goods) {
      return res.status(404).json({ error: '商品删除失败' })
    }

    // 5. 赋值给商品详情
    goodsDetail = goods;

    // 5. 返回商品详情
    return res.json({
      message: '商品删除成功',
      data: goodsDetail,
    })
  } catch (err: any) {
    return res.status(400).json({ error: err.message || '参数校验失败' })
  }
}