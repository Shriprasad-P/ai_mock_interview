"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

const buildFallbackFeedback = (transcript: CreateFeedbackParams["transcript"]) => {
  const userMessages = transcript.filter((message) => message.role === "user");
  const assistantMessages = transcript.filter((message) => message.role === "assistant");
  const hasTranscript = transcript.length > 0;
  const hasUserAnswers = userMessages.some((message) => message.content.trim().length > 20);

  return {
    totalScore: hasUserAnswers ? 62 : 40,
    categoryScores: [
      {
        name: "Communication Skills",
        score: hasUserAnswers ? 65 : 40,
        comment: hasUserAnswers
          ? "You completed the interview and provided answers, but some responses need clearer structure and stronger examples."
          : "The transcript did not include enough candidate responses to evaluate communication accurately.",
      },
      {
        name: "Domain Knowledge",
        score: hasUserAnswers ? 60 : 40,
        comment: hasUserAnswers
          ? "Your answers show partial familiarity with the topic. Add more specific concepts, trade-offs, and examples."
          : "There was not enough answer content to judge domain knowledge.",
      },
      {
        name: "Analytical Thinking",
        score: hasUserAnswers ? 62 : 40,
        comment: hasUserAnswers
          ? "You should make your reasoning more explicit by stating assumptions, approach, and conclusion."
          : "The available transcript is too limited to assess problem-solving depth.",
      },
      {
        name: "Cultural & Role Fit",
        score: hasUserAnswers ? 64 : 45,
        comment: hasUserAnswers
          ? "Your responses indicate engagement, but they would be stronger with role-specific impact and collaboration examples."
          : "More complete answers are needed to assess role fit.",
      },
      {
        name: "Confidence and Clarity",
        score: hasUserAnswers ? 60 : 40,
        comment: hasUserAnswers
          ? "Improve confidence by answering in a concise STAR-style or problem-solution-result structure."
          : "The interview ended without enough usable response content.",
      },
    ],
    strengths: hasTranscript
      ? [
          "Completed the mock interview flow.",
          "Captured a transcript that can be reviewed for improvement.",
        ]
      : ["Started the interview attempt."],
    areasForImprovement: [
      "Use a clear structure for each answer: context, action, result, and lesson.",
      "Add more concrete technical or role-specific details.",
      "Keep answers concise while explaining your reasoning out loud.",
    ],
    finalAssessment: assistantMessages.length
      ? "Feedback was generated with a local fallback because the AI feedback service was unavailable or too slow. Use this as a baseline review and retake the interview for a richer AI assessment."
      : "The interview transcript was too short for detailed scoring. Retake the interview and answer each question fully for better feedback.",
  };
};

const generateFeedbackObject = async (formattedTranscript: string, transcript: CreateFeedbackParams["transcript"]) => {
  try {
    const feedbackPromise = generateObject({
      model: google("gemini-2.0-flash-001", {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Domain Knowledge**: Understanding of relevant concepts, frameworks, and industry knowledge.
        - **Analytical Thinking**: Ability to structure problems, analyze data, and draw insights.
        - **Cultural & Role Fit**: Alignment with industry values and job role expectations.
        - **Confidence and Clarity**: Professional demeanor and articulation.
        `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("AI feedback generation timed out")), 25000);
    });

    const { object } = await Promise.race([feedbackPromise, timeoutPromise]);
    return object;
  } catch (error) {
    console.error("AI feedback generation failed, using fallback feedback:", error);
    return buildFallbackFeedback(transcript);
  }
};

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    if (!interviewId || !userId) {
      return { success: false, error: "Missing interview or user information." };
    }

    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    const object = await generateFeedbackObject(formattedTranscript, transcript);

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
      return { success: false, error: error.message };
    }
    return { success: false, error: String(error) };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  if (!userId) return [];

  const interviews = await db
    .collection("interviews")
    .where("finalized", "==", true)
    .where("userId", "!=", userId)
    .orderBy("userId", "asc") // Inequality filter requires ordering by that field first
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  if (!userId) return [];

  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getLatestInterviewByUserId(
  userId: string
): Promise<Interview | null> {
  if (!userId) return null;

  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (interviews.empty) return null;

  const doc = interviews.docs[0];
  return { id: doc.id, ...doc.data() } as Interview;
}
