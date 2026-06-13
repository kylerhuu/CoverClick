import type { JobApplication, JobApplicationStatus } from "../../lib/types";
import { KANBAN_COLUMNS, jobApplicationStatusLabel } from "../../lib/types";
import { ApplicationJobCard } from "./ApplicationJobCard";
import { cn } from "../../lib/classNames";

type Props = {
  applications: JobApplication[];
  onOpenJob: (url: string) => void;
  onViewMaterials: (app: JobApplication) => void;
  onStatusChange: (id: string, status: JobApplicationStatus) => void;
  onRemove?: (id: string) => void;
  statusBusyId?: string | null;
  removeBusyId?: string | null;
};

export function ApplicationKanban({
  applications,
  onOpenJob,
  onViewMaterials,
  onStatusChange,
  onRemove,
  statusBusyId,
  removeBusyId,
}: Props) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3">
        {KANBAN_COLUMNS.map((column) => {
          const cards = applications.filter((a) => a.status === column);
          return (
            <section
              key={column}
              className={cn(
                "flex w-[260px] shrink-0 flex-col rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
              )}
            >
              <header className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                <h3 className="text-[12px] font-bold text-slate-800">{jobApplicationStatusLabel(column)}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {cards.length}
                </span>
              </header>
              <div className="flex max-h-[min(70vh,640px)] flex-col gap-2 overflow-y-auto p-2">
                {cards.length === 0 ? (
                  <p className="px-2 py-6 text-center text-[11px] text-slate-500">No jobs yet</p>
                ) : (
                  cards.map((app) => (
                    <ApplicationJobCard
                      key={app.id}
                      application={app}
                      onOpenJob={onOpenJob}
                      onViewMaterials={onViewMaterials}
                      onStatusChange={onStatusChange}
                      onRemove={onRemove}
                      statusBusy={statusBusyId === app.id}
                      removeBusy={removeBusyId === app.id}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
