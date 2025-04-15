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
    
    if (!prompt) {
      return new NextResponse("Prompt is Required", { status: 400 });
    }
    
    const freeTrial = await checkApiLimit();
    const isPro = await checkSubscription();
    
    if (!freeTrial && !isPro) {
      return new NextResponse("Free Trial Has Expired", { status: 403 });
    }
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyA-2DwiLBqiXu8eQ24oB97elJR8RhcrhlM";
    
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ]
          })
        }
      );
      
      const data = await response.json();
      console.log("[GEMINI_RESPONSE]", data);
      
      // Check for API errors
      if (data.error) {
        console.error("[GEMINI_API_ERROR]", data.error);
        return new NextResponse(data.error.message || "Failed to generate content", { status: 400 });
      }
      
      // Extract the generated text from the response
      const generatedContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!generatedContent) {
        console.error("[GEMINI_RESPONSE_NO_TEXT]", data);
        throw new Error("No text content in response");
      }
      
      if (!isPro) {
        await increaseApiLimit();
      }
      
      return new NextResponse(JSON.stringify({
        content: generatedContent
      }), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
    } catch (geminiError: any) {
      console.error("[GEMINI_ERROR]", geminiError);
      
      return new NextResponse(geminiError.message || "Error generating content", { status: 500 });
    }
  } catch (error: any) {
    console.error("[CONTENT_GENERATION_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}