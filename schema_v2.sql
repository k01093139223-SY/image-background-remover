-- 更新用户表，添加配额相关字段
ALTER TABLE users ADD COLUMN daily_quota INTEGER DEFAULT 10;
ALTER TABLE users ADD COLUMN used_today INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN quota_reset_date DATE;