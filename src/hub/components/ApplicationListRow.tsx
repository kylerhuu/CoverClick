import type { JobApplication } from "../../lib/types";
import { formatRelativeDate } from "../../lib/jobSource";
import {
  coverLetterStatus,
  fitScoreChipClass,
  fitScoreLabel,
  fitScoreTone,
  letterChipClass,
  statusBadgeLabel,
  statusPillClass,
} from "../applicationDisplay";
import { cn } from "../../lib/classNames";
import { ccFocusRing, ccHubCard, ccHubCardSelected, ccMetaChip, ccStatusPill } from "../../ui/ccUi";

type Props = {
  application: JobApplication;
  selected?: boolean;
  onClick: () => void;
};

export function ApplicationListRow({ application, selected, onClick }: Props) {
  const fit = fitScoreLabel(application);
  const fitTone = fitScoreTone(application);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("w-full", ccHubCard, selected && ccHubCardSelected, ccFocusRing)}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={ccStatusPill(statusPillClass(application.status))}>{statusBadgeLabel(application)}</span>
        <span className="shrink-0 text-[9px] font-medium text-slate-400">{formatRelativeDate(application.dateSaved)}</span>
      </div>

      <div className="mt-2.5 min-w-0">
        <p className="truncate text-[14px] font-bold leading-snug text-slate-900">
          {application.title || "Untitled role"}
        </p>
        <p className="mt-0.5 truncate text-[12px] font-semibold text-indigo-700">
          {application.company || "Unknown company"}
        </p>
        {application.source ? (
          <p className="mt-1 truncate text-[10px] text-slate-500">{application.source}</p>
        ) : null}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className={ccMetaChip(letterChipClass(application))}>{coverLetterStatus(application)}</span>
        {fit ? (
          <span className={ccMetaChip(fitScoreChipClass(fitTone))}>{fit} fit</span>
        ) : (
          <span className={ccMetaChip(fitScoreChipClass("muted"))}>Fit —</span>
        )}
      </div>
    </button>
  );
}
