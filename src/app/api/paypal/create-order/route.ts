import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "ATlkCMuWeU99BRfOraUpjjpxk52N-HUFp9TpsPPhBhkF0lVRKDa9lgwmgBY4ltOsScJbxkyOCnVI-SuG";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "EPmISdWBpDnJmO2J-w7HJg4-FgSnwrHUyaegoLwoxSNmdbzAMlbL20wEsabpmCjiMD_y1CrDTZ7dWN0l";
const PAYPAL_BASE_URL = "https://api-m.sandbox.paypal.com"; // Sandbox

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
    const { productType, packageId, credits, price, priceId } = body;

    if (productType !== "credits") {
      return NextResponse.json({ error: "Invalid product type" }, { status: 400 });
    }

    const accessToken = await getAccessToken();

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: packageId,
            description: `Image BG Remover - ${packageId} Credits`,
            amount: {
              currency_code: "USD",
              value: price.toFixed(2),
            },
          },
        ],
      }),
    });

    const order = await response.json();
    return NextResponse.json({ id: order.id });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}