import type { JobApplication } from "../../lib/types";
import {
  hubListMetadataLine,
  hubListProgressLine,
  hubListStatusLabel,
} from "../applicationDisplay";
import { cn } from "../../lib/classNames";
import {
  ccFocusRing,
  ccHubCardApplied,
  ccHubCardPreparing,
  ccHubCardReady,
  ccHubListArrow,
  ccHubListArrowReady,
  ccHubListCard,
  ccHubListCardSelected,
  ccHubListMetadata,
  ccHubListProgress,
  ccHubStatusPillApplied,
  ccHubStatusPillPreparing,
  ccHubStatusPillReady,
} from "../../ui/ccUi";

type Props = {
  application: JobApplication;
  selected?: boolean;
  onClick: () => void;
};

function hubCardVariantClass(application: JobApplication): string {
  switch (application.status) {
    case "READY_TO_APPLY":
      return ccHubCardReady;
    case "PREPARING":
    case "SAVED":
      return ccHubCardPreparing;
    default:
      return ccHubCardApplied;
  }
}

function statusPillClass(application: JobApplication): string {
  switch (application.status) {
    case "READY_TO_APPLY":
      return ccHubStatusPillReady;
    case "PREPARING":
    case "SAVED":
      return ccHubStatusPillPreparing;
    default:
      return ccHubStatusPillApplied;
  }
}

function statusPillLabel(application: JobApplication): string {
  switch (application.status) {
    case "READY_TO_APPLY":
      return "Ready to apply";
    case "PREPARING":
      return "Preparing";
    case "SAVED":
      return "Saved";
    case "APPLIED":
      return "Applied";
    default:
      return hubListStatusLabel(application);
  }
}

export function ApplicationListRow({ application, selected, onClick }: Props) {
  const isReady = application.status === "READY_TO_APPLY";
  const isPreparing = application.status === "PREPARING" || application.status === "SAVED";
  const progressLine = hubListProgressLine(application);
  const metadata = hubListMetadataLine(application);
  const showArrow = !isPreparing;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        ccHubListCard,
        hubCardVariantClass(application),
        selected && ccHubListCardSelected,
        ccFocusRing,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={statusPillClass(application)}>{statusPillLabel(application)}</span>
          {showArrow ? (
            <span className={isReady ? ccHubListArrowReady : ccHubListArrow} aria-hidden>
              →
            </span>
          ) : null}
        </div>

        <p
          className={cn(
            "mt-2 truncate leading-snug text-slate-900",
            selected ? "text-[14px] font-bold" : "text-[14px] font-semibold",
          )}
        >
          {application.title || "Untitled role"}
        </p>
        <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
          {application.company || "Unknown company"}
        </p>

        {metadata ? <p className={ccHubListMetadata}>{metadata}</p> : null}

        {application.status === "PREPARING" && progressLine ? (
          <p className={ccHubListProgress}>
            <span className="cc-spinner h-2.5 w-2.5 shrink-0 border-[1.5px]" aria-hidden />
            <span className="truncate">{progressLine}</span>
          </p>
        ) : isPreparing && application.status === "SAVED" ? (
          <p className={cn(ccHubListMetadata, "text-amber-700/80")}>Preparing materials…</p>
        ) : null}
      </div>
    </button>
  );
}
