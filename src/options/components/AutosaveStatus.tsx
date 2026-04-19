import type { ReactNode } from "react";
import { cn } from "../../lib/classNames";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type ServerSyncStatus = "idle" | "syncing" | "ok" | "error";

type Props = {
  profile: SaveStatus;
  settings: SaveStatus;
  server?: ServerSyncStatus;
};

function chip(label: string, tone: "neutral" | "ok" | "busy" | "bad") {
  const tones = {
    neutral: "bg-white/10 text-indigo-50 ring-white/15",
    ok: "bg-emerald-400/15 text-emerald-50 ring-emerald-300/25",
    busy: "bg-amber-400/15 text-amber-50 ring-amber-200/25",
    bad: "bg-red-400/15 text-red-50 ring-red-300/25",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex max-w-[10rem] items-center truncate rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
        tones[tone],
      )}
      title={label}
    >
      {label}
    </span>
  );
}

export function AutosaveStatus({ profile, settings, server = "idle" }: Props) {
  const chips: ReactNode[] = [];

  if (profile === "saving") chips.push(chip("Saving profile", "busy"));
  else if (profile === "saved") chips.push(chip("Profile saved", "ok"));
  else if (profile === "error") chips.push(chip("Profile error", "bad"));

  if (settings === "saving") chips.push(chip("Saving prefs", "busy"));
  else if (settings === "saved") chips.push(chip("Prefs saved", "ok"));
  else if (settings === "error") chips.push(chip("Prefs error", "bad"));

  if (server === "syncing") chips.push(chip("Cloud sync…", "busy"));
  else if (server === "ok") chips.push(chip("Cloud updated", "ok"));
  else if (server === "error") chips.push(chip("Sync issue", "bad"));

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5" aria-live="polite">
      {chips}
    </div>
  );
}
