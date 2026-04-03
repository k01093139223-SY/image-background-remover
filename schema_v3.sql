-- 用户表 - 完整版
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- 积分/配额系统
  credits INTEGER DEFAULT 3,  -- 注册送3积分，每次使用扣1积分
  total_credits_spent INTEGER DEFAULT 0,  -- 累计消耗积分
  
  -- 订阅系统
  subscription_type TEXT DEFAULT 'free',  -- free, monthly, yearly
  subscription_expires DATE,  -- 订阅过期时间
  subscription_status TEXT DEFAULT 'inactive',  -- active, inactive, cancelled
  
  -- 每日使用限制
  daily_usage INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 10,  -- 每日免费次数
  last_usage_date DATE
);

-- 使用记录
CREATE TABLE IF NOT EXISTS usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  session_id TEXT,  -- 未登录用户的匿名session
  operation TEXT NOT NULL,  -- 'remove_bg', etc.
  credits_used INTEGER DEFAULT 1,
  cost_usd REAL,  -- API成本
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_usage_log_user_id ON usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_session ON usage_log(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_created_at ON usage_log(created_at);