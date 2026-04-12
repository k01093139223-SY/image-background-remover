import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "ATlkCMuWeU99BRfOraUpjjpxk52N-HUFp9TpsPPhBhkF0lVRKDa9lgwmgBY4ltOsScJbxkyOCnVI-SuG";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "EPmISdWBpDnJmO2J-w7HJg4-FgSnwrHUyaegoLwoxSNmdbzAMlbL20wEsabpmCjiMD_y1CrDTZ7dWN0l";
const PAYPAL_BASE_URL = "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await response.json();
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId, planId } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: "Missing subscriptionId" }, { status: 400 });
    }

    const accessToken = await getAccessToken();

    // Get subscription details to confirm it's active
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const subscription = await response.json();

    if (subscription.status === "ACTIVE" || subscription.status === "APPROVED") {
      // Get user session
      const sessionCookie = request.cookies.get("user_session");
      let userId = null;
      
      if (sessionCookie?.value) {
        try {
          const sessionData = JSON.parse(sessionCookie.value);
          userId = sessionData.user_id;
        } catch {}
      }

      const db = (process.env as any).DB;

      // Calculate expiration date (30 days from now)
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + 30);
      const expiresStr = expiresDate.toISOString().split('T')[0];

      // Update user subscription
      if (db && userId) {
        try {
          const dailyLimit = planId === "pro" ? 999999 : 50;
          
          await db.prepare(
            `UPDATE users SET 
              subscription_type = ?, 
              subscription_expires = ?, 
              subscription_status = 'active',
              daily_limit = ?
            WHERE id = ?`
          ).bind(planId, expiresStr, dailyLimit, parseInt(userId)).run();

          await db.prepare(
            "INSERT INTO usage_log (user_id, operation, credits_used, cost_usd) VALUES (?, 'subscription_activated', 0, 0)"
          ).bind(parseInt(userId)).run();
        } catch (err) {
          console.error("Failed to activate subscription:", err);
        }
      }

      return NextResponse.json({ 
        success: true, 
        planId,
        message: "Subscription activated successfully!"
      });
    }

    return NextResponse.json({ error: "Subscription not active", status: subscription.status }, { status: 400 });

  } catch (error) {
    console.error("Activate subscription error:", error);
    return NextResponse.json({ error: "Failed to activate subscription" }, { status: 500 });
  }
}