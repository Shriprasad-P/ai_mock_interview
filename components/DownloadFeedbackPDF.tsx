"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CategoryScore {
  name: string;
  score: number;
  comment: string;
}

interface DownloadFeedbackPDFProps {
  feedback: {
    totalScore: number;
    categoryScores: CategoryScore[];
    strengths: string[];
    areasForImprovement: string[];
    finalAssessment: string;
    createdAt: string;
  };
  interview: {
    role: string;
    type: string;
    level?: string;
  };
}

const DownloadFeedbackPDF = ({
  feedback,
  interview,
}: DownloadFeedbackPDFProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const checkPageBreak = (requiredSpace: number) => {
        if (y + requiredSpace > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      // ── Header ──
      doc.setFillColor(30, 30, 45);
      doc.rect(0, 0, pageWidth, 45, "F");

      doc.setTextColor(202, 156, 255); // primary-200 purple
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("PrepWise", margin, 20);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Interview Feedback Report", margin, 30);

      doc.setFontSize(9);
      doc.setTextColor(180, 180, 200);
      const dateStr = feedback.createdAt
        ? new Date(feedback.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "N/A";
      doc.text(dateStr, pageWidth - margin, 30, { align: "right" });

      y = 55;

      // ── Interview Info ──
      doc.setFillColor(40, 40, 60);
      doc.roundedRect(margin, y, contentWidth, 32, 3, 3, "F");

      doc.setTextColor(180, 180, 200);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("ROLE", margin + 10, y + 10);
      doc.text("TYPE", margin + 70, y + 10);
      doc.text("OVERALL SCORE", pageWidth - margin - 50, y + 10);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(interview.role, margin + 10, y + 22);
      doc.text(interview.type, margin + 70, y + 22);

      // Score with color
      const score = feedback.totalScore || 0;
      if (score >= 70) doc.setTextColor(74, 222, 128); // green
      else if (score >= 50) doc.setTextColor(250, 204, 21); // yellow
      else doc.setTextColor(248, 113, 113); // red
      doc.setFontSize(20);
      doc.text(`${score}/100`, pageWidth - margin - 50, y + 24);

      y += 42;

      // ── Final Assessment ──
      doc.setTextColor(202, 156, 255);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Final Assessment", margin, y);
      y += 8;

      doc.setTextColor(220, 220, 235);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const assessmentLines = doc.splitTextToSize(
        feedback.finalAssessment || "",
        contentWidth
      );
      checkPageBreak(assessmentLines.length * 5 + 10);
      doc.text(assessmentLines, margin, y);
      y += assessmentLines.length * 5 + 12;

      // ── Category Breakdown ──
      checkPageBreak(20);
      doc.setTextColor(202, 156, 255);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Category Breakdown", margin, y);
      y += 10;

      feedback.categoryScores?.forEach((category) => {
        const commentLines = doc.splitTextToSize(
          category.comment || "",
          contentWidth - 20
        );
        const blockHeight = 22 + commentLines.length * 5;
        checkPageBreak(blockHeight + 5);

        // Background
        const isWeak = category.score < 70;
        const isStrong = category.score >= 80;
        if (isWeak) doc.setFillColor(60, 30, 30);
        else if (isStrong) doc.setFillColor(30, 60, 40);
        else doc.setFillColor(50, 50, 40);
        doc.roundedRect(margin, y, contentWidth, blockHeight, 2, 2, "F");

        // Category name
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(category.name, margin + 8, y + 10);

        // Score badge
        if (isWeak) doc.setTextColor(248, 113, 113);
        else if (isStrong) doc.setTextColor(74, 222, 128);
        else doc.setTextColor(250, 204, 21);
        doc.setFontSize(11);
        doc.text(
          `${category.score}/100`,
          pageWidth - margin - 8,
          y + 10,
          { align: "right" }
        );

        // Comment
        doc.setTextColor(200, 200, 215);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(commentLines, margin + 8, y + 18);

        y += blockHeight + 4;
      });

      y += 6;

      // ── Strengths ──
      checkPageBreak(20);
      doc.setTextColor(74, 222, 128);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("✓  Strengths", margin, y);
      y += 8;

      doc.setTextColor(200, 220, 200);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      feedback.strengths?.forEach((strength) => {
        const lines = doc.splitTextToSize(`•  ${strength}`, contentWidth - 10);
        checkPageBreak(lines.length * 5 + 3);
        doc.text(lines, margin + 6, y);
        y += lines.length * 5 + 3;
      });

      y += 8;

      // ── Areas for Improvement ──
      checkPageBreak(20);
      doc.setTextColor(248, 113, 113);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("⚠  Areas for Improvement", margin, y);
      y += 8;

      doc.setTextColor(220, 200, 200);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      feedback.areasForImprovement?.forEach((area) => {
        const lines = doc.splitTextToSize(`•  ${area}`, contentWidth - 10);
        checkPageBreak(lines.length * 5 + 3);
        doc.text(lines, margin + 6, y);
        y += lines.length * 5 + 3;
      });

      y += 12;

      // ── Footer ──
      checkPageBreak(15);
      doc.setDrawColor(80, 80, 100);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
      doc.setTextColor(140, 140, 160);
      doc.setFontSize(8);
      doc.text(
        "Generated by PrepWise AI Mock Interview Platform",
        pageWidth / 2,
        y,
        { align: "center" }
      );

      // Save
      const sanitizedRole = interview.role.replace(/[^a-zA-Z0-9]/g, "_");
      doc.save(`PrepWise_Feedback_${sanitizedRole}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      className="btn-primary flex-1"
      onClick={handleDownload}
      disabled={isGenerating}
    >
      <p className="text-sm font-semibold text-black text-center">
        {isGenerating ? "Generating PDF..." : "📄 Download PDF"}
      </p>
    </Button>
  );
};

export default DownloadFeedbackPDF;
