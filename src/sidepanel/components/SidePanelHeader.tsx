import { useEffect, useState } from "react";
import { loadProfile, loadSettings } from "../../lib/storage";
import { cn } from "../../lib/classNames";
import { ccProfileChip } from "../../ui/ccUi";

function initialsFromProfile(fullName: string, email: string): string {
  const name = fullName.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email.trim()) return email.trim().slice(0, 2).toUpperCase();
  return "?";
}

export function SidePanelHeader() {
  const [iconFailed, setIconFailed] = useState(false);
  const [initials, setInitials] = useState("?");
  const src =
    typeof chrome !== "undefined" && chrome.runtime?.id != null
      ? chrome.runtime.getURL("icons/coverclick-icon.png")
      : "";

  useEffect(() => {
    void (async () => {
      const [profile, settings] = await Promise.all([loadProfile(), loadSettings()]);
      setInitials(initialsFromProfile(profile.fullName, settings.authEmail ?? profile.email));
    })();
  }, []);

  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2",
        "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-[0_4px_20px_rgba(15,23,42,0.28)]",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {iconFailed || !src ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-sky-400 text-[12px] font-black shadow-lg shadow-indigo-950/30">
            CC
          </div>
        ) : (
          <img
            src={src}
            alt=""
            className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-lg shadow-indigo-950/30"
            onError={() => setIconFailed(true)}
          />
        )}
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold tracking-tight">CoverClick</h1>
          <p className="truncate text-[10px] font-medium tracking-wide text-indigo-100/75">Browse • Save • Apply</p>
        </div>
      </div>
      <button
        type="button"
        title="Open profile & settings"
        className={ccProfileChip}
        onClick={() => void chrome.runtime.openOptionsPage()}
      >
        <span aria-hidden>{initials}</span>
        <span className="sr-only">Profile</span>
      </button>
    </header>
  );
}
