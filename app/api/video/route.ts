import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

import { checkApiLimit, increaseApiLimit } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";

if (!process.env.PIKA_API_KEY) {
  throw new Error("PIKA_API_KEY is not set");
}

export async function POST(req: Request) {
  try {
    const authResult = await auth();
    const userId = authResult.userId;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { prompt } = body;

    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    const freeTrial = await checkApiLimit();
    const isPro = await checkSubscription();

    if (!freeTrial && !isPro) {
      return new NextResponse("Free trial has expired. Please upgrade to pro.", { status: 403 });
    }

    const response = await fetch(
      "https://api.pika.art/v1/generations",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.PIKA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          model: "text-to-video",
          width: 576,
          height: 320,
          fps: 8,
          seed: Math.floor(Math.random() * 1000000)
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Pika API Error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return new NextResponse(
        `Video generation failed: ${response.statusText}`,
        { status: response.status }
      );
    }

    if (!isPro) {
      await increaseApiLimit();
    }

    const result = await response.json();
    return NextResponse.json({ video: result.video_url });
  } catch (error) {
    console.error("Error generating video:", error);
    return new NextResponse(
      "Internal Error: Failed to generate video",
      { status: 500 }
    );
  }
}
