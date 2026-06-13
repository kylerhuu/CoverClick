import { useCallback, useEffect, useState } from "react";
import {
  createVariant,
  loadResumeLibrary,
  setActiveVariant,
  type ResumeLibraryStore,
  type ResumeVariant,
} from "../../lib/resumeLibrary";
import { STORAGE_KEYS } from "../../lib/storageKeys";
import { cn } from "../../lib/classNames";
import { WorkspaceApp } from "../../workspace/WorkspaceApp";
import { ccBtnPrimarySm, ccBtnSecondarySm, ccEyebrow, ccMuted, ccSectionTitle, ccSurfaceQuiet } from "../../ui/ccUi";

function formatUpdatedAt(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export function SavedResumesSection() {
  const [library, setLibrary] = useState<ResumeLibraryStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [editingVariant, setEditingVariant] = useState<ResumeVariant | null>(null);

  const refresh = useCallback(async () => {
    const next = await loadResumeLibrary();
    setLibrary(next);
    return next;
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local") return;
      if (changes[STORAGE_KEYS.resumeLibrary]) void refresh();
    };
    chrome.storage.onChanged.addListener(onStorage);
    return () => chrome.storage.onChanged.removeListener(onStorage);
  }, [refresh]);

  const handleSetDefault = async (id: string) => {
    await setActiveVariant(id);
    await refresh();
  };

  const handleCreate = async () => {
    setCreateBusy(true);
    setCreateError(null);
    try {
      const created = await createVariant(draftName.trim());
      setCreating(false);
      setDraftName("");
      await refresh();
      setEditingVariant(created);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not create resume.");
    } finally {
      setCreateBusy(false);
    }
  };

  if (editingVariant) {
    return (
      <div className="cc-fade-in fixed inset-0 z-40 flex flex-col bg-[#f0f2f6]">
        <WorkspaceApp
          mode="library"
          libraryVariantId={editingVariant.id}
          libraryVariantName={editingVariant.name}
          initialWorkspaceTab="resume"
          onBackToLibrary={() => {
            setEditingVariant(null);
            void refresh();
          }}
        />
      </div>
    );
  }

  const variants = library?.variants ?? [];
  const activeId = library?.activeVariantId ?? "";

  return (
    <div className="cc-fade-in mt-5 space-y-6">
      <header className="max-w-3xl">
        <p className={ccEyebrow}>Saved resumes</p>
        <h2 className={cn(ccSectionTitle, "mt-1")}>Your reusable resume versions</h2>
        <p className={cn(ccMuted, "mt-2")}>
          This is where your resumes live. Create versions for different tracks, edit content here, and pick one per job
          from the side panel.
        </p>
      </header>

      <div className={cn(ccSurfaceQuiet, "overflow-hidden")}>
        {loading ? (
          <p className="p-4 text-[13px] text-slate-500">Loading saved resumes…</p>
        ) : variants.length === 0 ? (
          <p className="p-4 text-[13px] text-slate-500">No saved resumes yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200/70">
            {variants.map((variant) => {
              const isDefault = variant.id === activeId;
              return (
                <li key={variant.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-slate-900">{variant.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Updated {formatUpdatedAt(variant.updatedAt)}
                      {isDefault ? (
                        <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">
                          Default
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!isDefault ? (
                      <button
                        type="button"
                        className={ccBtnSecondarySm}
                        onClick={() => void handleSetDefault(variant.id)}
                      >
                        Set as default
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={ccBtnPrimarySm}
                      onClick={() => {
                        void (async () => {
                          if (!isDefault) await setActiveVariant(variant.id);
                          await refresh();
                          setEditingVariant(variant);
                        })();
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {creating ? (
        <div className={cn(ccSurfaceQuiet, "space-y-3 p-4")}>
          <label className="block text-[12px] font-semibold text-slate-800">
            New resume version name
            <input
              className="mt-1.5 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/15"
              value={draftName}
              maxLength={40}
              placeholder="e.g. Software Resume"
              autoFocus
              onChange={(e) => {
                setDraftName(e.target.value);
                setCreateError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setDraftName("");
                  setCreateError(null);
                }
              }}
            />
          </label>
          <div className="flex gap-2">
            <button type="button" className={ccBtnPrimarySm} disabled={createBusy} onClick={() => void handleCreate()}>
              {createBusy ? "Creating…" : "Create resume"}
            </button>
            <button
              type="button"
              className={ccBtnSecondarySm}
              disabled={createBusy}
              onClick={() => {
                setCreating(false);
                setDraftName("");
                setCreateError(null);
              }}
            >
              Cancel
            </button>
          </div>
          {createError ? <p className="text-[12px] font-medium text-red-700">{createError}</p> : null}
        </div>
      ) : (
        <button type="button" className={ccBtnPrimarySm} onClick={() => setCreating(true)}>
          + Create new resume
        </button>
      )}
    </div>
  );
}
