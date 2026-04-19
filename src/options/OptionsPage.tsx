import { useEffect, useMemo, useState } from "react";
import type { AppSettings, DefaultTone, UserProfile } from "../lib/types";
import { DEFAULT_SETTINGS, EMPTY_PROFILE } from "../lib/types";
import { fieldInputClass, fieldSelectClass, fieldTextareaClass } from "../lib/classNames";
import { compactProfileArrays } from "../lib/profileArrays";
import { loadProfile, loadSettings, saveProfile, saveSettings } from "../lib/storage";
import { AutosaveStatus, type SaveStatus } from "./components/AutosaveStatus";
import { BulletListEditor } from "./components/BulletListEditor";
import { Field } from "./components/Field";
import { ServerPanels } from "./components/ServerPanels";

const AUTOSAVE_MS = 700;

export function OptionsPage() {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileSave, setProfileSave] = useState<SaveStatus>("idle");
  const [settingsSave, setSettingsSave] = useState<SaveStatus>("idle");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, s] = await Promise.all([loadProfile(), loadSettings()]);
        if (cancelled) return;
        setProfile(p);
        setSettings(s);
        setHydrated(true);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          setProfileSave("saving");
          await saveProfile(compactProfileArrays(profile));
          setProfileSave("saved");
          window.setTimeout(() => setProfileSave("idle"), 1600);
        } catch {
          setProfileSave("error");
        }
      })();
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(id);
  }, [profile, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          setSettingsSave("saving");
          await saveSettings(settings);
          setSettingsSave("saved");
          window.setTimeout(() => setSettingsSave("idle"), 1600);
        } catch {
          setSettingsSave("error");
        }
      })();
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(id);
  }, [settings, hydrated]);

  const tones = useMemo(
    () =>
      [
        { value: "professional" as const, label: "Professional" },
        { value: "warm" as const, label: "Warm" },
        { value: "concise" as const, label: "Concise" },
        { value: "enthusiastic" as const, label: "Enthusiastic" },
        { value: "formal" as const, label: "Formal" },
      ] satisfies { value: DefaultTone; label: string }[],
    [],
  );

  return (
    <div className="min-h-full bg-[#fafbfc] text-slate-900">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-3 text-white shadow-md backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-sky-400 text-[11px] font-black text-white shadow-md">
              CC
            </div>
            <div>
              <div className="text-[15px] font-bold tracking-tight">CoverClick</div>
              <div className="text-[11px] font-medium text-indigo-100/85">Profile · autosaved</div>
            </div>
          </div>
          <AutosaveStatus profile={profileSave} settings={settingsSave} />
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="max-w-2xl">
          <p className="text-[14px] leading-relaxed text-slate-600">
            Save your background once. The side panel reads the job tab and drafts a letter you can edit, copy, or export
            — without pasting into ChatGPT first.
          </p>
        </header>

        {loadError ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
            {loadError}
          </div>
        ) : null}

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
          <section className="space-y-5 lg:col-span-7">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Contact</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <Field label="LinkedIn" className="sm:col-span-2">
                <input
                  className={fieldInputClass}
                  value={profile.linkedin}
                  onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                />
              </Field>
              <Field label="Portfolio" className="sm:col-span-2">
                <input
                  className={fieldInputClass}
                  value={profile.portfolio}
                  onChange={(e) => setProfile({ ...profile, portfolio: e.target.value })}
                />
              </Field>
            </div>

            <h2 className="pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Education</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <Field label="Graduation year">
                <input
                  className={fieldInputClass}
                  value={profile.graduationYear}
                  onChange={(e) => setProfile({ ...profile, graduationYear: e.target.value })}
                />
              </Field>
              <Field label="Default tone in side panel">
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
            </div>
          </section>

          <section className="space-y-6 lg:col-span-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Narrative</h2>
            <Field
              label="Summary"
              hint="What you want next, what you’re strongest at, in a few sentences."
            >
              <textarea
                className={fieldTextareaClass}
                rows={5}
                value={profile.summary}
                onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
              />
            </Field>

            <BulletListEditor
              label="Skills"
              hint="Short phrases — one per row."
              items={profile.skills}
              onChange={(skills) => setProfile({ ...profile, skills })}
              placeholder="e.g. TypeScript"
            />
            <BulletListEditor
              label="Experience bullets"
              hint="Outcomes you’re comfortable the model citing."
              items={profile.experienceBullets}
              onChange={(experienceBullets) => setProfile({ ...profile, experienceBullets })}
              placeholder="Impact + scope"
            />
            <BulletListEditor
              label="Project bullets"
              items={profile.projectBullets}
              onChange={(projectBullets) => setProfile({ ...profile, projectBullets })}
              placeholder="Shipped / built / measured"
            />

            <Field label="Resume text" hint="Optional plain text for richer grounding on your server.">
              <textarea
                className={fieldTextareaClass}
                rows={8}
                value={profile.resumeText}
                onChange={(e) => setProfile({ ...profile, resumeText: e.target.value })}
              />
            </Field>

            <Field label="Signature block" hint="Optional closing; otherwise the letter ends professionally.">
              <textarea
                className={fieldTextareaClass}
                rows={4}
                value={profile.signatureBlock}
                onChange={(e) => setProfile({ ...profile, signatureBlock: e.target.value })}
              />
            </Field>
          </section>
        </div>

        <section className="mt-14 border-t border-slate-200/90 pt-10">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Backend</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-600">
            No API keys in the extension. Point this at the included Node server (see repo <code className="font-mono text-[12px]">server/</code>
            ) or your own backend. The server returns structured JSON (
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800">{`{ "format": "structured", "letter": {…} }`}</code>
            ) or plain text — see README.
          </p>
          <div className="mt-6 grid max-w-2xl grid-cols-1 gap-5">
            <Field
              label="API base URL"
              hint="POST to /api/generate-cover-letter on this origin (no trailing slash)."
            >
              <input
                className={fieldInputClass}
                value={settings.apiBaseUrl}
                onChange={(e) => setSettings({ ...settings, apiBaseUrl: e.target.value.replace(/\/$/, "") })}
                placeholder="https://api.yourdomain.com"
              />
            </Field>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200/90 bg-white px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-slate-300"
                checked={settings.useMock}
                onChange={(e) => setSettings({ ...settings, useMock: e.target.checked })}
              />
              <span>
                <span className="text-[13px] font-medium text-slate-900">Mock generation</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-slate-600">
                  Skip the network for local UI testing.
                </span>
              </span>
            </label>
          </div>
        </section>

        <ServerPanels hydrated={hydrated} settings={settings} setSettings={setSettings} profile={profile} setProfile={setProfile} />
      </div>
    </div>
  );
}
