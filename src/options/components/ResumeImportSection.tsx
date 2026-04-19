import type { Dispatch, SetStateAction } from "react";
import { useCallback, useRef, useState } from "react";
import type { AppSettings, UserProfile } from "../../lib/types";
import { apiParseResume } from "../../lib/backendApi";
import { mergeProfileFromExtraction, replaceProfileFromExtraction } from "../../lib/mergeProfile";
import { cn } from "../../lib/classNames";
import { ccBtnDangerOutlineSm, ccBtnPrimarySm, ccBtnSecondarySm, ccEyebrow, ccMuted, ccSectionTitle, ccSurfaceQuiet } from "../../ui/ccUi";

type Props = {
  settings: AppSettings;
  profile: UserProfile;
  setProfile: Dispatch<SetStateAction<UserProfile>>;
  hydrated: boolean;
  serverFeaturesEnabled: boolean;
};

export function ResumeImportSection({ settings, profile, setProfile, hydrated, serverFeaturesEnabled }: Props) {
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeMsg, setResumeMsg] = useState<string | null>(null);
  const [lastExtracted, setLastExtracted] = useState<UserProfile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const base = settings.apiBaseUrl.trim();
  const token = settings.authToken?.trim();
  const canNetwork = hydrated && serverFeaturesEnabled && base.length > 0 && Boolean(token);

  const onParseResume = useCallback(async () => {
    if (!canNetwork || !token) return;
    const input = fileRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setResumeMsg("Choose a PDF, DOCX, or TXT file first.");
      return;
    }
    setResumeBusy(true);
    setResumeMsg(null);
    try {
      const { profile: extracted, warnings } = await apiParseResume(base, token, file);
      setLastExtracted(extracted);
      setResumeMsg(
        ["Extraction complete — review carefully, then merge or replace.", ...(warnings?.length ? warnings : [])].join(
          " ",
        ),
      );
    } catch (e) {
      setLastExtracted(null);
      setResumeMsg(e instanceof Error ? e.message : "Import failed");
    } finally {
      setResumeBusy(false);
    }
  }, [base, canNetwork, token]);

  if (settings.useMock) {
    return (
      <div className="space-y-3">
        <header>
          <p className={ccEyebrow}>Import</p>
          <h2 className={cn(ccSectionTitle, "mt-1")}>Resume → profile</h2>
        </header>
        <p className={cn(ccMuted, "text-[13px]")}>
          Turn off demo mode in <strong>Cloud & billing</strong> to import a resume with AI.
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
          <button
            type="button"
            className={ccBtnSecondarySm}
            disabled={!lastExtracted}
            onClick={() => {
              if (!lastExtracted) return;
              setProfile(mergeProfileFromExtraction(profile, lastExtracted));
              setResumeMsg("Merged into your profile. Autosave will run.");
            }}
          >
            Merge
          </button>
          <button
            type="button"
            className={ccBtnDangerOutlineSm}
            disabled={!lastExtracted}
            onClick={() => {
              if (!lastExtracted) return;
              setProfile(replaceProfileFromExtraction(lastExtracted));
              setResumeMsg("Replaced profile from extraction. Autosave will run.");
            }}
          >
            Replace all
          </button>
        </div>
        {resumeMsg ? (
          <p className="text-[12px] leading-snug text-slate-600" role="status">
            {resumeMsg}
          </p>
        ) : null}
      </div>
    </div>
  );
}
