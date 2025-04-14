import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

import { checkApiLimit, increaseApiLimit } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";

export async function POST(req: Request) {
  try {
    const authResult = await auth();
    
    if (!authResult || !authResult.userId) {
      console.log("Auth failed:", authResult);
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = authResult.userId;
    console.log("Auth successful for user:", userId);

    const body = await req.json();
    const { prompt } = body;

    if (!process.env.EDEN_AI_API_KEY) {
      return new NextResponse("Eden AI API Key Not Configured", { status: 500 });
    }

    if (!prompt) {
      return new NextResponse("Prompt is Required", { status: 400 });
    }

    const freeTrial = await checkApiLimit();
    const isPro = await checkSubscription();

    if (!freeTrial && !isPro) {
      return new NextResponse("Free Trial Has Expired", { status: 403 });
    }

    try {
      const response = await fetch("https://api.edenai.run/v2/audio/text_to_speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.EDEN_AI_API_KEY}`
        },
        body: JSON.stringify({
          providers: ["microsoft"],
          text: prompt,
          settings: {
            microsoft: "en-US-JennyNeural"
          }
        })
      });

      const data = await response.json();
      console.log("[EDEN_RESPONSE]", data);

      // Check for API errors
      if (data.error) {
        console.error("[EDEN_API_ERROR]", data.error);
        return new NextResponse(data.error.message || "Failed to generate music", { status: 400 });
      }

      // Check for provider errors
      if (data.microsoft?.status === 'fail') {
        const errorMessage = data.microsoft.error?.message || "Failed to generate music";
        console.error("[EDEN_PROVIDER_ERROR]", data.microsoft.error);
        return new NextResponse(errorMessage, { status: 400 });
      }

      // Get the audio URL from the response
      const audioUrl = data.microsoft?.items?.[0]?.audio_resource_url || 
                      data.microsoft?.items?.[0]?.url;

      if (!audioUrl) {
        console.error("[EDEN_RESPONSE_NO_URL]", data);
        throw new Error("No audio URL in response");
      }

      if (!isPro) {
        await increaseApiLimit();
      }

      return new NextResponse(JSON.stringify({
        url: audioUrl
      }), {
        headers: {
          'Content-Type': 'application/json',
        },
      });

    } catch (edenError: any) {
      console.error("[EDEN_ERROR]", edenError);
      
      if (edenError.response) {
        const errorData = edenError.response.data;
        
        switch (errorData.code) {
          case 'INSUFFICIENT_CREDITS':
            return new NextResponse("Insufficient credits. Please upgrade your plan.", { status: 402 });
          case 'RATE_LIMIT_EXCEEDED':
            return new NextResponse("Rate limit exceeded. Please try again in a few minutes.", { status: 429 });
          case 'INVALID_API_KEY':
            return new NextResponse("Invalid Eden AI API key configuration.", { status: 500 });
          default:
            return new NextResponse(`Eden AI Error: ${errorData.message}`, { status: 500 });
        }
      }
      
      return new NextResponse(edenError.message || "Error generating music", { status: 500 });
    }
  } catch (error: any) {
    console.error("[MUSIC_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
