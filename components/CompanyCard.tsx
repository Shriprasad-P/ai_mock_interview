"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Company } from "@/constants/interview-modules";

interface CompanyCardProps {
  company: Company;
}

const CompanyCard = ({ company }: CompanyCardProps) => {
  const [imgError, setImgError] = useState(false);

  return (
    <Link href={`/interview/company/${company.id}`}>
      <div className="company-card group">
        <div className="company-logo-container">
          {!imgError ? (
            <Image
              src={company.logo}
              alt={`${company.name} logo`}
              width={48}
              height={48}
              className="company-logo"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="company-fallback">{company.name.charAt(0)}</span>
          )}
        </div>
        <h4 className="company-name">{company.name}</h4>
        <p className="company-description">{company.description}</p>
        <div className="company-footer">
          <span className="company-level">{company.level}</span>
        </div>
      </div>
    </Link>
  );
};

export default CompanyCard;
