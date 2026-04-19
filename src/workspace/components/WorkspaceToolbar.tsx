import { cn } from "../../lib/classNames";
import type { WorkspaceTab } from "../workspaceLayout";

type Props = {
  scrapeBusy: boolean;
  onRescan: () => void;
  workspaceTab: WorkspaceTab;
  onWorkspaceTabChange: (tab: WorkspaceTab) => void;
  exportBasename: string;
  onExportBasenameChange: (value: string) => void;
  onOpenProfile: () => void;
};

const toolBtn = cn(
  "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-200/90 bg-white px-2.5 text-[11px] font-semibold text-slate-800 shadow-sm",
  "hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-950",
  "disabled:pointer-events-none disabled:opacity-40",
);

const segments: { id: WorkspaceTab; label: string; title: string }[] = [
  { id: "split", label: "Split", title: "Job posting and letter together" },
  { id: "job", label: "Job", title: "Full-width job posting" },
  { id: "letter", label: "Letter", title: "Full-width cover letter" },
];

export function WorkspaceToolbar({
  scrapeBusy,
  onRescan,
  workspaceTab,
  onWorkspaceTabChange,
  exportBasename,
  onExportBasenameChange,
  onOpenProfile,
}: Props) {
  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-slate-200/80 bg-white/95 px-3 py-2.5 backdrop-blur-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div
          className="inline-flex shrink-0 rounded-lg border border-slate-200/90 bg-slate-100/90 p-0.5 shadow-inner"
          role="tablist"
          aria-label="Workspace layout"
        >
          {segments.map((s) => {
            const active = workspaceTab === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                title={s.title}
                onClick={() => onWorkspaceTabChange(s.id)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition",
                  active
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        <span className="hidden h-6 w-px shrink-0 bg-slate-200/90 sm:block" aria-hidden />

        <button type="button" className={toolBtn} onClick={onRescan} disabled={scrapeBusy}>
          {scrapeBusy ? "Scanning…" : "Re-scan tab"}
        </button>

        <label className="flex min-w-0 flex-[1_1_160px] flex-col gap-0.5 sm:flex-[1_1_220px]">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Export filename</span>
          <input
            type="text"
            value={exportBasename}
            onChange={(e) => onExportBasenameChange(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            className={cn(
              "h-8 w-full min-w-0 rounded-md border border-slate-200/90 bg-slate-50/80 px-2.5 text-[11px] font-medium text-slate-900",
              "outline-none ring-indigo-500/0 transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/25",
            )}
            placeholder="Name_Role_Company_CoverLetter"
          />
        </label>

        <button type="button" className={cn(toolBtn, "ml-auto shrink-0")} onClick={onOpenProfile}>
          Profile
        </button>
      </div>
    </div>
  );
}
