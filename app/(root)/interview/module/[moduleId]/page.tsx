import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import Agent from "@/components/Agent";
import { getInterviewTypeById } from "@/constants/interview-modules";
import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";
import { getInterviewContext } from "@/lib/context7";

interface ModulePageProps {
  params: Promise<{ moduleId: string }>;
}

const ModulePage = async ({ params }: ModulePageProps) => {
  const { moduleId } = await params;
  const user = await currentUser();

  if (!user) redirect("/sign-in");

  const interviewModule = getInterviewTypeById(moduleId);
  if (!interviewModule) redirect("/");

  // Fetch up-to-date library docs from Context7 for technical interviews
  const context7Docs = await getInterviewContext(interviewModule.focusAreas, interviewModule.name);

  let questions: string[] = [];

  try {
    // Generate questions for this module
    const { text: questionsText } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `Prepare ${interviewModule.questionCount} questions for a ${interviewModule.name} interview.
      The focus areas are: ${interviewModule.focusAreas.join(", ")}.
      The experience level is: ${interviewModule.level}.
      ${context7Docs}
      
      Please return only the questions, without any additional text.
      The questions will be read by a voice assistant so avoid special characters.
      ${context7Docs ? "If Context7 documentation is provided above, reference current API patterns and best practices in your questions." : ""}
      
      Return the questions formatted like this:
      ["Question 1", "Question 2", "Question 3"]
    `,
    });

    try {
      questions = JSON.parse(questionsText);
    } catch {
      console.error("Failed to parse AI response as JSON");
      questions = [`Tell me about your experience with ${interviewModule.focusAreas[0]}`];
    }
  } catch (error) {
    console.warn("AI generation failed (likely quota limit), using fallback questions:", error);
    // Fallback questions if AI fails
    questions = [
      `Could you explain the core concepts of ${interviewModule.name}?`,
	      `Tell me about a challenging project involving ${interviewModule.focusAreas[0]}.`,
      `How do you handle error handling in ${interviewModule.name}?`
    ];
  }

  // Create interview in database
  const interview = {
    role: interviewModule.name,
    type: interviewModule.name,
    level: interviewModule.level,
    focusAreas: interviewModule.focusAreas,
    questions: questions,
    userId: user.id,
    finalized: true,
    coverImage: getRandomInterviewCover(interviewModule.id),
    createdAt: new Date().toISOString(),
    moduleId: interviewModule.id,
  };

  const docRef = await db.collection("interviews").add(interview);

  return (
    <>
      <div className="module-header">
        <span className="text-4xl">{interviewModule.icon}</span>
        <div>
          <h3>{interviewModule.name} Interview</h3>
          <p className="text-light-400">{interviewModule.description}</p>
        </div>
      </div>

      <Agent
        userName={`${user.firstName} ${user.lastName}`}
        userId={user.id}
        interviewId={docRef.id}
        type="interview"
        questions={questions}
        interviewModule={interviewModule.name}
        interviewFocusAreas={interviewModule.focusAreas}
      />
    </>
  );
};

export default ModulePage;
