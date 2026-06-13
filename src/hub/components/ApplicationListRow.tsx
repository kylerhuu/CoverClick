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
      <p className="truncate text-[14px] font-semibold leading-snug text-slate-900">
        {application.title || "Untitled role"}
      </p>
      <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
        {application.company || "Unknown company"}
      </p>
      {metadata ? (
        <p className="mt-1 truncate text-[11px] text-slate-400">{metadata}</p>
      ) : null}
    </button>
  );
}
