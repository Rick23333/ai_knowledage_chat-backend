// Prisma 客户端单例
// 作用：创建一个全局唯一的 Prisma 实例，整个应用都用它来查数据库
// 为什么要单例：开发时热重载会反复重启，如果不限制，会创建无数个数据库连接，把 MySQL 撑爆

import 'dotenv/config' // 加载 .env 环境变量
import { PrismaClient } from '../../generated/prisma/client' // client.ts 是生成代码的主入口
import { PrismaMariaDb } from '@prisma/adapter-mariadb' // MySQL 驱动适配器

// 创建 driver adapter：负责真正连接 MySQL
const adapter = new PrismaMariaDb({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  connectionLimit: 5, // 最大连接数
  user: process.env.MYSQL_USER!,
  password: process.env.MYSQL_PASSWORD!,
  database: process.env.MYSQL_DATABASE!,
})

// 单例模式：把 prisma 挂到 globalThis 上，避免热重载时重复创建
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
