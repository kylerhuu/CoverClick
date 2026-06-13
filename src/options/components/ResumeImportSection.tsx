import type { Dispatch, SetStateAction } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { AppSettings, UserProfile } from "../../lib/types";
import { apiParseResume } from "../../lib/backendApi";
import { mergeProfileFromExtraction, replaceProfileFromExtraction } from "../../lib/mergeProfile";
import { compactProfileArrays } from "../../lib/profileArrays";
import {
  getProfileImportConflicts,
  isProfileImportBaselineEmpty,
} from "../../lib/profileImportReview";
import { cn } from "../../lib/classNames";
import {
  WorkspaceCard,
  WorkspaceHero,
  WorkspaceSection,
  wsHeroName,
  wsPageIntro,
} from "../../ui/workspaceUi";
import {
  ccBtnDangerOutlineSm,
  ccBtnPrimary,
  ccBtnSecondarySm,
} from "../../ui/ccUi";
import type { OptionsMainTab } from "./OptionsSectionNav";
import { ResumeExtractionProgress, type ResumeExtractionOutcome } from "./ResumeExtractionProgress";
import { ResumeImportComparePanel } from "./ResumeImportComparePanel";

type Props = {
  settings: AppSettings;
  profile: UserProfile;
  setProfile: Dispatch<SetStateAction<UserProfile>>;
  hydrated: boolean;
  serverFeaturesEnabled: boolean;
  onNavigateToTab?: (tab: OptionsMainTab) => void;
};

const STEPS = [
  "Extract profile information",
  "Create a resume version",
  "Fill profile fields",
  "Generate skills",
] as const;

export function ResumeImportSection({
  settings,
  profile,
  setProfile,
  hydrated,
  serverFeaturesEnabled,
  onNavigateToTab,
}: Props) {
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeMsg, setResumeMsg] = useState<string | null>(null);
  const [lastExtracted, setLastExtracted] = useState<UserProfile | null>(null);
  const [extractOutcome, setExtractOutcome] = useState<ResumeExtractionOutcome>("neutral");
  const fileRef = useRef<HTMLInputElement>(null);

  const base = settings.apiBaseUrl.trim();
  const token = settings.authToken?.trim();
  const canNetwork = hydrated && serverFeaturesEnabled && base.length > 0 && Boolean(token);

  const conflicts = useMemo(
    () => (lastExtracted ? getProfileImportConflicts(profile, lastExtracted) : []),
    [profile, lastExtracted],
  );

  const onParseResume = useCallback(async () => {
    if (!canNetwork || !token) return;
    const input = fileRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setResumeMsg("Choose a PDF, DOCX, or TXT file first.");
      return;
    }

    setExtractOutcome("neutral");
    setResumeBusy(true);
    setResumeMsg(null);
    setLastExtracted(null);

    let ok = false;
    try {
      const { profile: extractedRaw, warnings } = await apiParseResume(base, token, file);
      const extracted = compactProfileArrays(extractedRaw);
      ok = true;

      const warnText = warnings?.length ? warnings.join(" ") : "";
      const baselineEmpty = isProfileImportBaselineEmpty(profile);
      const fieldConflicts = getProfileImportConflicts(profile, extracted);

      if (baselineEmpty) {
        setProfile(compactProfileArrays(replaceProfileFromExtraction(extracted)));
        setLastExtracted(null);
        setResumeMsg(
          [warnText, "Your profile was empty — we filled every section from your resume. Review the Profile tab."].filter(Boolean).join(" "),
        );
        onNavigateToTab?.("profile");
        return;
      }

      if (fieldConflicts.length === 0) {
        setProfile(compactProfileArrays(mergeProfileFromExtraction(profile, extracted)));
        setLastExtracted(null);
        setResumeMsg(
          [warnText, "No conflicting fields — we merged resume suggestions into your profile. Review the Profile tab."].filter(Boolean).join(" "),
        );
        onNavigateToTab?.("profile");
        return;
      }

      setLastExtracted(extracted);
      setResumeMsg(
        [warnText, "Compare your current values with the import below, then choose Merge or Replace all."].filter(Boolean).join(" "),
      );
    } catch (e) {
      setLastExtracted(null);
      setResumeMsg(e instanceof Error ? e.message : "Import failed");
    } finally {
      setResumeBusy(false);
      setExtractOutcome(ok ? "success" : "error");
    }
  }, [base, canNetwork, onNavigateToTab, profile, setProfile, token]);

  const onMerge = useCallback(() => {
    if (!lastExtracted) return;
    setProfile(compactProfileArrays(mergeProfileFromExtraction(profile, lastExtracted)));
    setLastExtracted(null);
    setResumeMsg("Merged import into your profile. Autosave will run — review the Profile tab.");
    onNavigateToTab?.("profile");
  }, [lastExtracted, onNavigateToTab, profile, setProfile]);

  const onReplace = useCallback(() => {
    if (!lastExtracted) return;
    setProfile(compactProfileArrays(replaceProfileFromExtraction(lastExtracted)));
    setLastExtracted(null);
    setResumeMsg("Replaced your profile with this import. Autosave will run — review the Profile tab.");
    onNavigateToTab?.("profile");
  }, [lastExtracted, onNavigateToTab, setProfile]);

  if (settings.useMock) {
    return (
      <div className="cc-fade-in mt-4 space-y-4">
        <WorkspaceHero>
          <h2 className={wsHeroName}>Import resume</h2>
          <p className={cn(wsPageIntro, "mt-1")}>
            {import.meta.env.PROD ? (
              <>Sign in with an active plan from the side panel to import a resume with AI.</>
            ) : (
              <>Turn off demo mode under Cloud & billing to import a resume with AI.</>
            )}
          </p>
        </WorkspaceHero>
      </div>
    );
  }

  return (
    <div className="cc-fade-in mt-4 space-y-6">
      <WorkspaceHero>
        <h2 className={wsHeroName}>Import resume</h2>
        <p className={cn(wsPageIntro, "mt-1 max-w-xl")}>
          The fastest way to get started — upload your resume and we&apos;ll extract profile fields automatically.
        </p>
      </WorkspaceHero>

      {!canNetwork ? (
        <p className="rounded-lg border border-amber-200/70 bg-amber-50/50 px-3 py-2 text-[12px] text-amber-950">
          Sign in with an active plan in the side panel to use resume import.
        </p>
      ) : null}

      <ResumeExtractionProgress active={resumeBusy} outcome={extractOutcome} />

      <WorkspaceCard className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Drop your resume here</p>
        <p className="mt-1 text-[13px] font-medium text-slate-700">PDF · DOCX · TXT</p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          disabled={!canNetwork || resumeBusy}
          className="mx-auto mt-4 block w-full max-w-sm text-[12px] text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-[#5B4CF0]/10 file:px-4 file:py-2 file:text-[12px] file:font-semibold file:text-[#5B4CF0] hover:file:bg-[#5B4CF0]/15"
        />
        <button
          type="button"
          className={cn(ccBtnPrimary, "mt-4")}
          disabled={!canNetwork || resumeBusy}
          onClick={() => void onParseResume()}
        >
          {resumeBusy ? (
            <>
              <span className="cc-spinner h-4 w-4 shrink-0 border-2 border-white/30 border-t-white" aria-hidden />
              Extracting…
            </>
          ) : (
            "Upload resume"
          )}
        </button>
        {resumeMsg ? (
          <p className="mt-4 text-left text-[12px] leading-snug text-slate-600" role="status">
            {resumeMsg}
          </p>
        ) : null}
      </WorkspaceCard>

      <WorkspaceSection title="What happens next?" description="After upload, CoverClick will:">
        <WorkspaceCard>
          <ul className="space-y-2.5">
            {STEPS.map((step) => (
              <li key={step} className="flex items-center gap-2.5 text-[13px] text-slate-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22C55E]/15 text-[11px] font-bold text-[#22C55E]">
                  ✓
                </span>
                {step}
              </li>
            ))}
          </ul>
        </WorkspaceCard>
      </WorkspaceSection>

      {lastExtracted && conflicts.length > 0 ? (
        <>
          <ResumeImportComparePanel conflicts={conflicts} />
          <WorkspaceCard className="flex flex-wrap gap-2">
            <button type="button" className={ccBtnSecondarySm} disabled={resumeBusy} onClick={onMerge}>
              Merge into profile
            </button>
            <button type="button" className={ccBtnDangerOutlineSm} disabled={resumeBusy} onClick={onReplace}>
              Replace entire profile
            </button>
          </WorkspaceCard>
        </>
      ) : null}
    </div>
  );
}
