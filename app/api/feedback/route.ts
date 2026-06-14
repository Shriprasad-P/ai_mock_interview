import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";

import {
  createFeedback,
  getLatestInterviewByUserId,
} from "@/lib/actions/general.action";
import { db } from "@/firebase/admin";

type TranscriptMessage = {
  role: string;
  content: string;
};

const createFallbackInterview = async (
  userId: string,
  transcript: TranscriptMessage[]
) => {
  const firstAssistantMessage = transcript.find(
    (message) => message.role === "assistant" && message.content.trim()
  );

  const fallbackInterview = {
    role: "AI Mock Interview",
    type: "General Interview",
    level: "General",
    focusAreas: ["Communication Skills", "Domain Knowledge", "Analytical Thinking"],
    questions: firstAssistantMessage ? [firstAssistantMessage.content] : [],
    userId,
    finalized: true,
    coverImage: "/covers/amazon.png",
    createdAt: new Date().toISOString(),
    recoveredFromFeedbackRequest: true,
  };

  const docRef = await db.collection("interviews").add(fallbackInterview);
  return docRef.id;
};

export async function POST(request: Request) {
  noStore();

  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "You must be signed in to generate feedback." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const transcript = Array.isArray(body.transcript) ? body.transcript : [];
    let interviewId = typeof body.interviewId === "string" ? body.interviewId : "";

    if (!interviewId) {
      const latestInterview = await getLatestInterviewByUserId(user.id);
      interviewId = latestInterview?.id || "";
    }

    if (!interviewId) {
      interviewId = await createFallbackInterview(user.id, transcript);
    }

    const result = await createFeedback({
      interviewId,
      userId: user.id,
      transcript,
      feedbackId: body.feedbackId,
    });

    return NextResponse.json(
      { ...result, interviewId },
      { status: result.success ? 200 : 400 }
    );
  } catch (error) {
    console.error("Feedback API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate feedback.",
      },
      { status: 500 }
    );
  }
}
