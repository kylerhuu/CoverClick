import type { JobApplication } from "../../lib/types";
import {
  hubListMetadataLine,
  hubListProgressLine,
  hubListStatusChipLabel,
} from "../applicationDisplay";
import { cn } from "../../lib/classNames";
import {
  ccFocusRing,
  ccHubCardApplied,
  ccHubCardPreparing,
  ccHubCardReady,
  ccHubListArrow,
  ccHubListArrowWrap,
  ccHubListCard,
  ccHubListCardSelected,
  ccHubListMetadata,
  ccHubListProgress,
  ccHubRowIcon,
  ccHubRowIconPreparing,
  ccHubRowIconReady,
  ccHubStatusChipApplied,
  ccHubStatusChipPreparing,
  ccHubStatusChipReady,
  ccOpportunityCompany,
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

function ReadyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 11L6 8L9 10.5L13 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 5H13V7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PreparingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <path
        d="M8 2.5A5.5 5.5 0 0 1 13.5 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AppliedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 8.5L6.5 11L12 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ApplicationListRow({ application, selected, onClick }: Props) {
  const isReady = application.status === "READY_TO_APPLY";
  const isPreparing = application.status === "PREPARING" || application.status === "SAVED";
  const progressLine = hubListProgressLine(application);
  const metadata = hubListMetadataLine(application);
  const statusChipLabel = hubListStatusChipLabel(application);
  const showStatusChip = Boolean(statusChipLabel);

  const iconBlockClass = isReady
    ? ccHubRowIconReady
    : isPreparing
      ? ccHubRowIconPreparing
      : ccHubRowIcon;

  const statusChipClass = isReady
    ? ccHubStatusChipReady
    : isPreparing
      ? ccHubStatusChipPreparing
      : ccHubStatusChipApplied;

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
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className={iconBlockClass}>
          {isReady ? <ReadyIcon /> : isPreparing ? <PreparingIcon /> : <AppliedIcon />}
        </div>

        <div className="min-w-0 flex-1 text-left">
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
          <p className={cn(ccOpportunityCompany, "mt-0.5 truncate text-[12px]")}>
            {application.company || "Unknown company"}
          </p>
          {metadata ? <p className={cn(ccHubListMetadata, "mt-0.5")}>{metadata}</p> : null}
          {application.status === "PREPARING" && progressLine ? (
            <p className={ccHubListProgress}>
              <span className="cc-spinner h-2.5 w-2.5 shrink-0 border-[1.5px]" aria-hidden />
              <span className="truncate">{progressLine}</span>
            </p>
          ) : isPreparing && application.status === "SAVED" ? (
            <p className={cn(ccHubListMetadata, "mt-0.5 text-amber-700/90")}>Preparing materials…</p>
          ) : null}
        </div>
      </div>

      <div className={ccHubListArrowWrap}>
        {showStatusChip ? <span className={statusChipClass}>{statusChipLabel}</span> : null}
        <span className={ccHubListArrow} aria-hidden>
          →
        </span>
      </div>
    </button>
  );
}
