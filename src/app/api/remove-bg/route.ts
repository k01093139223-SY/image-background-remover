import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

// Remove.bg API configuration
const REMOVE_BG_API_URL = "https://api.remove.bg/v1.0/removebg";
const API_KEY = process.env.REMOVE_BG_API_KEY;
const API_COST_PER_CALL = 0.01; // $0.01 per API call

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { error: "请提供图片数据" },
        { status: 400 }
      );
    }

    // 获取用户会话
    const sessionCookie = request.cookies.get("user_session");
    let userId: number | null = null;
    let isLoggedIn = false;
    
    if (sessionCookie?.value) {
      try {
        const sessionData = JSON.parse(sessionCookie.value);
        if (sessionData.user_id) {
          userId = parseInt(sessionData.user_id);
          isLoggedIn = true;
        }
      } catch (e) {}
    }

    // 获取 D1 数据库
    const db = (process.env as any).DB;
    
    // 检查使用限制
    if (db && userId) {
      const today = new Date().toISOString().split('T')[0];
      
      // 获取用户信息
      const user = await db.prepare(
        "SELECT * FROM users WHERE id = ?"
      ).bind(userId).first();
      
      if (user) {
        // 检查订阅状态
        let dailyLimit = 10; // 登录用户默认10次
        let canUse = true;
        
        // 检查订阅是否过期
        if (user.subscription_type !== 'free' && user.subscription_expires) {
          const expires = new Date(user.subscription_expires);
          if (expires < new Date()) {
            // 订阅已过期，降级为免费用户
            await db.prepare(
              "UPDATE users SET subscription_type = 'free', subscription_status = 'inactive' WHERE id = ?"
            ).bind(userId).run();
          } else if (user.subscription_status === 'active') {
            // 订阅用户，无限次数
            dailyLimit = 999999;
          }
        }
        
        // 重置每日使用（如果日期变了）
        if (user.last_usage_date !== today) {
          await db.prepare(
            "UPDATE users SET daily_usage = 0, last_usage_date = ? WHERE id = ?"
          ).bind(today, userId).run();
        } else if (user.daily_usage >= dailyLimit) {
          canUse = false;
        }
        
        if (!canUse) {
          return NextResponse.json({
            error: "今日次数已用完",
            code: "DAILY_LIMIT_EXCEEDED",
            limit: dailyLimit,
            remaining: 0,
          }, { status: 403 });
        }
        
        // 使用 API 处理图片
        const imageBuffer = Buffer.from(image, "base64");
        const formData = new FormData();
        formData.append("image_file", new Blob([imageBuffer]), "image.png");
        formData.append("size", "auto");
        formData.append("format", "png");

        const response = await fetch(REMOVE_BG_API_URL, {
          method: "POST",
          headers: {
            "X-Api-Key": API_KEY || "",
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Remove.bg API error:", errorText);
          
          if (!API_KEY) {
            return NextResponse.json({
              error: "请配置 REMOVE_BG_API_KEY 环境变量",
              demo: true,
            });
          }
          
          return NextResponse.json(
            { error: "图片处理失败，请重试" },
            { status: response.status }
          );
        }

        const resultBuffer = await response.arrayBuffer();
        const resultBase64 = Buffer.from(resultBuffer).toString("base64");
        
        // 记录使用
        await db.prepare(
          "UPDATE users SET daily_usage = daily_usage + 1, total_credits_spent = total_credits_spent + 1 WHERE id = ?"
        ).bind(userId).run();
        
        // 记录使用日志
        await db.prepare(
          "INSERT INTO usage_log (user_id, operation, credits_used, cost_usd) VALUES (?, 'remove_bg', 1, ?)"
        ).bind(userId, API_COST_PER_CALL);
        
        // 返回结果
        return NextResponse.json({
          result: resultBase64,
          usage: {
            daily_usage: (user.daily_usage || 0) + 1,
            daily_limit: dailyLimit,
            remaining: dailyLimit - (user.daily_usage || 0) - 1,
          }
        });
      }
    }
    
    // 未登录用户限制（简单实现，不记录数据库）
    // 实际生产中应该用 IP 或 session 记录
    // 这里暂时允许通过，后续可以通过 IP 限制
    
    // 处理图片
    const imageBuffer = Buffer.from(image, "base64");
    const formData = new FormData();
    formData.append("image_file", new Blob([imageBuffer]), "image.png");
    formData.append("size", "auto");
    formData.append("format", "png");

    const response = await fetch(REMOVE_BG_API_URL, {
      method: "POST",
      headers: {
        "X-Api-Key": API_KEY || "",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Remove.bg API error:", errorText);
      
      if (!API_KEY) {
        return NextResponse.json({
          error: "请配置 REMOVE_BG_API_KEY 环境变量",
          demo: true,
        });
      }
      
      return NextResponse.json(
        { error: "图片处理失败，请重试" },
        { status: response.status }
      );
    }

    const resultBuffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(resultBuffer).toString("base64");

    return NextResponse.json({
      result: resultBase64,
    });
    
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "服务器错误，请重试" },
      { status: 500 }
    );
  }
}