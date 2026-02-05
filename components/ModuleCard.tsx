import Link from "next/link";
import { InterviewType } from "@/constants/interview-modules";

interface ModuleCardProps {
  module: InterviewType;
}

const ModuleCard = ({ module }: ModuleCardProps) => {
  return (
    <Link href={`/interview/module/${module.id}`}>
      <div className="module-card group">
        <div className="module-icon">{module.icon}</div>
        <h4 className="module-title">{module.name}</h4>
        <p className="module-description">{module.description}</p>
        <div className="module-footer">
          <span className="module-level">{module.level}</span>
          <span className="module-questions">{module.questionCount} Qs</span>
        </div>
      </div>
    </Link>
  );
};

export default ModuleCard;
