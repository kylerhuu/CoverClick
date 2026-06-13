import type { JobApplication } from "../../lib/types";
import { formatRelativeDate } from "../../lib/jobSource";
import {
  hubListMetadataLine,
  statusBadgeLabel,
  statusListTextClass,
} from "../applicationDisplay";
import { cn } from "../../lib/classNames";
import { ccFocusRing, ccHubListRow, ccHubListRowSelected } from "../../ui/ccUi";

function statusDotClass(status: JobApplication["status"]): string {
  switch (status) {
    case "READY_TO_APPLY":
      return "bg-emerald-500";
    case "PREPARING":
    case "SAVED":
      return "bg-amber-400";
    case "APPLIED":
    case "INTERVIEWING":
    case "OFFER":
      return "bg-sky-500";
    default:
      return "bg-slate-300";
  }
}

type Props = {
  application: JobApplication;
  selected?: boolean;
  onClick: () => void;
};

export function ApplicationListRow({ application, selected, onClick }: Props) {
  const metadata = hubListMetadataLine(application);
  const relativeDate = formatRelativeDate(application.dateSaved);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left",
        ccHubListRow,
        selected && ccHubListRowSelected,
        ccFocusRing,
      )}
    >
      <p className={cn("text-[10px] font-semibold uppercase tracking-wide", statusListTextClass(application.status))}>
        <span
          className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle", statusDotClass(application.status))}
          aria-hidden
        />
        {statusBadgeLabel(application)}
      </p>

      <p className="mt-1 truncate text-[14px] font-semibold leading-snug text-slate-900">
        {application.title || "Untitled role"}
      </p>
      <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
        {application.company || "Unknown company"}
      </p>

      <p className="mt-1 truncate text-[11px] text-slate-400">
        {[metadata, relativeDate].filter(Boolean).join(" · ")}
      </p>
    </button>
  );
}
