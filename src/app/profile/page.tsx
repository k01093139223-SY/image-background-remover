"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  email: string;
  name: string;
  avatar_url: string;
  created_at: string;
  last_login: string;
}

interface Stats {
  total_usage: number;
  daily_quota: number;
  used_today: number;
  remaining: number;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    document.cookie = "user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Image BG Remover</h1>
            <p className="text-sm text-gray-500">AI-powered background removal</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            ← 返回
          </button>
          <button
            onClick={() => router.push("/pricing")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            升级套餐
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 用户信息卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">👤 个人资料</h2>
          <div className="flex items-center gap-4">
            {user?.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-20 h-20 rounded-full"
              />
            )}
            <div>
              <p className="text-xl font-medium text-gray-900">{user?.name || "未设置昵称"}</p>
              <p className="text-gray-500">{user?.email}</p>
              <p className="text-sm text-gray-400 mt-1">
                注册时间: {user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '未知'}
              </p>
            </div>
          </div>
        </div>

        {/* 使用统计卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📊 使用统计</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{stats?.total_usage || 0}</p>
              <p className="text-sm text-gray-600">累计使用次数</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{stats?.remaining || 0}</p>
              <p className="text-sm text-gray-600">今日剩余</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">{stats?.daily_quota || 10}</p>
              <p className="text-sm text-gray-600">每日配额</p>
            </div>
          </div>
          
          {/* 进度条 */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>今日使用</span>
              <span>{stats?.used_today || 0} / {stats?.daily_quota || 10}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${((stats?.used_today || 0) / (stats?.daily_quota || 10)) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">⚙️ 账户操作</h2>
          <div className="space-y-3">
            <button
              onClick={() => window.open('https://myaccount.google.com/', '_blank')}
              className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              🔧 管理 Google 账户
            </button>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 text-left bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
            >
              🚪 退出登录
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-gray-500">
        <p>© 2026 Image BG Remover</p>
      </footer>
    </div>
  );
}