import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import Agent from "@/components/Agent";
import { getCompanyById } from "@/constants/interview-modules";
import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";
import { getInterviewContext } from "@/lib/context7";

interface CompanyPageProps {
  params: Promise<{ companyId: string }>;
}

const CompanyPage = async ({ params }: CompanyPageProps) => {
  const { companyId } = await params;
  const user = await currentUser();

  if (!user) redirect("/sign-in");

  const company = getCompanyById(companyId);
  if (!company) redirect("/");

  // Fetch up-to-date library docs from Context7 for technical focus areas
  const context7Docs = await getInterviewContext(company.focusAreas, company.interviewTypes[0]);

  let questions: string[] = [];

  try {
    // Generate questions customized for this company
    const { text: questionsText } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `Prepare 5 interview questions for a ${company.name} interview.
      The interview types covered are: ${company.interviewTypes.join(", ")}.
      The focus areas are: ${company.focusAreas.join(", ")}.
      The experience level is: ${company.level}.
      ${context7Docs}
      
      ${company.id === "amazon" ? `
      Include questions that test Amazon's Leadership Principles.
      Focus on: Customer Obsession, Ownership, Invent and Simplify, Learn and Be Curious.
      ` : ""}
      
      ${company.id === "google" ? `
      Include questions that test Googleyness and general cognitive ability.
      Focus on: problem solving, collaboration, and thinking at scale.
      ` : ""}
      
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
      questions = ["Tell me about your experience and why you want to join " + company.name];
    }
  } catch (error) {
    console.warn("AI generation failed (likely quota limit), using fallback questions:", error);
    // Fallback questions if AI fails
    questions = [
      `Why do you want to work at ${company.name}?`,
      `Tell me about a time you demonstrated leadership.`,
      `Describe a technical challenge you overcame recently.`
    ];

    // Add company specific flavor to fallbacks if possible
    if (company.focusAreas.length > 0) {
      questions.push(`How would you approach a problem involving ${company.focusAreas[0]}?`);
    }
  }

  // Create interview in database
  const interview = {
    role: `${company.name} Engineer`,
    type: company.interviewTypes[0],
    level: company.level,
    focusAreas: company.focusAreas,
    questions: questions,
    userId: user.id,
    finalized: true,
    coverImage: getRandomInterviewCover(company.id),
    createdAt: new Date().toISOString(),
    companyId: company.id,
  };

  const docRef = await db.collection("interviews").add(interview);

  return (
    <>
      <div className="module-header">
        <div className="company-badge">{company.name.charAt(0)}</div>
        <div>
          <h3>{company.name} Interview Prep</h3>
          <p className="text-light-400">{company.description}</p>
        </div>
      </div>

      <Agent
        userName={`${user.firstName} ${user.lastName}`}
        userId={user.id}
        interviewId={docRef.id}
        type="interview"
        questions={questions}
        interviewModule={company.interviewTypes[0]}
        interviewFocusAreas={company.focusAreas}
      />
    </>
  );
};

export default CompanyPage;
