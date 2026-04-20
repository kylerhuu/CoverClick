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
  ccBtnDangerOutlineSm,
  ccBtnPrimarySm,
  ccBtnSecondarySm,
  ccEyebrow,
  ccMuted,
  ccSectionTitle,
  ccSurfaceQuiet,
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
  /** After auto-import, switch to Profile (or stay on import for manual review). */
  onNavigateToTab?: (tab: OptionsMainTab) => void;
};

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
      <div className="space-y-3">
        <header>
          <p className={ccEyebrow}>Import</p>
          <h2 className={cn(ccSectionTitle, "mt-1")}>Resume → profile</h2>
        </header>
        <p className={cn(ccMuted, "text-[13px]")}>
          {import.meta.env.PROD ? (
            <>Sign in with an active plan from the side panel to import a resume with AI.</>
          ) : (
            <>
              Turn off demo mode in <strong>Cloud & billing</strong> to import a resume with AI.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className={ccEyebrow}>Import</p>
        <h2 className={cn(ccSectionTitle, "mt-1")}>Fill fields from a resume</h2>
        <p className={cn(ccMuted, "mt-2 max-w-2xl")}>
          Upload a file and we will suggest profile fields. Layouts vary — always double-check before you apply.
        </p>
      </header>

      {!canNetwork ? (
        <p className="rounded-lg border border-amber-200/70 bg-amber-50/50 px-3 py-2 text-[12px] text-amber-950">
          Sign in with an active plan in the side panel to use resume import.
        </p>
      ) : null}

      <ResumeExtractionProgress active={resumeBusy} outcome={extractOutcome} />

      <div className={cn(ccSurfaceQuiet, "space-y-4 px-4 py-4")}>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">File</label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            disabled={!canNetwork || resumeBusy}
            className="mt-1.5 block w-full text-[12px] text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-slate-800 hover:file:bg-slate-200/80"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={ccBtnPrimarySm}
            disabled={!canNetwork || resumeBusy}
            onClick={() => void onParseResume()}
          >
            {resumeBusy ? (
              <>
                <span className="cc-spinner h-4 w-4 shrink-0 border-2" aria-hidden />
                Extracting…
              </>
            ) : (
              "Extract with AI"
            )}
          </button>
        </div>
        {resumeMsg ? (
          <p className="text-[12px] leading-snug text-slate-600" role="status">
            {resumeMsg}
          </p>
        ) : null}
      </div>

      {lastExtracted && conflicts.length > 0 ? (
        <>
          <ResumeImportComparePanel conflicts={conflicts} />
          <div className={cn(ccSurfaceQuiet, "flex flex-wrap gap-2 px-4 py-3")}>
            <button type="button" className={ccBtnSecondarySm} disabled={resumeBusy} onClick={onMerge}>
              Merge into profile
            </button>
            <button type="button" className={ccBtnDangerOutlineSm} disabled={resumeBusy} onClick={onReplace}>
              Replace entire profile
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
