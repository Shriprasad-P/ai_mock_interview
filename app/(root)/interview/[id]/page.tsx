import Image from "next/image";
import { redirect } from "next/navigation";

import Agent from "@/components/Agent";
import { getRandomInterviewCover } from "@/lib/utils";

import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { currentUser } from "@clerk/nextjs/server";
import DisplayTopicIcons from "@/components/DisplayTopicIcons";

const InterviewDetails = async ({ params }: RouteParams) => {
  const { id } = await params;

  const user = await currentUser();

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user?.id!,
  });

  const agentPrompt = `You are a professional interviewer evaluating a candidate for a ${interview.role} position. The candidate has a ${interview.level} experience level. Focus on exactly ${interview.questions?.length || 0} questions related to: ${interview.focusAreas.join(", ")}.

The questions you must ask are provided in the dynamic variables. Ask these questions one by one. After asking a question, wait for the candidate's response before moving to the next. Do NOT provide the answer. Allow the candidate to think and speak. Keep the interview natural but strictly adhere to the provided questions.`;

  return (
    <>
      <div className="flex flex-row gap-4 justify-between">
        <div className="flex flex-row gap-4 items-center max-sm:flex-col">
          <div className="flex flex-row gap-4 items-center">
            <Image
              src={getRandomInterviewCover()}
              alt="cover-image"
              width={40}
              height={40}
              className="rounded-full object-cover size-[40px]"
            />
            <h3 className="capitalize">{interview.role} Interview</h3>
          </div>

          <DisplayTopicIcons focusAreas={interview.focusAreas} />
        </div>

        <p className="bg-dark-200 px-4 py-2 rounded-lg h-fit">
          {interview.type}
        </p>
      </div>

      <Agent
        userName={`${user?.firstName} ${user?.lastName}`}
        userId={user?.id}
        interviewId={id}
        type="interview"
        questions={interview.questions}
        feedbackId={feedback?.id}
        agentPrompt={agentPrompt}
      />
    </>
  );
};

export default InterviewDetails;
