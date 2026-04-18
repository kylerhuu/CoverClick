export type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  profile: SaveStatus;
  settings: SaveStatus;
};

function dot(status: SaveStatus): string {
  if (status === "saving") return "Saving…";
  if (status === "saved") return "Saved";
  if (status === "error") return "Couldn’t save";
  return "";
}

export function AutosaveStatus({ profile, settings }: Props) {
  const p = dot(profile);
  const s = dot(settings);
  const parts = [p && `Profile ${p}`, s && `Settings ${s}`].filter(Boolean);
  if (!parts.length) return null;
  return (
    <div className="flex items-center gap-2 text-[11px] font-medium tabular-nums text-indigo-100/95">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.5)]" aria-hidden />
      {parts.join(" · ")}
    </div>
  );
}
