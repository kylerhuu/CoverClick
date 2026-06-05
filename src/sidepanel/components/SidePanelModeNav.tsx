import { cn } from "../../lib/classNames";
import { ccFocusRing, ccSegmentTab, ccSegmentTrack } from "../../ui/ccUi";

export type SidePanelMode = "scan" | "hub";

type Props = {
  mode: SidePanelMode;
  hubCount?: number;
  onChange: (mode: SidePanelMode) => void;
};

export function SidePanelModeNav({ mode, hubCount, onChange }: Props) {
  return (
    <nav className={cn(ccSegmentTrack, "mx-3 mt-2 shrink-0")} role="tablist" aria-label="Side panel mode">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "scan"}
        className={cn("min-h-[36px] flex-1", ccSegmentTab(mode === "scan"), ccFocusRing)}
        onClick={() => onChange("scan")}
      >
        Current job
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "hub"}
        className={cn("min-h-[36px] flex-1", ccSegmentTab(mode === "hub"), ccFocusRing)}
        onClick={() => onChange("hub")}
      >
        Application Hub{hubCount != null && hubCount > 0 ? ` (${hubCount})` : ""}
      </button>
    </nav>
  );
}
