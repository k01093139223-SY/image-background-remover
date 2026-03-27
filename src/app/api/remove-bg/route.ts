import { NextRequest, NextResponse } from "next/server";

// Remove.bg API configuration
const REMOVE_BG_API_URL = "https://api.remove.bg/v1.0/removebg";
const API_KEY = process.env.REMOVE_BG_API_KEY;

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

    // Decode base64 to buffer
    const imageBuffer = Buffer.from(image, "base64");

    // Create FormData for API request
    const formData = new FormData();
    formData.append("image_file", new Blob([imageBuffer]), "image.png");
    formData.append("size", "auto");
    formData.append("format", "png");

    // Call Remove.bg API
    const response = await fetch(REMOVE_BG_API_URL, {
      method: "POST",
      headers: {
        "X-Api-Key": API_KEY || "",
      },
      body: formData as any,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Remove.bg API error:", errorText);
      
      // For demo purposes, if no API key configured, return a mock response
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

    // Get the processed image
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
