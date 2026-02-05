import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import Agent from "@/components/Agent";
import { getInterviewTypeById } from "@/constants/interview-modules";
import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

interface ModulePageProps {
  params: Promise<{ moduleId: string }>;
}

const ModulePage = async ({ params }: ModulePageProps) => {
  const { moduleId } = await params;
  const user = await currentUser();

  if (!user) redirect("/sign-in");

  const module = getInterviewTypeById(moduleId);
  if (!module) redirect("/");

  // Generate questions for this module
  const { text: questionsText } = await generateText({
    model: google("gemini-2.0-flash-001"),
    prompt: `Prepare ${module.questionCount} questions for a ${module.name} interview.
      The focus areas are: ${module.focusAreas.join(", ")}.
      The experience level is: ${module.level}.
      
      Please return only the questions, without any additional text.
      The questions will be read by a voice assistant so avoid special characters.
      
      Return the questions formatted like this:
      ["Question 1", "Question 2", "Question 3"]
    `,
  });

  let questions: string[] = [];
  try {
    questions = JSON.parse(questionsText);
  } catch {
    questions = ["Tell me about your experience with " + module.focusAreas[0]];
  }

  // Create interview in database
  const interview = {
    role: module.name,
    type: module.name,
    level: module.level,
    focusAreas: module.focusAreas,
    questions: questions,
    userId: user.id,
    finalized: true,
    coverImage: getRandomInterviewCover(),
    createdAt: new Date().toISOString(),
    moduleId: module.id,
  };

  const docRef = await db.collection("interviews").add(interview);

  return (
    <>
      <div className="module-header">
        <span className="text-4xl">{module.icon}</span>
        <div>
          <h3>{module.name} Interview</h3>
          <p className="text-light-400">{module.description}</p>
        </div>
      </div>

      <Agent
        userName={`${user.firstName} ${user.lastName}`}
        userId={user.id}
        interviewId={docRef.id}
        type="interview"
        questions={questions}
      />
    </>
  );
};

export default ModulePage;
