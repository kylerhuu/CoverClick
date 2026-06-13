import type { JobApplication } from "../../lib/types";
import {
  hubListProgressLine,
  hubListRelativeTime,
  hubListStatusLabel,
} from "../applicationDisplay";
import { cn } from "../../lib/classNames";
import {
  ccFocusRing,
  ccHubCardApplied,
  ccHubCardPreparing,
  ccHubCardReady,
  ccHubListArrow,
  ccHubListCard,
  ccHubListCardSelected,
  ccHubListProgress,
  ccHubListStatusMuted,
  ccHubListStatusPreparing,
  ccHubListStatusReady,
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

function hubStatusRowClass(application: JobApplication): string {
  switch (application.status) {
    case "READY_TO_APPLY":
      return ccHubListStatusReady;
    case "PREPARING":
    case "SAVED":
      return ccHubListStatusPreparing;
    default:
      return ccHubListStatusMuted;
  }
}

export function ApplicationListRow({ application, selected, onClick }: Props) {
  const isPreparing = application.status === "PREPARING" || application.status === "SAVED";
  const statusLabel = hubListStatusLabel(application);
  const progressLine = hubListProgressLine(application);
  const relativeTime = hubListRelativeTime(application);
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
        <p
          className={cn(
            "truncate leading-snug text-slate-900",
            selected ? "text-[14px] font-bold" : "text-[14px] font-semibold",
          )}
        >
          {application.title || "Untitled role"}
        </p>
        <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
          {application.company || "Unknown company"}
        </p>

        {isPreparing ? (
          <div className="mt-2">
            <p className={hubStatusRowClass(application)}>{statusLabel}</p>
            {application.status === "PREPARING" && progressLine ? (
              <p className={ccHubListProgress}>
                <span className="cc-spinner h-2.5 w-2.5 shrink-0 border-[1.5px]" aria-hidden />
                <span className="truncate">{progressLine}</span>
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between gap-2">
            <p
              className={cn(
                "truncate",
                application.status === "READY_TO_APPLY" && "uppercase",
                hubStatusRowClass(application),
              )}
            >
              {statusLabel}
            </p>
            {showArrow ? (
              <span className={ccHubListArrow} aria-hidden>
                →
              </span>
            ) : null}
          </div>
        )}

        {relativeTime ? (
          <p className="mt-1 truncate text-[10px] text-slate-400">{relativeTime}</p>
        ) : null}
      </div>
    </button>
  );
}
