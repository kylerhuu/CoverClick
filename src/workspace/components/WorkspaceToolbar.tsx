import { cn } from "../../lib/classNames";
import {
  ccFocusRing,
  ccSidePanelTab,
  ccSidePanelTabTrack,
  ccWorkspaceActionLink,
  ccWorkspaceToolbar,
} from "../../ui/ccUi";
import type { WorkspaceTab } from "../workspaceLayout";

type Props = {
  scrapeBusy: boolean;
  onRescan: () => void;
  /** When false, hides Re-scan (saved application mode). */
  showRescan?: boolean;
  /** Resume Studio only — hides job/letter/split tabs. */
  resumeOnlyMode?: boolean;
  workspaceTab: WorkspaceTab;
  onWorkspaceTabChange: (tab: WorkspaceTab) => void;
  onOpenProfile: () => void;
};

const segments: { id: WorkspaceTab; label: string; title: string }[] = [
  { id: "letter", label: "Letter", title: "Cover letter preview" },
  { id: "split", label: "Split", title: "Job posting and letter together" },
  { id: "job", label: "Job", title: "Full-width job posting" },
  { id: "resume", label: "Resume", title: "Resume Studio" },
];

export function WorkspaceToolbar({
  scrapeBusy,
  onRescan,
  showRescan = true,
  resumeOnlyMode = false,
  workspaceTab,
  onWorkspaceTabChange,
  onOpenProfile,
}: Props) {
  const visibleSegments = resumeOnlyMode ? segments.filter((s) => s.id === "resume") : segments;

  return (
    <div className={ccWorkspaceToolbar}>
      {!resumeOnlyMode ? (
        <div className={cn(ccSidePanelTabTrack, "shrink-0")} role="tablist" aria-label="Workspace layout">
          {visibleSegments.map((s) => {
            const active = workspaceTab === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                title={s.title}
                onClick={() => onWorkspaceTabChange(s.id)}
                className={cn(ccSidePanelTab(active), "flex-none px-2.5", ccFocusRing)}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      ) : (
        <span className="text-[12px] font-medium text-slate-500">Resume</span>
      )}

      <div className="flex shrink-0 items-center gap-3">
        {showRescan ? (
          <button type="button" className={ccWorkspaceActionLink} onClick={onRescan} disabled={scrapeBusy}>
            {scrapeBusy ? "Scanning…" : "Re-scan"}
          </button>
        ) : null}
        {!resumeOnlyMode ? (
          <button type="button" className={ccWorkspaceActionLink} onClick={onOpenProfile}>
            Profile
          </button>
        ) : null}
      </div>
    </div>
  );
}
