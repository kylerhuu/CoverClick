import type { JobApplication } from "../../lib/types";
import {
  hubListMetadataLine,
  hubListProgressLine,
  hubListStatusLine,
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
  ccHubListMetadata,
  ccHubListProgress,
  ccHubListStatusApplied,
  ccHubListStatusPreparing,
  ccHubListStatusReady,
  ccOpportunityTitle,
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

function hubStatusLineClass(application: JobApplication): string {
  switch (application.status) {
    case "READY_TO_APPLY":
      return ccHubListStatusReady;
    case "PREPARING":
    case "SAVED":
      return ccHubListStatusPreparing;
    default:
      return ccHubListStatusApplied;
  }
}

export function ApplicationListRow({ application, selected, onClick }: Props) {
  const isPreparing = application.status === "PREPARING" || application.status === "SAVED";
  const progressLine = hubListProgressLine(application);
  const metadata = hubListMetadataLine(application);
  const statusLine = hubListStatusLine(application);
  const showArrow = application.status !== "PREPARING";

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
            "truncate leading-snug",
            ccOpportunityTitle,
            "text-[15px]",
            selected && "font-extrabold",
          )}
        >
          {application.title || "Untitled role"}
        </p>
        <p className="truncate text-[12px] font-medium text-slate-500">
          {application.company || "Unknown company"}
        </p>
        <p className={cn("mt-1 truncate", hubStatusLineClass(application))}>{statusLine}</p>
        {metadata ? <p className={ccHubListMetadata}>{metadata}</p> : null}
        {application.status === "PREPARING" && progressLine ? (
          <p className={ccHubListProgress}>
            <span className="cc-spinner h-2.5 w-2.5 shrink-0 border-[1.5px]" aria-hidden />
            <span className="truncate">{progressLine}</span>
          </p>
        ) : isPreparing && application.status === "SAVED" ? (
          <p className={cn(ccHubListMetadata, "text-amber-700/90")}>Preparing materials…</p>
        ) : null}
      </div>
      {showArrow ? (
        <span className={ccHubListArrow} aria-hidden>
          →
        </span>
      ) : null}
    </button>
  );
}
