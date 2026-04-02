import { NextRequest, NextResponse } from "next/server";
import { getD1Database } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/", request.url) + "?error=auth_failed");
  }

  if (!code) {
    return NextResponse.redirect(new URL("/", request.url) + "?error=no_code");
  }

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

    // 3. 尝试存储用户到 D1（如果绑定存在）
    try {
      const db = getD1Database();
      if (db) {
        await db.prepare(`
          INSERT INTO users (google_id, email, name, avatar_url)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(google_id) DO UPDATE SET 
            email = excluded.email,
            name = excluded.name,
            avatar_url = excluded.avatar_url,
            updated_at = datetime('now')
        `).bind(user.id, user.email, user.name, user.picture).run();
      }
    } catch (dbError) {
      console.warn("D1 not available, skipping user存储:", dbError);
    }

    // 4. 设置 cookie 并跳转回首页
    const response = NextResponse.redirect(new URL("/", request.url) + "?logged_in=true");
    
    // 设置会话 cookie
    response.cookies.set("user_session", JSON.stringify({
      google_id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.picture,
    }), {
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