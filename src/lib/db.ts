import { getRequestContext } from "@cloudflare/next-on-pages";

export function getD1Database() {
  if (process.env.NEXT_RUNTIME === "edge") {
    try {
      const context = getRequestContext();
      return context.env.DB;
    } catch (e) {
      console.warn("Failed to get D1 database:", e);
      return null;
    }
  }
  return null;
}

// 初始化数据库表（需要在部署后手动执行或通过 migrations）
export async function initializeDatabase() {
  const db = getD1Database();
  if (!db) return;

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      google_id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}