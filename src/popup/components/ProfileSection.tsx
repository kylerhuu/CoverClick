import type { UserProfile } from "../../lib/types";
import { formatListPreview, truncate } from "../../lib/utils";

type Props = {
  profile: UserProfile;
  onEdit: () => void;
};

export function ProfileSection({ profile, onEdit }: Props) {
  const hasName = profile.fullName.trim().length > 0;
  const summary = profile.summary.trim();

  return (
    <section className="px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="cc-label">You</span>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
        >
          Edit
        </button>
      </div>
      <div className="mt-1.5 text-[12px] font-medium text-slate-900">{hasName ? profile.fullName : "Profile empty"}</div>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
        {summary ? truncate(summary, 140) : "Add a summary in options for better tailoring."}
      </p>
      <p className="mt-1 text-[10px] leading-snug text-slate-400">
        {formatListPreview(profile.skills, 3)} · {profile.experienceBullets.filter(Boolean).length} exp ·{" "}
        {profile.projectBullets.filter(Boolean).length} projects
      </p>
    </section>
  );
}
