import { useEffect, useState } from "react";
import type { UserProfile } from "../../lib/types";
import { EMPTY_PROFILE } from "../../lib/types";
import { isProfileReadyForGeneration, profileSetupSteps } from "../../lib/profileReadiness";
import { requestOptionsTab } from "../../lib/openOptionsTab";
import { STORAGE_KEYS, loadProfile } from "../../lib/storage";
import { cn } from "../../lib/classNames";
import { ccBtnPrimary, ccFocusRing } from "../../ui/ccUi";

type Props = {
  className?: string;
  /** When set, navigation stays inside Options instead of opening a new tab. */
  onOpenImport?: () => void;
  onOpenProfile?: () => void;
};

export function ProfileSetupGuide({ className, onOpenImport, onOpenProfile }: Props) {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);

  useEffect(() => {
    void loadProfile().then(setProfile);
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local") return;
      if (changes[STORAGE_KEYS.profile]) void loadProfile().then(setProfile);
    };
    chrome.storage.onChanged.addListener(onStorage);
    return () => chrome.storage.onChanged.removeListener(onStorage);
  }, []);

  if (isProfileReadyForGeneration(profile)) return null;

  const steps = profileSetupSteps(profile);
  const nextStep = steps.find((s) => !s.done) ?? steps[1];

  const openStep = (id: "import" | "review") => {
    if (id === "import") {
      if (onOpenImport) onOpenImport();
      else void requestOptionsTab("import");
      return;
    }
    if (onOpenProfile) onOpenProfile();
    else void requestOptionsTab("profile");
  };

  return (
    <section
      className={cn(
        "rounded-xl border border-indigo-200/70 bg-gradient-to-b from-indigo-50/90 to-white px-3.5 py-3 shadow-sm",
        className,
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-800">Get started</p>
      <p className="mt-1 text-[13px] font-semibold leading-snug text-slate-900">
        Set up your profile before generating letters
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
        CoverClick uses your profile and resume to draft tailored cover letters. Import once, review, then apply to jobs.
      </p>

      <ol className="mt-3 space-y-2">
        {steps.map((step, index) => (
          <li key={step.id} className="flex gap-2.5">
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                step.done ? "bg-emerald-100 text-emerald-800" : "bg-white text-indigo-700 ring-1 ring-indigo-200",
              )}
              aria-hidden
            >
              {step.done ? "✓" : index + 1}
            </span>
            <div className="min-w-0">
              <p className={cn("text-[12px] font-semibold", step.done ? "text-slate-500" : "text-slate-900")}>
                {step.title}
              </p>
              {!step.done ? (
                <p className="text-[11px] leading-snug text-slate-500">{step.description}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap gap-2">
        {nextStep.id === "import" || !steps[0].done ? (
          <button type="button" className={cn(ccBtnPrimary, "px-3 py-1.5 text-[12px]")} onClick={() => openStep("import")}>
            Import resume
          </button>
        ) : null}
        {nextStep.id === "review" || (steps[0].done && !steps[1].done) ? (
          <button
            type="button"
            className={cn(
              "rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-indigo-800 hover:bg-indigo-50/80",
              ccFocusRing,
            )}
            onClick={() => openStep("review")}
          >
            Open profile
          </button>
        ) : null}
      </div>
    </section>
  );
}
