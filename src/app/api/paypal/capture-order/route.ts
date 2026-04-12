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
    const { orderId, productType, packageId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const accessToken = await getAccessToken();

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const capture = await response.json();

    if (capture.status === "COMPLETED") {
      // Get user session
      const sessionCookie = request.cookies.get("user_session");
      let userId = null;
      
      if (sessionCookie?.value) {
        try {
          const sessionData = JSON.parse(sessionCookie.value);
          userId = sessionData.user_id;
        } catch {}
      }

      // Get D1 database
      const db = (process.env as any).DB;

      // Add credits to user account
      const creditsMap: Record<string, number> = { starter: 50, popular: 160, pro: 550 };
      const creditsToAdd = creditsMap[packageId] || 50;
      
      if (db && userId) {
        try {
          await db.prepare(
            "UPDATE users SET credits = credits + ? WHERE id = ?"
          ).bind(creditsToAdd, parseInt(userId)).run();
          
          // Log the purchase
          await db.prepare(
            "INSERT INTO usage_log (user_id, operation, credits_used, cost_usd) VALUES (?, 'purchase', ?, ?)"
          ).bind(parseInt(userId), creditsToAdd, 0).run();
        } catch (err) {
          console.error("Failed to add credits:", err);
        }
      }

      return NextResponse.json({ 
        success: true, 
        creditsAdded: creditsToAdd,
        message: `Successfully added ${creditsToAdd} credits to your account!`
      });
    }

    return NextResponse.json({ error: "Payment not completed", details: capture }, { status: 400 });

  } catch (error) {
    console.error("Capture order error:", error);
    return NextResponse.json({ error: "Failed to capture order" }, { status: 500 });
  }
}