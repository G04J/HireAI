"use client";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Users,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Eye,
  ChevronDown,
  Trophy,
  TrendingUp,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SiteLogo } from "@/components/site-logo";
import CandidateReport from "./candidate-report";

function scoreColor(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function scoreBadgeClass(score: number) {
  if (score >= 80)
    return "bg-green-500/20 text-green-400 border-green-500/30";
  if (score >= 60)
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (score >= 40)
    return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

function recBadgeClass(rec: string) {
  if (rec === "Strong Hire")
    return "border-green-500/50 text-green-400 bg-green-500/10";
  if (rec === "Hire")
    return "border-blue-500/50 text-blue-400 bg-blue-500/10";
  if (rec === "Consider")
    return "border-amber-500/50 text-amber-400 bg-amber-500/10";
  return "border-red-500/50 text-red-400 bg-red-500/10";
}

const statusIcon = (status: string) => {
  if (status === "completed" || status === "offered")
    return <CheckCircle2 className="w-3 h-3 text-green-500" />;
  if (status === "rejected" || status === "withdrawn")
    return <XCircle className="w-3 h-3 text-destructive" />;
  return <Clock className="w-3 h-3 text-amber-500" />;
};

export default function EmployerJobDetails({
  params,
}: {
  params: Promise<{ employerId: string; jobId: string }>;
}) {
  const { employerId, jobId } = use(params);
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [previewApp, setPreviewApp] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetch(`/api/employer/jobs/${jobId}/applications`, {
      credentials: "same-origin",
    })
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setJob(json.job);
        setApplications(json.applications ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError("Could not load candidates for this job.");
        console.error(err);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const handlePublish = async () => {
    if (!job || job.publish_state === "published") return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/employer/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ publishState: "published" }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      setJob((prev: any) =>
        prev ? { ...prev, publish_state: "published" } : prev
      );
    } catch (err) {
      console.error("Failed to publish job", err);
      setPublishError("Could not publish job. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const openPreview = (app: any) => {
    setPreviewApp(app);
    setSheetOpen(true);
  };

  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      const scoreA = a.report?.overall_score ?? -1;
      const scoreB = b.report?.overall_score ?? -1;
      return scoreB - scoreA;
    });
  }, [applications]);

  const completedCount = applications.filter(
    (a) => a.report?.overall_score != null
  ).length;
  const avgScore =
    completedCount > 0
      ? Math.round(
          applications
            .filter((a) => a.report?.overall_score != null)
            .reduce((sum, a) => sum + a.report.overall_score, 0) /
            completedCount
        )
      : 0;
  const topCandidate = sortedApplications[0];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white">
      <header className="px-3 h-20 flex items-center border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <Link
          href={`/employer/${employerId}`}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <SiteLogo href={`/employer/${employerId}`} height={32} />
        </Link>
      </header>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        {/* Job Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {job?.title ?? "Job"}
            </h1>
            <p className="text-slate-400 mt-1">
              {job?.company_name ?? "Company"}
              {job?.category && <span> &bull; {job.category}</span>}
              {job?.location && <span> &bull; {job.location}</span>}
              {" \u2022 "}
              {job?.publish_state === "published"
                ? "Pipeline Active"
                : "Draft"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              asChild
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href={`/employer/${employerId}/jobs/new`}>
                Configure Pipeline
              </Link>
            </Button>
            <Button
              onClick={handlePublish}
              disabled={
                !job || job.publish_state === "published" || isPublishing
              }
              className="bg-blue-600 hover:bg-blue-500 text-white border-0"
            >
              {job?.publish_state === "published"
                ? "Published"
                : isPublishing
                  ? "Publishing..."
                  : "Publish"}
            </Button>
          </div>
        </div>

        {publishError && (
          <div className="mb-4 text-sm text-red-400">{publishError}</div>
        )}

        {/* Stats Row */}
        {!loading && applications.length > 0 && (
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <Card className="bg-slate-900/60 border-white/10">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1">
                    Total Candidates
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {applications.length}
                  </p>
                </div>
                <div className="p-3 bg-blue-600/20 rounded-full text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/60 border-white/10">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1">
                    Reports Ready
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {completedCount}
                    <span className="text-sm text-slate-500 font-normal ml-1">
                      / {applications.length}
                    </span>
                  </p>
                </div>
                <div className="p-3 bg-green-600/20 rounded-full text-green-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/60 border-white/10">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1">
                    Avg. Confidence
                  </p>
                  <p
                    className={`text-2xl font-bold ${avgScore > 0 ? scoreColor(avgScore) : "text-slate-500"}`}
                  >
                    {avgScore > 0 ? `${avgScore}%` : "—"}
                  </p>
                </div>
                <div className="p-3 bg-amber-600/20 rounded-full text-amber-400">
                  <Trophy className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Candidate Quick Select Dropdown */}
        {!loading && sortedApplications.length > 0 && (
          <div className="mb-6 flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 border-white/20 bg-slate-900/60 text-white hover:bg-white/10 hover:text-white"
                >
                  <Users className="w-4 h-4" />
                  Jump to Candidate
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-80 bg-slate-900 border-white/10"
              >
                {sortedApplications.map((a, idx) => (
                  <DropdownMenuItem
                    key={a.id}
                    className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white focus:text-white focus:bg-white/10"
                    onClick={() => openPreview(a)}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="text-xs text-slate-500 w-5">
                        #{idx + 1}
                      </span>
                      <span className="truncate">
                        {a.user?.full_name ?? a.user?.email ?? "Candidate"}
                      </span>
                    </span>
                    {a.report?.overall_score != null && (
                      <Badge
                        className={`ml-2 text-xs ${scoreBadgeClass(a.report.overall_score)}`}
                      >
                        {a.report.overall_score}%
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-xs text-slate-500">
              Sorted by confidence score (highest first)
            </span>
          </div>
        )}

        {/* Candidates List */}
        <Card className="bg-slate-900/60 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5" /> Candidate Reports
            </CardTitle>
            <CardDescription className="text-slate-400">
              Candidates ranked by AI confidence score. Click &ldquo;Preview
              Report&rdquo; to view detailed evaluation with charts and
              analytics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 flex items-center justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading
                candidates&hellip;
              </div>
            ) : loadError ? (
              <div className="py-10 text-sm text-red-400 text-center">
                {loadError}
              </div>
            ) : applications.length === 0 ? (
              <div className="py-10 text-sm text-slate-400 text-center">
                No applications yet.
              </div>
            ) : (
              <div className="space-y-3">
                {sortedApplications.map((a, idx) => {
                  const confidence = a.report?.overall_score ?? null;
                  const rec =
                    a.report?.recommendation ?? a.recommendation ?? null;
                  const name =
                    a.user?.full_name ?? a.user?.email ?? "Candidate";

                  return (
                    <div
                      key={a.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:bg-white/5 ${
                        idx === 0 && confidence != null
                          ? "border-yellow-500/30 bg-yellow-500/5"
                          : "border-white/10"
                      }`}
                    >
                      {/* Rank */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-white/10 text-sm font-bold text-slate-300 shrink-0">
                        {confidence != null ? (
                          idx === 0 ? (
                            <Trophy className="w-4 h-4 text-yellow-400" />
                          ) : (
                            idx + 1
                          )
                        ) : (
                          "—"
                        )}
                      </div>

                      {/* Candidate Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white truncate">
                            {name}
                          </span>
                          {rec && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${recBadgeClass(rec)}`}
                            >
                              {rec}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                          <span>{a.user?.email ?? ""}</span>
                          {a.user?.phone && <span>{a.user.phone}</span>}
                          <span className="flex items-center gap-1">
                            {statusIcon(a.status)}
                            <span className="capitalize">
                              {String(a.status).replace("_", " ")}
                            </span>
                          </span>
                        </div>
                        {a.user?.profile_summary && (
                          <p
                            className="text-xs text-slate-500 mt-1 truncate max-w-md"
                            title={a.user.profile_summary}
                          >
                            {a.user.profile_summary}
                          </p>
                        )}
                      </div>

                      {/* Fit Score */}
                      {a.fit_score != null && (
                        <div className="text-center shrink-0">
                          <p className="text-[10px] text-slate-500 mb-0.5">
                            Fit
                          </p>
                          <Badge
                            className={`text-xs ${scoreBadgeClass(a.fit_score)}`}
                          >
                            {a.fit_score}%
                          </Badge>
                        </div>
                      )}

                      {/* Confidence Score */}
                      <div className="text-center shrink-0 min-w-[80px]">
                        <p className="text-[10px] text-slate-500 mb-0.5">
                          Confidence
                        </p>
                        {confidence != null ? (
                          <span
                            className={`text-2xl font-bold ${scoreColor(confidence)}`}
                          >
                            {confidence}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-600">
                            Pending
                          </span>
                        )}
                      </div>

                      {/* Preview Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!a.report?.report_json}
                        onClick={() => openPreview(a)}
                        className="gap-1.5 border-white/20 bg-transparent text-slate-300 hover:text-white hover:bg-white/10 shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {a.report?.report_json
                          ? "Preview Report"
                          : "No Report"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Report Preview Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl lg:max-w-3xl bg-slate-950 border-white/10 p-0 overflow-hidden"
        >
          <SheetHeader className="px-6 py-4 border-b border-white/10">
            <SheetTitle className="text-white text-lg">
              Candidate Evaluation Report
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-6">
              {previewApp && (
                <CandidateReport
                  application={previewApp}
                  allApplications={sortedApplications}
                  jobTitle={job?.title ?? "Job"}
                />
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
