import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";
import ModuleCard from "@/components/ModuleCard";
import CompanyCard from "@/components/CompanyCard";

import { currentUser } from "@clerk/nextjs/server";
import {
  getInterviewsByUserId,
  getLatestInterviews,
} from "@/lib/actions/general.action";
import { interviewTypes, companies } from "@/constants/interview-modules";

async function Home() {
  const user = await currentUser();

  const [userInterviews, allInterview] = await Promise.all([
    getInterviewsByUserId(user?.id!),
    getLatestInterviews({ userId: user?.id! }),
  ]);

  const hasPastInterviews = userInterviews?.length! > 0;
  const hasUpcomingInterviews = allInterview?.length! > 0;

  return (
    <>
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>Get Interview-Ready with AI-Powered Practice & Feedback</h2>
          <p className="text-lg">
            Practice real interview questions & get instant feedback
          </p>

          <Button asChild className="btn-primary max-sm:w-full">
            <Link href="/interview">Start Custom Interview</Link>
          </Button>
        </div>

        <Image
          src="/robot.png"
          alt="robo-dude"
          width={400}
          height={400}
          className="max-sm:hidden"
        />
      </section>

      {/* Quick Start Modules */}
      <section className="flex flex-col gap-6 mt-8">
        <h2>Quick Start Modules</h2>
        <p className="text-light-400 -mt-4">
          Jump straight into a focused practice session
        </p>

        <div className="modules-grid">
          {interviewTypes.slice(0, 4).map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>

        {interviewTypes.length > 4 && (
          <div className="modules-grid">
            {interviewTypes.slice(4).map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        )}
      </section>

      {/* Company-Specific Prep */}
      <section className="flex flex-col gap-6 mt-8">
        <h2>Company-Specific Prep</h2>
        <p className="text-light-400 -mt-4">
          Prepare for interviews at top companies
        </p>

        <div className="modules-grid">
          {companies.slice(0, 4).map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>

        <div className="modules-grid">
          {companies.slice(4).map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      </section>

      {/* Your Interviews */}
      <section className="flex flex-col gap-6 mt-8">
        <h2>Your Interviews</h2>

        <div className="interviews-section">
          {hasPastInterviews ? (
            userInterviews?.map((interview) => (
              <InterviewCard
                key={interview.id}
                userId={user?.id}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                focusAreas={interview.focusAreas}
                createdAt={interview.createdAt}
              />
            ))
          ) : (
            <p>You haven&apos;t taken any interviews yet</p>
          )}
        </div>
      </section>

      {/* Take Interviews */}
      <section className="flex flex-col gap-6 mt-8">
        <h2>Take Interviews</h2>

        <div className="interviews-section">
          {hasUpcomingInterviews ? (
            allInterview?.map((interview) => (
              <InterviewCard
                key={interview.id}
                userId={user?.id}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                focusAreas={interview.focusAreas}
                createdAt={interview.createdAt}
              />
            ))
          ) : (
            <p>There are no interviews available</p>
          )}
        </div>
      </section>
    </>
  );
}

export default Home;

