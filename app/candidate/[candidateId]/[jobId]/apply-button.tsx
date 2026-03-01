"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCircle,
} from "lucide-react";

const CONFIDENCE_THRESHOLD = 75;

interface Props {
  jobId: string;
  candidateId: string;
  resumeText?: string;
}

export function ApplyButton({ jobId, candidateId, resumeText }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<
    "idle" | "checking-profile" | "assessing" | "result" | "applying"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [confidenceResult, setConfidenceResult] = useState<any>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const meetsThreshold =
    confidenceResult &&
    confidenceResult.confidenceScore >= CONFIDENCE_THRESHOLD;

  const handleCheckFit = async () => {
    setError(null);
    setStep("checking-profile");

    try {
      const profileRes = await fetch("/api/candidate/profile", {
        credentials: "same-origin",
      });
      if (!profileRes.ok) throw new Error("Could not load your profile.");
      const { profile } = await profileRes.json();

      if (
        !profile ||
        !(profile.technical_skills?.length > 0) ||
        !profile.current_title
      ) {
        setHasProfile(false);
        setStep("result");
        return;
      }

      setHasProfile(true);
      setStep("assessing");

      const res = await fetch("/api/candidate/confidence-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as any).error || `Could not assess your fit (HTTP ${res.status})`
        );
      }
      const result = await res.json();
      setConfidenceResult(result);
      setStep("result");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
      setStep("idle");
    }
  };

  const handleApply = async () => {
    if (!confidenceResult) return;
    setStep("applying");
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          formData: { resumeText: resumeText || null },
          fitResult: {
            fitScore: confidenceResult.confidenceScore,
            matchedSkills: confidenceResult.matchedSkills,
            missingSkills: confidenceResult.missingSkills,
          },
          confidenceAssessment: confidenceResult,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || `HTTP ${res.status}`);
      }
      // Redirect to this job's get-started page so user can proceed to interview or go back
      router.push(`/candidate/${candidateId}/${jobId}`);
    } catch (err: any) {
      console.error("Apply error", err);
      setError(err.message ?? "Failed to apply. Please try again.");
      setStep("result");
    }
  };

  if (step === "idle") {
    return (
      <div className="flex flex-col items-end gap-2">
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-2">
            {error}
          </p>
        )}
        <Button
          size="lg"
          className="px-10 h-12 text-lg font-bold gap-2 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-600/30"
          onClick={handleCheckFit}
        >
          <Sparkles className="w-5 h-5" /> Check My Fit & Apply
        </Button>
      </div>
    );
  }

  if (step === "checking-profile" || step === "assessing") {
    return (
      <div className="w-full max-w-md ml-auto space-y-3">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          {step === "checking-profile"
            ? "Checking your profile..."
            : "AI is assessing your fit for this role..."}
        </div>
        <Progress value={step === "checking-profile" ? 30 : 70} className="h-2 bg-slate-700" />
      </div>
    );
  }

  if (step === "applying") {
    return (
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
        Submitting your application...
      </div>
    );
  }

  if (hasProfile === false) {
    return (
      <div className="w-full space-y-4">
        <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-yellow-400">
                Profile Incomplete
              </h4>
              <p className="text-sm text-yellow-300/80 mt-1">
                Please complete your profile before applying. hireLens uses
                your profile data to match you with jobs and assess your
                suitability.
              </p>
              <Button
                asChild
                size="sm"
                className="mt-3 bg-yellow-600 hover:bg-yellow-500 text-white border-0"
              >
                <Link href={`/candidate/${candidateId}/profile`}>
                  <UserCircle className="w-4 h-4 mr-1.5" /> Complete Profile
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {confidenceResult && (
        <div
          className={`p-4 rounded-lg border ${
            meetsThreshold
              ? "border-green-500/30 bg-green-500/10"
              : "border-red-500/30 bg-red-500/10"
          }`}
        >
          <div className="flex items-start gap-3">
            {meetsThreshold ? (
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 space-y-3">
              <div>
                <h4
                  className={`font-semibold ${meetsThreshold ? "text-green-400" : "text-red-400"}`}
                >
                  Confidence Score: {confidenceResult.confidenceScore}%
                </h4>
                <p
                  className={`text-sm mt-1 ${meetsThreshold ? "text-green-300/80" : "text-red-300/80"}`}
                >
                  {confidenceResult.overallAssessment}
                </p>
              </div>

              <div className="w-full">
                <Progress
                  value={confidenceResult.confidenceScore}
                  className={`h-2 ${meetsThreshold ? "bg-green-900" : "bg-red-900"}`}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {confidenceResult.matchedSkills?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-white mb-1">
                      Matched Skills
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {confidenceResult.matchedSkills.map((s: string) => (
                        <Badge
                          key={s}
                          className="bg-green-500/20 text-green-300 border-green-500/30 text-xs"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {confidenceResult.missingSkills?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-white mb-1">
                      Gaps
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {confidenceResult.missingSkills.map((s: string) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="border-red-500/30 text-red-300 text-xs"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {confidenceResult.experienceMatch && (
                <p className="text-xs text-slate-400">
                  {confidenceResult.experienceMatch}
                </p>
              )}

              {!meetsThreshold && (
                <div className="space-y-2">
                  <p className="text-sm text-red-300/80">
                    Thank you for your interest in this position. Based on our
                    AI assessment, your current profile doesn&apos;t meet the
                    minimum match threshold of {CONFIDENCE_THRESHOLD}% required
                    to proceed with the interview process.
                  </p>
                  <p className="text-sm text-slate-400">
                    We encourage you to strengthen the skills listed as gaps
                    above, update your profile with any recent experience, and
                    check back for other opportunities that might be a better
                    fit. We wish you the best in your career journey.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-3">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 justify-end">
        {meetsThreshold && (
          <Button
            size="lg"
            className="px-10 h-12 text-lg font-bold gap-2 bg-green-600 hover:bg-green-500 text-white border-0 shadow-lg shadow-green-600/30"
            onClick={handleApply}
          >
            Apply Now <ArrowRight className="w-5 h-5" />
          </Button>
        )}
        {!meetsThreshold && confidenceResult && (
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              className="border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <Link href={`/candidate/${candidateId}/profile`}>
                Improve Profile
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <Link href="/candidate/jobs">Browse Other Jobs</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
