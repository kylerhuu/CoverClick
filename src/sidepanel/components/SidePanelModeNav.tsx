import { cn } from "../../lib/classNames";
import { ccCountBadge, ccFocusRing, ccSidePanelTab, ccSidePanelTabTrack } from "../../ui/ccUi";

export type SidePanelMode = "scan" | "hub";

type Props = {
  mode: SidePanelMode;
  hubCount?: number;
  preparingOnCurrentTab?: boolean;
  onChange: (mode: SidePanelMode) => void;
};

export function SidePanelModeNav({ mode, hubCount, preparingOnCurrentTab, onChange }: Props) {
  return (
    <nav className={cn(ccSidePanelTabTrack, "mx-3 mt-2.5 shrink-0")} role="tablist" aria-label="Side panel mode">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "scan"}
        className={cn(ccSidePanelTab(mode === "scan"), ccFocusRing)}
        onClick={() => onChange("scan")}
      >
        <span className="inline-flex items-center gap-1">
          Current job
          {preparingOnCurrentTab ? (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Preparing in background" aria-hidden />
          ) : null}
        </span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "hub"}
        className={cn(ccSidePanelTab(mode === "hub"), ccFocusRing)}
        onClick={() => onChange("hub")}
      >
        Application Hub
        {hubCount != null && hubCount > 0 ? <span className={ccCountBadge}>{hubCount}</span> : null}
      </button>
    </nav>
  );
}
