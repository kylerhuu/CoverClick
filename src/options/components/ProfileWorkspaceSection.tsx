import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import type { AppSettings, DefaultTone, UserProfile } from "../../lib/types";
import { listApplications } from "../../lib/applicationsApi";
import { loadResumeLibrary } from "../../lib/resumeLibrary";
import { loadSettings } from "../../lib/storage";
import { profileCompleteness } from "../../lib/profileCompleteness";
import { cn, fieldInputClass, fieldSelectClass, fieldTextareaClass } from "../../lib/classNames";
import { BulletListEditor } from "./BulletListEditor";
import { Field } from "./Field";
import {
  WorkspaceActionCard,
  WorkspaceCard,
  WorkspaceHero,
  WorkspaceSection,
  WorkspaceStat,
  wsCompletenessBar,
  wsCompletenessFill,
  wsHeroName,
  wsHeroSubtitle,
} from "../../ui/workspaceUi";
import { PlanBadge } from "../../ui/PlanBadge";
import { ccHairline } from "../../ui/ccUi";

type Props = {
  profile: UserProfile;
  setProfile: Dispatch<SetStateAction<UserProfile>>;
  settings: AppSettings;
  tones: { value: DefaultTone; label: string }[];
  onNavigateImport: () => void;
  onRelaunchTour?: () => void;
  showRelaunchTour?: boolean;
  isPro?: boolean;
  onUpgrade?: () => void;
};

export function ProfileWorkspaceSection({
  profile,
  setProfile,
  settings,
  tones,
  onNavigateImport,
  onRelaunchTour,
  showRelaunchTour = false,
  isPro = false,
  onUpgrade,
}: Props) {
  const [resumeCount, setResumeCount] = useState(0);
  const [applicationCount, setApplicationCount] = useState(0);
  const [avgMatch, setAvgMatch] = useState<number | null>(null);

  const { score: completeness } = useMemo(() => profileCompleteness(profile), [profile]);

  const heroSubtitle = useMemo(() => {
    const parts = [profile.major?.trim(), profile.school?.trim()].filter(Boolean);
    if (parts.length > 0) return parts.join(" • ");
    if (profile.summary?.trim()) {
      const s = profile.summary.trim();
      return s.length > 72 ? `${s.slice(0, 72)}…` : s;
    }
    return "Your professional identity for tailored applications";
  }, [profile.major, profile.school, profile.summary]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const library = await loadResumeLibrary();
        if (!cancelled) setResumeCount(library.variants.length);
      } catch {
        if (!cancelled) setResumeCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await loadSettings();
        const data = await listApplications(s.apiBaseUrl, s.authToken, s.useMock);
        if (cancelled) return;
        setApplicationCount(data.applications.length);
        const scores = data.applications.map((a) => a.fitScore).filter((n): n is number => n != null);
        if (scores.length > 0) {
          setAvgMatch(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
        } else {
          setAvgMatch(null);
        }
      } catch {
        if (!cancelled) {
          setApplicationCount(0);
          setAvgMatch(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="cc-fade-in mt-4 space-y-6">
      <WorkspaceHero>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className={wsHeroName}>{profile.fullName?.trim() || "Your profile"}</h2>
            <p className={cn(wsHeroSubtitle, "mt-1")}>{heroSubtitle}</p>
            <div className="mt-4 max-w-md">
              <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500">
                <span>Profile completeness</span>
                <span className="font-semibold text-slate-800">{completeness}%</span>
              </div>
              <div className={cn(wsCompletenessBar, "mt-1.5")}>
                <div className={wsCompletenessFill(completeness)} style={{ width: `${completeness}%` }} />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-4 sm:items-end">
            <PlanBadge isPro={isPro} onUpgrade={onUpgrade} />
            <div className="grid grid-cols-3 gap-6 sm:gap-8">
            <WorkspaceStat label="Resume versions" value={resumeCount} />
            <WorkspaceStat label="Saved applications" value={applicationCount} />
            <WorkspaceStat
              label="Avg match score"
              value={avgMatch != null ? `${avgMatch}%` : "—"}
              highlight={avgMatch != null && avgMatch >= 75}
            />
            </div>
          </div>
        </div>
      </WorkspaceHero>

      <WorkspaceActionCard
        title="Import from resume"
        subtitle="Fastest way to fill your profile"
        meta="Upload PDF, DOCX, or TXT — we suggest fields you can review and merge."
        actionLabel="Import resume"
        onAction={onNavigateImport}
      />
      {showRelaunchTour && onRelaunchTour ? (
        <button
          type="button"
          className="text-[12px] font-semibold text-[#5B4CF0] hover:text-[#4f46e5]"
          onClick={() => onRelaunchTour()}
        >
          Replay product tour
        </button>
      ) : null}
      {settings.useMock ? (
        <p className="text-[11px] text-amber-900/90">
          {import.meta.env.PROD
            ? "Sign in with an active plan from the side panel to use resume import."
            : "Turn off demo mode under Cloud & billing to use resume import."}
        </p>
      ) : null}

      <WorkspaceSection title="Personal information" description="Basics the model uses in every application.">
        <div data-onboarding-target="profile-fields">
          <WorkspaceCard>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Full name">
              <input
                className={fieldInputClass}
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                className={fieldInputClass}
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <input
                className={fieldInputClass}
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </Field>
            <Field label="Location">
              <input
                className={fieldInputClass}
                value={profile.location}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              />
            </Field>
          </div>
          <div className={cn(ccHairline, "my-4")} />
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="School">
              <input
                className={fieldInputClass}
                value={profile.school}
                onChange={(e) => setProfile({ ...profile, school: e.target.value })}
              />
            </Field>
            <Field label="Major">
              <input
                className={fieldInputClass}
                value={profile.major}
                onChange={(e) => setProfile({ ...profile, major: e.target.value })}
              />
            </Field>
            <Field label="Graduation year" className="sm:col-span-2">
              <input
                className={fieldInputClass}
                value={profile.graduationYear}
                onChange={(e) => setProfile({ ...profile, graduationYear: e.target.value })}
              />
            </Field>
          </div>
        </WorkspaceCard>
        </div>
      </WorkspaceSection>

      <WorkspaceSection title="Skills" description="Short phrases your cover letters can lean on.">
        <WorkspaceCard>
          <BulletListEditor
            label=""
            items={profile.skills}
            onChange={(skills) => setProfile({ ...profile, skills })}
            placeholder="e.g. TypeScript"
          />
        </WorkspaceCard>
      </WorkspaceSection>

      <WorkspaceSection title="Professional story" description="Experience and narrative that ground your applications.">
        <WorkspaceCard className="space-y-5">
          <Field label="Summary" hint="What you want next and what you excel at — a short paragraph.">
            <textarea
              className={fieldTextareaClass}
              rows={4}
              value={profile.summary}
              onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
            />
          </Field>
          <BulletListEditor
            label="Experience bullets"
            hint="Outcomes you are fine citing."
            items={profile.experienceBullets}
            onChange={(experienceBullets) => setProfile({ ...profile, experienceBullets })}
            placeholder="Impact + scope"
          />
          <BulletListEditor
            label="Project bullets"
            hint="Shipped work, products, or initiatives."
            items={profile.projectBullets}
            onChange={(projectBullets) => setProfile({ ...profile, projectBullets })}
            placeholder="Built / measured / shipped"
          />
          <Field label="Default tone" hint="Starting tone in the side panel; you can still change per letter.">
            <select
              className={fieldSelectClass}
              value={profile.defaultTone}
              onChange={(e) => setProfile({ ...profile, defaultTone: e.target.value as DefaultTone })}
            >
              {tones.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <details className="group rounded-lg border border-slate-200/70 bg-slate-50/40 open:bg-white">
            <summary className="cursor-pointer list-none px-3 py-2.5 text-[12px] font-semibold text-slate-700 outline-none marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="mr-2 inline-block w-3 text-slate-400 transition-transform duration-200 group-open:rotate-90">
                ›
              </span>
              Resume text & signature
            </summary>
            <div className="space-y-4 border-t border-slate-200/60 px-3 pb-4 pt-3">
              <Field label="Resume text" hint="Optional — richer grounding for the server model.">
                <textarea
                  className={fieldTextareaClass}
                  rows={5}
                  value={profile.resumeText}
                  onChange={(e) => setProfile({ ...profile, resumeText: e.target.value })}
                />
              </Field>
              <Field label="Signature block" hint="Optional closing; otherwise we end cleanly.">
                <textarea
                  className={fieldTextareaClass}
                  rows={3}
                  value={profile.signatureBlock}
                  onChange={(e) => setProfile({ ...profile, signatureBlock: e.target.value })}
                />
              </Field>
            </div>
          </details>
        </WorkspaceCard>
      </WorkspaceSection>

      <WorkspaceSection title="Links" description="Where recruiters can learn more about you.">
        <WorkspaceCard>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="LinkedIn">
              <input
                className={fieldInputClass}
                value={profile.linkedin}
                onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
              />
            </Field>
            <Field label="Portfolio">
              <input
                className={fieldInputClass}
                value={profile.portfolio}
                onChange={(e) => setProfile({ ...profile, portfolio: e.target.value })}
              />
            </Field>
          </div>
        </WorkspaceCard>
      </WorkspaceSection>
    </div>
  );
}
