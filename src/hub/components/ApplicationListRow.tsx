import type { JobApplication } from "../../lib/types";
import { hubListMetadataLine } from "../applicationDisplay";
import { cn } from "../../lib/classNames";
import { ccFocusRing, ccHubListRow, ccHubListRowSelected } from "../../ui/ccUi";

type Props = {
  application: JobApplication;
  selected?: boolean;
  onClick: () => void;
};

export function ApplicationListRow({ application, selected, onClick }: Props) {
  const metadata = hubListMetadataLine(application);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(ccHubListRow, selected && ccHubListRowSelected, ccFocusRing)}
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
        {metadata ? (
          <p className="mt-1 truncate text-[11px] text-slate-400">{metadata}</p>
        ) : null}
      </div>
      <span
        className={cn(
          "shrink-0 pt-0.5 text-[14px] font-medium leading-none transition-colors duration-100",
          selected ? "text-indigo-400" : "text-slate-300 group-hover:text-slate-400",
        )}
        aria-hidden
      >
        ›
      </span>
    </button>
  );
}
