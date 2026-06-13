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
import {
  WorkspaceActionCard,
  WorkspaceCard,
  WorkspaceHero,
  WorkspaceSection,
  wsHeroName,
  wsPageIntro,
} from "../../ui/workspaceUi";
import { ccBtnPrimarySm, ccBtnSecondarySm } from "../../ui/ccUi";

function formatUpdatedAt(ts: number): string {
  try {
    const d = new Date(ts);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isToday) return "Updated today";
    return `Updated ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  } catch {
    return "";
  }
}

function resumeTrackLabel(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("swe") || lower.includes("software") || lower.includes("engineer")) {
    return "Software Engineering track";
  }
  if (lower.includes("product") || lower.includes("pm")) return "Product track";
  if (lower.includes("business") || lower.includes("general")) return "Business / general applications";
  return "Custom resume version";
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
      <div className="cc-fade-in fixed inset-0 z-40 flex flex-col bg-[#F5F7FB]">
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
    <div className="cc-fade-in mt-4 space-y-6">
      <WorkspaceHero>
        <h2 className={wsHeroName}>Saved resumes</h2>
        <p className={cn(wsPageIntro, "mt-1 max-w-2xl")}>
          Your resume assets — create versions for different tracks, edit content here, and pick one per job from the side
          panel.
        </p>
      </WorkspaceHero>

      <WorkspaceSection title="Resume versions" description="Each version is a tailored asset for different application tracks.">
        {loading ? (
          <WorkspaceCard>
            <p className="text-[13px] text-slate-500">Loading saved resumes…</p>
          </WorkspaceCard>
        ) : variants.length === 0 ? (
          <WorkspaceCard>
            <p className="text-[13px] text-slate-500">No saved resumes yet. Create your first version below.</p>
          </WorkspaceCard>
        ) : (
          <div className="space-y-3">
            {variants.map((variant) => {
              const isDefault = variant.id === activeId;
              return (
                <WorkspaceActionCard
                  key={variant.id}
                  title={variant.name}
                  subtitle={resumeTrackLabel(variant.name)}
                  meta={formatUpdatedAt(variant.updatedAt)}
                  badge={isDefault ? "Default" : undefined}
                  actionLabel="Edit resume"
                  onAction={() => {
                    void (async () => {
                      if (!isDefault) await setActiveVariant(variant.id);
                      await refresh();
                      setEditingVariant(variant);
                    })();
                  }}
                  secondaryActionLabel={!isDefault ? "Set as default" : undefined}
                  onSecondaryAction={!isDefault ? () => void handleSetDefault(variant.id) : undefined}
                />
              );
            })}
          </div>
        )}
      </WorkspaceSection>

      {creating ? (
        <WorkspaceCard className="space-y-3">
          <label className="block text-[12px] font-semibold text-slate-800">
            New resume version name
            <input
              className="mt-1.5 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-[#5B4CF0]/40 focus:ring-2 focus:ring-[#5B4CF0]/15"
              value={draftName}
              maxLength={40}
              placeholder="e.g. SWE Resume"
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
        </WorkspaceCard>
      ) : (
        <button type="button" className={ccBtnPrimarySm} onClick={() => setCreating(true)}>
          + Create new resume
        </button>
      )}
    </div>
  );
}
