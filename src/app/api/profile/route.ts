import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("user_session");
  
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let sessionData;
  try {
    sessionData = JSON.parse(sessionCookie.value);
  } catch (e) {
    return NextResponse.json({ error: "无效的会话" }, { status: 401 });
  }

  const userId = sessionData.user_id;
  const googleId = sessionData.google_id;

  if (!userId && !googleId) {
    return NextResponse.json({ error: "无效的用户" }, { status: 401 });
  }

  const db = (process.env as any).DB;
  
  if (!db) {
    return NextResponse.json({
      user: {
        email: sessionData.email,
        name: sessionData.name,
        avatar_url: sessionData.avatar_url,
      },
      subscription: {
        type: 'free',
        status: 'active',
        daily_limit: 10,
        used_today: 0,
        remaining: 10,
      },
      credits: 0,
    });
  }

  try {
    let user;
    if (userId && !isNaN(parseInt(userId))) {
      user = await db.prepare(
        "SELECT * FROM users WHERE id = ?"
      ).bind(parseInt(userId)).first();
    }
    
    if (!user) {
      user = await db.prepare(
        "SELECT * FROM users WHERE google_id = ?"
      ).bind(googleId).first();
    }

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 检查订阅是否过期
    let dailyLimit = 10;
    let isSubscribed = false;
    
    if (user.subscription_type !== 'free' && user.subscription_expires) {
      const expires = new Date(user.subscription_expires);
      if (expires >= new Date() && user.subscription_status === 'active') {
        dailyLimit = 999999;
        isSubscribed = true;
      }
    }

    const today = new Date().toISOString().split('T')[0];
    let usedToday = user.daily_usage || 0;
    
    if (user.last_usage_date !== today) {
      usedToday = 0;
    }

    // 获取累计使用
    const usageStats = await db.prepare(
      "SELECT COUNT(*) as total_usage FROM usage_log WHERE user_id = ?"
    ).bind(user.id).first();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        last_login: user.last_login,
      },
      subscription: {
        type: user.subscription_type || 'free',
        status: user.subscription_status || 'active',
        expires: user.subscription_expires,
        is_active: isSubscribed,
        daily_limit: dailyLimit,
        used_today: usedToday,
        remaining: isSubscribed ? '无限' : Math.max(0, dailyLimit - usedToday),
      },
      credits: {
        balance: user.credits || 0,
        total_spent: user.total_credits_spent || 0,
      },
      stats: {
        total_usage: usageStats?.total_usage || 0,
      }
    });

  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json({
      user: {
        email: sessionData.email,
        name: sessionData.name,
        avatar_url: sessionData.avatar_url,
      },
      subscription: {
        type: 'free',
        daily_limit: 10,
        used_today: 0,
        remaining: 10,
      },
    });
  }
}