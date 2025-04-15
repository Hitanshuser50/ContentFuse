import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

import { checkApiLimit, increaseApiLimit } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";

export async function POST(req: Request) {
  try {
    const authResult = await auth();
    const userId = authResult.userId;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { prompt, aspectRatio } = body;

    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyA-2DwiLBqiXu8eQ24oB97elJR8RhcrhlM";

    if (!GEMINI_API_KEY) {
      return new NextResponse("Gemini API Key is not set", { status: 500 });
    }

    const freeTrial = await checkApiLimit();
    const isPro = await checkSubscription();

    if (!freeTrial && !isPro) {
      return new NextResponse("Free trial has expired. Please upgrade to pro.", { status: 403 });
    }

    // Veo is a paid feature and requires a paid account
    if (!isPro) {
      return new NextResponse("Video generation requires a Pro subscription", { status: 403 });
    }

    // Initial request to start video generation operation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:generateVideos?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          config: {
            personGeneration: "dont_allow", // Default to safer option
            aspectRatio: aspectRatio || "16:9", // Default to 16:9 if not specified
            numberOfVideos: 1,
            enhancePrompt: true
          }
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini Veo API Error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return new NextResponse(
        `Video generation failed: ${errorData.error?.message || response.statusText}`,
        { status: response.status }
      );
    }

    // Get the operation details
    const operationData = await response.json();
    const operationName = operationData.name;

    if (!operationName) {
      return new NextResponse("Failed to start video generation", { status: 500 });
    }

    // Return the operation name for client-side polling
    return NextResponse.json({ 
      operationName: operationName,
      message: "Video generation started. This operation may take several minutes to complete."
    });

  } catch (error) {
    console.error("Error generating video:", error);
    return new NextResponse(
      "Internal Error: Failed to generate video",
      { status: 500 }
    );
  }
}
