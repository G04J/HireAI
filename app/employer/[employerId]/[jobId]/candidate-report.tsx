"use client";

import { useRef, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  MessageSquare,
  FileText,
  BarChart3,
  User,
} from "lucide-react";

interface ReportData {
  overallSummary: string;
  hiringRecommendation: string;
  overallConfidenceScore: number;
  jobFitAnalysis: {
    fitLevel: string;
    matchedCompetencies: string[];
    gapAreas: string[];
    growthPotential: string;
  };
  communicationAssessment: {
    clarity: number;
    articulation: number;
    confidence: number;
    overallCommunicationScore: number;
    feedback: string;
  };
  resumeAnalysis: {
    fitScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    justification: string;
  };
  stageEvaluations: Array<{
    stageId: string;
    stageType: string;
    performanceSummary: string;
    score: number;
    strengths: string[];
    areasForImprovement: string[];
    aiCollaborationAssessment?: string | null;
  }>;
  humanReadableReport: string;
}

interface CandidateApplication {
  id: string;
  user: {
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
    profile_summary: string | null;
  } | null;
  fit_score: number | null;
  status: string;
  report: {
    recommendation: string | null;
    overall_score: number | null;
    report_json: ReportData | null;
    human_readable_report: string | null;
    generated_at: string;
  } | null;
}

interface CandidateReportProps {
  application: CandidateApplication;
  allApplications: CandidateApplication[];
  jobTitle: string;
}

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

function scoreColor(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function scoreBgColor(score: number) {
  if (score >= 80) return "bg-green-500/20 border-green-500/30";
  if (score >= 60) return "bg-blue-500/20 border-blue-500/30";
  if (score >= 40) return "bg-amber-500/20 border-amber-500/30";
  return "bg-red-500/20 border-red-500/30";
}

function recommendationStyle(rec: string) {
  if (rec === "Strong Hire")
    return "bg-green-500/20 text-green-400 border-green-500/40";
  if (rec === "Hire") return "bg-blue-500/20 text-blue-400 border-blue-500/40";
  if (rec === "Consider")
    return "bg-amber-500/20 text-amber-400 border-amber-500/40";
  return "bg-red-500/20 text-red-400 border-red-500/40";
}

export default function CandidateReport({
  application,
  allApplications,
  jobTitle,
}: CandidateReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const report = application.report?.report_json as ReportData | null;
  const candidateName =
    application.user?.full_name ?? application.user?.email ?? "Candidate";

  const handleDownloadPdf = useCallback(async () => {
    if (!reportRef.current) return;
    const html2canvas = (await import("html2canvas-pro")).default;
    const { jsPDF } = await import("jspdf");

    const element = reportRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#0f172a",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight - 20;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - 20;
    }

    pdf.save(
      `${candidateName.replace(/\s+/g, "_")}_Report_${jobTitle.replace(/\s+/g, "_")}.pdf`
    );
  }, [candidateName, jobTitle]);

  if (!report) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <FileText className="w-8 h-8 mr-3 opacity-50" />
        <span>Report not yet available for this candidate.</span>
      </div>
    );
  }

  const completedApps = allApplications.filter(
    (a) => a.report?.overall_score != null
  );
  const comparisonData = completedApps
    .sort((a, b) => (b.report!.overall_score! - a.report!.overall_score!))
    .map((a) => ({
      name:
        (a.user?.full_name ?? a.user?.email ?? "?").split(" ")[0] ??
        "?",
      score: a.report!.overall_score!,
      fill:
        a.id === application.id
          ? "#3b82f6"
          : "#475569",
    }));

  const matchedSkills = report.resumeAnalysis?.matchedSkills ?? [];
  const missingSkills = report.resumeAnalysis?.missingSkills ?? [];
  const totalSkills = matchedSkills.length + missingSkills.length;
  const skillsPieData =
    totalSkills > 0
      ? [
          { name: "Matched Skills", value: matchedSkills.length, color: "#10b981" },
          { name: "Missing Skills", value: missingSkills.length, color: "#ef4444" },
        ]
      : [];

  const detailedSkillsPie = matchedSkills.map((skill, i) => ({
    name: skill,
    value: 1,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const commData = report.communicationAssessment
    ? [
        {
          subject: "Clarity",
          score: report.communicationAssessment.clarity,
          fullMark: 100,
        },
        {
          subject: "Articulation",
          score: report.communicationAssessment.articulation,
          fullMark: 100,
        },
        {
          subject: "Confidence",
          score: report.communicationAssessment.confidence,
          fullMark: 100,
        },
      ]
    : [];

  const currentRank =
    completedApps.findIndex((a) => a.id === application.id) + 1;
  const totalRanked = completedApps.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{candidateName}</h2>
          <p className="text-sm text-slate-400">
            {application.user?.email}
            {application.user?.phone && ` • ${application.user.phone}`}
          </p>
        </div>
        <Button
          onClick={handleDownloadPdf}
          className="gap-2 bg-blue-600 hover:bg-blue-500 text-white"
        >
          <Download className="w-4 h-4" /> Download PDF
        </Button>
      </div>

      <div ref={reportRef} className="space-y-6">
        {/* Score Overview */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-slate-800/60 border-white/10">
            <CardContent className="p-5 text-center">
              <p className="text-xs font-medium text-slate-400 mb-2">
                Confidence Score
              </p>
              <p
                className={`text-4xl font-bold ${scoreColor(report.overallConfidenceScore)}`}
              >
                {report.overallConfidenceScore}
              </p>
              <p className="text-xs text-slate-500 mt-1">out of 100</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-white/10">
            <CardContent className="p-5 text-center">
              <p className="text-xs font-medium text-slate-400 mb-2">
                Recommendation
              </p>
              <Badge
                className={`text-sm px-3 py-1 ${recommendationStyle(report.hiringRecommendation)}`}
              >
                {report.hiringRecommendation}
              </Badge>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-white/10">
            <CardContent className="p-5 text-center">
              <p className="text-xs font-medium text-slate-400 mb-2">
                Ranking
              </p>
              <p className="text-4xl font-bold text-white">
                #{currentRank}
                <span className="text-lg text-slate-400">/{totalRanked}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Executive Summary */}
        <Card className="bg-slate-800/60 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Award className="w-4 h-4 text-blue-400" /> Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-300 leading-relaxed">
              {report.overallSummary}
            </p>
          </CardContent>
        </Card>

        {/* Comparative Analysis */}
        {comparisonData.length > 1 && (
          <Card className="bg-slate-800/60 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <BarChart3 className="w-4 h-4 text-blue-400" /> Candidate
                Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400 mb-4">
                Confidence scores of all evaluated candidates for this role.
                Current candidate highlighted in blue.
              </p>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} barSize={32}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#334155"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={{ stroke: "#334155" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={{ stroke: "#334155" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: 8,
                        color: "#e2e8f0",
                      }}
                      formatter={(v: number) => [`${v}%`, "Score"]}
                    />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                      {comparisonData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Skills Analysis */}
        <div className="grid grid-cols-2 gap-4">
          {/* Skills Match Pie */}
          {skillsPieData.length > 0 && (
            <Card className="bg-slate-800/60 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2 text-base">
                  <Target className="w-4 h-4 text-blue-400" /> Skills Match
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={skillsPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value }) =>
                          `${name} (${value})`
                        }
                      >
                        {skillsPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: 8,
                          color: "#e2e8f0",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 text-xs text-slate-400 text-center">
                  {matchedSkills.length} of {totalSkills} required skills
                  matched
                </div>
              </CardContent>
            </Card>
          )}

          {/* Relevant Skills Distribution */}
          {detailedSkillsPie.length > 0 && (
            <Card className="bg-slate-800/60 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2 text-base">
                  <Target className="w-4 h-4 text-green-400" /> Relevant Skills
                  Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={detailedSkillsPie}
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        dataKey="value"
                        label={({ name }) => name}
                      >
                        {detailedSkillsPie.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: 8,
                          color: "#e2e8f0",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Job Fit Analysis */}
        <Card className="bg-slate-800/60 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-blue-400" /> Job Fit Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge
                className={`${scoreBgColor(report.resumeAnalysis?.fitScore ?? 0)} border px-3 py-1`}
              >
                {report.jobFitAnalysis?.fitLevel ?? "N/A"}
              </Badge>
              <span className="text-sm text-slate-400">
                Resume Fit Score: {report.resumeAnalysis?.fitScore ?? 0}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-green-400 mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Matched Competencies
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(report.jobFitAnalysis?.matchedCompetencies ?? []).map(
                    (c, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-xs border-green-500/30 text-green-400 bg-green-500/10"
                      >
                        {c}
                      </Badge>
                    )
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Gap Areas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(report.jobFitAnalysis?.gapAreas ?? []).map((g, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-xs border-red-500/30 text-red-400 bg-red-500/10"
                    >
                      {g}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            {report.jobFitAnalysis?.growthPotential && (
              <div>
                <p className="text-xs font-medium text-slate-400 mb-1">
                  Growth Potential
                </p>
                <p className="text-sm text-slate-300">
                  {report.jobFitAnalysis.growthPotential}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Communication Assessment */}
        {report.communicationAssessment && (
          <Card className="bg-slate-800/60 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <MessageSquare className="w-4 h-4 text-blue-400" />{" "}
                Communication Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  {[
                    {
                      label: "Clarity",
                      val: report.communicationAssessment.clarity,
                    },
                    {
                      label: "Articulation",
                      val: report.communicationAssessment.articulation,
                    },
                    {
                      label: "Confidence",
                      val: report.communicationAssessment.confidence,
                    },
                    {
                      label: "Overall",
                      val: report.communicationAssessment
                        .overallCommunicationScore,
                    },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{label}</span>
                        <span className={scoreColor(val)}>{val}%</span>
                      </div>
                      <Progress
                        value={val}
                        className="h-2 bg-slate-700"
                      />
                    </div>
                  ))}
                </div>
                {commData.length > 0 && (
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={commData}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                        />
                        <PolarRadiusAxis
                          domain={[0, 100]}
                          tick={{ fill: "#64748b", fontSize: 9 }}
                        />
                        <Radar
                          dataKey="score"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.3}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {report.communicationAssessment.feedback}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stage-by-Stage Evaluations */}
        {report.stageEvaluations && report.stageEvaluations.length > 0 && (
          <Card className="bg-slate-800/60 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-blue-400" /> Stage-by-Stage
                Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.stageEvaluations.map((stage, idx) => (
                <div key={stage.stageId || idx}>
                  {idx > 0 && <Separator className="bg-white/10 my-4" />}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-white/20 text-slate-300 text-xs capitalize"
                      >
                        {stage.stageType}
                      </Badge>
                      <span className="text-sm font-medium text-white">
                        Stage {idx + 1}
                      </span>
                    </div>
                    <span
                      className={`text-lg font-bold ${scoreColor(stage.score)}`}
                    >
                      {stage.score}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mb-3">
                    {stage.performanceSummary}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-green-400 mb-1">
                        Strengths
                      </p>
                      <ul className="text-xs text-slate-400 space-y-0.5">
                        {stage.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-green-400 mt-0.5">•</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-amber-400 mb-1">
                        Areas for Improvement
                      </p>
                      <ul className="text-xs text-slate-400 space-y-0.5">
                        {stage.areasForImprovement.map((a, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-amber-400 mt-0.5">•</span> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {stage.aiCollaborationAssessment && (
                    <div className="mt-2 p-2 bg-slate-700/40 rounded-md">
                      <p className="text-xs font-medium text-purple-400 mb-1">
                        AI Collaboration Assessment
                      </p>
                      <p className="text-xs text-slate-400">
                        {stage.aiCollaborationAssessment}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Resume Analysis */}
        <Card className="bg-slate-800/60 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <User className="w-4 h-4 text-blue-400" /> Resume Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm text-slate-400">Fit Score:</span>
              <span
                className={`text-lg font-bold ${scoreColor(report.resumeAnalysis?.fitScore ?? 0)}`}
              >
                {report.resumeAnalysis?.fitScore ?? 0}%
              </span>
            </div>
            {(report.resumeAnalysis?.justification?.trim() ?? '') && (
              <p className="text-sm text-slate-300">
                {report.resumeAnalysis.justification}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-green-400 mb-1.5">
                  Matched Skills
                </p>
                <div className="flex flex-wrap gap-1">
                  {matchedSkills.map((s, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-[10px] border-green-500/30 text-green-400 bg-green-500/10"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-red-400 mb-1.5">
                  Missing Skills
                </p>
                <div className="flex flex-wrap gap-1">
                  {missingSkills.map((s, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-[10px] border-red-500/30 text-red-400 bg-red-500/10"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
