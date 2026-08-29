// Prisma 配置文件（Prisma 7 新增）
// 作用：给 Prisma CLI（migrate/generate 等命令）提供数据库连接信息
import "dotenv/config"; // 加载 .env 里的环境变量
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Prisma 7 里，连接 URL 从 schema.prisma 移到这里
  // env() 是类型安全的环境变量读取函数
  datasource: {
    url: env("DATABASE_URL"),
  },
});
