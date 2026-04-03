import { NextRequest, NextResponse } from "next/server";
import { getCookie, createCookie } from "./cookies";

export const dynamic = "force-dynamic";

interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

export async function GET(request: NextRequest, context: { params: Promise<{ [key: string]: string }> }) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/", request.url) + "?error=auth_failed");
  }

  if (!code) {
    return NextResponse.redirect(new URL("/", request.url) + "?error=no_code");
  }

  // 获取环境变量
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;

  if (!googleClientId || !googleClientSecret) {
    return NextResponse.redirect(new URL("/", request.url) + "?error=config_error");
  }

  try {
    // 1. 换取 access_token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", await tokenResponse.text());
      return NextResponse.redirect(new URL("/", request.url) + "?error=token_failed");
    }

    const tokenData = await tokenResponse.json();

    // 2. 获取用户信息
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
      console.error("User info fetch failed:", await userResponse.text());
      return NextResponse.redirect(new URL("/", request.url) + "?error=user_failed");
    }

    const user = await userResponse.json();

    // 3. 保存或更新用户到 D1 数据库
    // 注意：在 Edge Runtime 中通过 context.env 获取 D1 绑定
    let userId: string;
    
    try {
      // 尝试获取 D1 绑定（仅在 Cloudflare 运行时可用）
      const env = context.params as unknown as Env;
      
      if (env.DB) {
        // 检查用户是否已存在
        const existingUser = await env.DB.prepare(
          "SELECT id FROM users WHERE google_id = ?"
        ).bind(user.id).first();

        if (existingUser) {
          // 更新最后登录时间
          await env.DB.prepare(
            "UPDATE users SET last_login = datetime('now') WHERE google_id = ?"
          ).bind(user.id).run();
          userId = existingUser.id as string;
        } else {
          // 创建新用户
          const result = await env.DB.prepare(
            "INSERT INTO users (google_id, email, name, avatar_url, created_at, last_login) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))"
          ).bind(user.id, user.email, user.name, user.picture).run();
          userId = result.meta?.last_insert_rowid?.toString() || user.id;
        }
      } else {
        // 本地开发或 D1 未配置时使用默认 ID
        userId = user.id;
      }
    } catch (d1Error) {
      console.error("D1 error:", d1Error);
      userId = user.id; // 回退到使用 Google ID
    }

    // 4. 设置会话 cookie（包含 D1 用户 ID）
    const sessionData = {
      user_id: userId,
      google_id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.picture,
    };

    const response = NextResponse.redirect(new URL("/", request.url) + "?logged_in=true");
    
    response.cookies.set("user_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 天
      path: "/",
    });

    return response;

  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.redirect(new URL("/", request.url) + "?error=auth_error");
  }
}