import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const authResult = await auth();
    const userId = authResult.userId;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { operationName } = body;

    if (!operationName) {
      return new NextResponse("Operation name is required", { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyA-2DwiLBqiXu8eQ24oB97elJR8RhcrhlM";

    // Check the status of the operation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${GEMINI_API_KEY}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini Veo Operation Status Error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return new NextResponse(
        `Failed to get operation status: ${errorData.error?.message || response.statusText}`,
        { status: response.status }
      );
    }

    const operationStatus = await response.json();

    // Check if the operation is done
    if (operationStatus.done) {
      // Check if there's an error
      if (operationStatus.error) {
        return new NextResponse(
          `Video generation failed: ${operationStatus.error.message}`,
          { status: 400 }
        );
      }

      // If successful, return the video URLs
      const generatedVideos = operationStatus.response?.generatedVideos || [];
      const videoUrls = generatedVideos.map(video => video.video.url);

      return NextResponse.json({
        done: true,
        videos: videoUrls
      });
    } else {
      // Operation still in progress
      return NextResponse.json({
        done: false,
        message: "Video generation in progress"
      });
    }

  } catch (error) {
    console.error("Error checking video generation status:", error);
    return new NextResponse(
      "Internal Error: Failed to check video generation status",
      { status: 500 }
    );
  }
}