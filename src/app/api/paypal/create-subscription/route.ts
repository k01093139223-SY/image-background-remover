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
    const { productType, planId, planName, price, priceId } = body;

    if (productType !== "subscription") {
      return NextResponse.json({ error: "Invalid product type" }, { status: 400 });
    }

    const accessToken = await getAccessToken();

    // Create subscription with billing cycle
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: priceId,
        application_context: {
          brand_name: "Image BG Remover",
          locale: "en-US",
          shipping_address_option: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          payment_method: {
            payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
          },
          return_url: `${request.nextUrl.origin}/pricing?subscribed=true`,
          cancel_url: `${request.nextUrl.origin}/pricing?subscribed=false`,
        },
      }),
    });

    const subscription = await response.json();
    
    if (subscription.id) {
      return NextResponse.json({ id: subscription.id, status: subscription.status });
    }

    return NextResponse.json({ error: "Failed to create subscription", details: subscription }, { status: 500 });

  } catch (error) {
    console.error("Create subscription error:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}