import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { Button } from "@/components/ui/button";
import { currentUser } from "@clerk/nextjs/server";
import LearningResources from "@/components/LearningResources";
import DownloadFeedbackPDF from "@/components/DownloadFeedbackPDF";
import { getResourcesByTopics } from "@/constants/learning-resources";


// Map category names to resource topics
const categoryToTopics: Record<string, string[]> = {
  "Communication Skills": ["communication skills", "interview preparation", "behavioral"],
  "Domain Knowledge": ["data structures", "algorithms", "system design"],
  "Analytical Thinking": ["problem solving", "critical thinking", "algorithms"],
  "Cultural & Role Fit": ["behavioral", "leadership", "interview preparation"],
  "Confidence and Clarity": ["communication skills", "interview preparation"],
  // Technical categories
  "Technical Skills": ["data structures", "algorithms", "system design"],
  "Problem Solving": ["algorithms", "problem solving", "data structures"],
  "System Design": ["system design", "databases", "scalability"],
  "Coding": ["data structures", "algorithms", "python", "java"],
};

const Feedback = async ({ params }: RouteParams) => {
  const { id } = await params;
  const user = await currentUser();

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user?.id!,
  });

  // Get learning resources based on interview focus areas
  const focusAreas = interview.focusAreas || [];
  
  // Identify weak areas (score < 70) and get targeted resources
  const weakCategories = feedback?.categoryScores?.filter(cat => cat.score < 70) || [];
  const strongCategories = feedback?.categoryScores?.filter(cat => cat.score >= 70) || [];
  
  // Build topics from weak categories
  const weakTopics: string[] = [];
  weakCategories.forEach(cat => {
    const topics = categoryToTopics[cat.name] || [];
    weakTopics.push(...topics);
  });
  
  // Combine focus areas with weak topics for comprehensive resources
  const allTopics = [...new Set([...focusAreas, ...weakTopics])];
  const resources = getResourcesByTopics(allTopics);

  // Separate resources for weak areas specifically
  const weakAreaResources = getResourcesByTopics(weakTopics);

  return (
    <section className="section-feedback">
      <div className="flex flex-row justify-center">
        <h1 className="text-4xl font-semibold">
          Feedback on the Interview -{" "}
          <span className="capitalize">{interview.role}</span> Interview
        </h1>
      </div>

      <div className="flex flex-row justify-center ">
        <div className="flex flex-row gap-5">
          {/* Overall Impression */}
          <div className="flex flex-row gap-2 items-center">
            <Image src="/star.svg" width={22} height={22} alt="star" />
            <p>
              Overall Impression:{" "}
              <span className={`font-bold ${
                (feedback?.totalScore || 0) >= 70 ? "text-green-400" : 
                (feedback?.totalScore || 0) >= 50 ? "text-yellow-400" : "text-red-400"
              }`}>
                {feedback?.totalScore}
              </span>
              /100
            </p>
          </div>

          {/* Date */}
          <div className="flex flex-row gap-2">
            <Image src="/calendar.svg" width={22} height={22} alt="calendar" />
            <p>
              {feedback?.createdAt
                ? dayjs(feedback.createdAt).format("MMM D, YYYY h:mm A")
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      <hr />

      <p>{feedback?.finalAssessment}</p>

      {/* Interview Breakdown */}
      <div className="flex flex-col gap-4 mt-8">
        <h2>Breakdown of the Interview:</h2>
        {feedback?.categoryScores?.map((category, index) => {
          const isWeak = category.score < 70;
          const isStrong = category.score >= 80;
          
          return (
            <div key={index} className={`p-4 rounded-lg ${
              isWeak ? "bg-red-500/10 border border-red-500/30" : 
              isStrong ? "bg-green-500/10 border border-green-500/30" : 
              "bg-dark-400/50"
            }`}>
              <p className="font-bold flex items-center gap-2">
                {isWeak && <span className="text-red-400">⚠️</span>}
                {isStrong && <span className="text-green-400">✅</span>}
                {index + 1}. {category.name} 
                <span className={`ml-2 px-2 py-0.5 rounded text-sm ${
                  isWeak ? "bg-red-500/20 text-red-400" : 
                  isStrong ? "bg-green-500/20 text-green-400" : 
                  "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {category.score}/100
                </span>
              </p>
              <p className="mt-2 text-light-400">{category.comment}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2">
          <span className="text-green-400">✅</span> Strengths
        </h3>
        <ul className="list-disc list-inside space-y-1">
          {feedback?.strengths?.map((strength, index) => (
            <li key={index} className="text-green-300">{strength}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2">
          <span className="text-red-400">⚠️</span> Areas for Improvement
        </h3>
        <ul className="list-disc list-inside space-y-1">
          {feedback?.areasForImprovement?.map((area, index) => (
            <li key={index} className="text-red-300">{area}</li>
          ))}
        </ul>
      </div>

      {/* Personalized Resources for Weak Areas */}
      {weakAreaResources.length > 0 && (
        <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🎯</span>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Focus on These Areas
              </h2>
              <p className="text-sm text-light-400">
                Personalized resources based on your weak areas: {weakCategories.map(c => c.name).join(", ")}
              </p>
            </div>
          </div>
          <LearningResources resources={weakAreaResources} />
        </div>
      )}

      {/* General Learning Resources */}
      <div className="mt-4">
        <LearningResources resources={resources} />
      </div>

      <div className="buttons">
        <Button className="btn-secondary flex-1">
          <Link href="/" className="flex w-full justify-center">
            <p className="text-sm font-semibold text-primary-200 text-center">
              Back to dashboard
            </p>
          </Link>
        </Button>

        {feedback && (
          <DownloadFeedbackPDF
            feedback={{
              totalScore: feedback.totalScore,
              categoryScores: feedback.categoryScores,
              strengths: feedback.strengths,
              areasForImprovement: feedback.areasForImprovement,
              finalAssessment: feedback.finalAssessment,
              createdAt: feedback.createdAt,
            }}
            interview={{
              role: interview.role,
              type: interview.type,
              level: interview.level,
            }}
          />
        )}

        <Button className="btn-primary flex-1">
          <Link
            href={`/interview/${id}`}
            className="flex w-full justify-center"
          >
            <p className="text-sm font-semibold text-black text-center">
              Retake Interview
            </p>
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default Feedback;

