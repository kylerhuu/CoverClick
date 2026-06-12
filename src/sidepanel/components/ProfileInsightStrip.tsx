import { useEffect, useState } from "react";
import type { UserProfile } from "../../lib/types";
import { EMPTY_PROFILE } from "../../lib/types";
import { profileCompleteness } from "../../lib/profileCompleteness";
import { STORAGE_KEYS, loadProfile } from "../../lib/storage";
import { cn } from "../../lib/classNames";

type Props = {
  className?: string;
};

export function ProfileInsightStrip({ className }: Props) {
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

  const { score, missingLabels } = profileCompleteness(profile);
  const tone =
    score >= 75 ? "text-emerald-700 ring-emerald-200/60 bg-emerald-50/80" : score >= 45 ? "text-amber-800 ring-amber-200/60 bg-amber-50/80" : "text-slate-600 ring-slate-200/60 bg-slate-50/80";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 ring-1",
        tone,
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide">Profile readiness</p>
        <p className="mt-0.5 text-[11px] font-medium leading-snug">
          {score}% complete
          {missingLabels.length > 0 ? (
            <span className="text-[10px] font-normal opacity-80"> · add {missingLabels.slice(0, 2).join(", ")}</span>
          ) : null}
        </p>
      </div>
      <span className="shrink-0 text-[15px] font-bold tabular-nums">{score}%</span>
    </div>
  );
}
