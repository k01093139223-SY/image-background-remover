import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;

  // Debug - remove in production
  console.log("=== OAuth Callback Debug ===");
  console.log("CLIENT_ID:", googleClientId ? "SET" : "MISSING");
  console.log("CLIENT_SECRET:", googleClientSecret ? "SET" : "MISSING");
  console.log("REDIRECT_URI:", redirectUri);

  if (!googleClientId || !googleClientSecret) {
    const missing = !googleClientId ? "CLIENT_ID" : "CLIENT_SECRET";
    console.error("MISSING ENV:", missing);
    return NextResponse.redirect(new URL("/?error=missing_" + missing.toLowerCase(), request.url));
  }

  try {
    console.log("EXCHANGING code for token...");
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

    const tokenStatus = tokenResponse.status;
    const tokenText = await tokenResponse.text();
    console.log("TOKEN STATUS:", tokenStatus);
    console.log("TOKEN RESPONSE:", tokenText.substring(0, 200));

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenText);
      return NextResponse.redirect(new URL("/?error=token_failed&status=" + tokenStatus, request.url));
    }

    const tokenData = JSON.parse(tokenText);

    // 2. 获取用户信息
    console.log("GETTING user info...");
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
      console.error("User info fetch failed:", await userResponse.text());
      return NextResponse.redirect(new URL("/?error=user_failed", request.url));
    }

    const user = await userResponse.json();
    console.log("USER:", user.email);

    // 3. 保存或更新用户到 D1 数据库
    const db = (process.env as any).DB;
    let userId: string;
    
    try {
      if (db) {
        console.log("SAVING to D1...");
        const existingUser = await db.prepare(
          "SELECT id FROM users WHERE google_id = ?"
        ).bind(user.id).first();

        if (existingUser) {
          await db.prepare(
            "UPDATE users SET last_login = datetime('now') WHERE google_id = ?"
          ).bind(user.id).run();
          userId = String(existingUser.id);
        } else {
          // 新用户注册，送3积分
          const result = await db.prepare(
            "INSERT INTO users (google_id, email, name, avatar_url, created_at, last_login, credits, subscription_type, subscription_status) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), 3, 'free', 'active')"
          ).bind(user.id, user.email, user.name, user.picture).run();
          userId = result.meta?.last_insert_rowid ? String(result.meta.last_insert_rowid) : user.id;
        }
        console.log("D1 SAVE OK, userId:", userId);
      } else {
        userId = user.id;
      }
    } catch (d1Error) {
      console.error("D1 error:", d1Error);
      userId = user.id;
    }

    // 4. 设置会话 cookie
    const sessionData = {
      user_id: userId,
      google_id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.picture,
    };

    const response = NextResponse.redirect(new URL("/?logged_in=1", request.url));
    
    // 设置 Cookie - 使用更宽松的设置确保跨环境可用
    response.cookies.set("user_session", JSON.stringify(sessionData), {
      httpOnly: false, // 允许客户端 JavaScript 读取
      secure: false, // 在 HTTP 下也可用（开发环境）
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    console.log("LOGIN SUCCESS, redirecting...");
    return response;

  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.redirect(new URL("/?error=auth_error", request.url));
  }
}