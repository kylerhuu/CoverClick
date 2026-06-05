import type { JobApplication, JobApplicationStatus } from "../../lib/types";
import { jobApplicationStatusLabel } from "../../lib/types";
import { formatRelativeDate } from "../../lib/jobSource";
import { cn } from "../../lib/classNames";
import { ccBtnSecondarySm, ccSurfaceQuiet } from "../../ui/ccUi";

type Props = {
  application: JobApplication;
  onOpenJob: (url: string) => void;
  onViewMaterials: (app: JobApplication) => void;
  onStatusChange: (id: string, status: JobApplicationStatus) => void;
  statusBusy?: boolean;
};

export function ApplicationJobCard({
  application,
  onOpenJob,
  onViewMaterials,
  onStatusChange,
  statusBusy,
}: Props) {
  const coverStatus = application.coverLetterDraft
    ? "Draft ready"
    : application.status === "PREPARING"
      ? "Generating…"
      : "None";

  return (
    <article className={cn(ccSurfaceQuiet, "flex flex-col gap-2.5 p-3")}>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-bold text-slate-900">{application.title || "Untitled role"}</p>
        <p className="truncate text-[11px] font-medium text-indigo-700">{application.company || "Unknown company"}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-600">
        <span>
          Fit:{" "}
          <strong className="text-slate-800">
            {application.fitScore != null ? `${application.fitScore}%` : "—"}
          </strong>
        </span>
        <span>
          Letter: <strong className="text-slate-800">{coverStatus}</strong>
        </span>
        <span>
          Source: <strong className="text-slate-800">{application.source || "—"}</strong>
        </span>
        <span>
          Saved: <strong className="text-slate-800">{formatRelativeDate(application.dateSaved)}</strong>
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={ccBtnSecondarySm} onClick={() => onOpenJob(application.jobUrl)}>
          Open Job
        </button>
        <button type="button" className={ccBtnSecondarySm} onClick={() => onViewMaterials(application)}>
          View Materials
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</span>
        <select
          className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-800"
          value={application.status}
          disabled={statusBusy}
          onChange={(e) => onStatusChange(application.id, e.target.value as JobApplicationStatus)}
        >
          {(
            [
              "SAVED",
              "PREPARING",
              "READY_TO_APPLY",
              "APPLIED",
              "INTERVIEWING",
              "OFFER",
              "REJECTED",
              "ARCHIVED",
            ] as JobApplicationStatus[]
          ).map((s) => (
            <option key={s} value={s}>
              {jobApplicationStatusLabel(s)}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}
