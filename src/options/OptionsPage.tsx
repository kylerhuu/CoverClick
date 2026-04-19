import { useEffect, useMemo, useState } from "react";
import type { AppSettings, DefaultTone, UserProfile } from "../lib/types";
import { DEFAULT_SETTINGS, EMPTY_PROFILE } from "../lib/types";
import { cn, fieldInputClass, fieldSelectClass, fieldTextareaClass } from "../lib/classNames";
import { compactProfileArrays } from "../lib/profileArrays";
import { apiGetServerProfile, apiPutServerProfile } from "../lib/backendApi";
import { loadProfile, loadSettings, saveProfile, saveSettings } from "../lib/storage";
import { AuthWall } from "../auth/AuthWall";
import { useAccessGate } from "../auth/useAccessGate";
import { AutosaveStatus, type SaveStatus, type ServerSyncStatus } from "./components/AutosaveStatus";
import { BulletListEditor } from "./components/BulletListEditor";
import { CloudAndSyncSection } from "./components/CloudAndSyncSection";
import { ConnectionSettings } from "./components/ConnectionSettings";
import { Field } from "./components/Field";
import { OptionsSectionNav, type OptionsMainTab } from "./components/OptionsSectionNav";
import { ResumeImportSection } from "./components/ResumeImportSection";
import { ccBtnPrimarySm, ccEyebrow, ccHairline, ccMuted, ccSectionTitle, ccSurfaceQuiet } from "../ui/ccUi";
import { EXTENSION_BUILD_ID } from "virtual:coverclick-build";

const AUTOSAVE_MS = 700;

function OptionsBuildFootnote() {
  return (
    <footer className="mx-auto max-w-5xl border-t border-slate-200/80 px-4 py-4 text-center text-[10px] leading-relaxed text-slate-400 sm:px-5">
      <span className="font-mono text-[10px] text-slate-500" title="Changes after this time require rebuild + reload">
        Build {EXTENSION_BUILD_ID}
      </span>
      <span className="mx-2 text-slate-300">·</span>
      Chrome runs the compiled copy in <strong className="text-slate-500">dist/</strong>, not your source tree. After pulling
      or editing code: run{" "}
      <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-600">npm run build</code> (or keep{" "}
      <code className="rounded bg-slate-100 px-1 font-mono text-slate-600">npm run dev</code>
      ), open <code className="rounded bg-slate-100 px-1 font-mono text-slate-600">chrome://extensions</code>, click{" "}
      <strong className="text-slate-500">Reload</strong> on CoverClick, then reopen this tab. Unpacked extension path must be
      the <strong className="text-slate-500">dist</strong> folder.
    </footer>
  );
}

export function OptionsPage() {
  const gate = useAccessGate();
  const [mainTab, setMainTab] = useState<OptionsMainTab>("profile");
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileSave, setProfileSave] = useState<SaveStatus>("idle");
  const [settingsSave, setSettingsSave] = useState<SaveStatus>("idle");
  const [serverSync, setServerSync] = useState<ServerSyncStatus>("idle");
  const [serverSyncMsg, setServerSyncMsg] = useState<string | null>(null);
  const [showApiAdvanced, setShowApiAdvanced] = useState(false);

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
    if (gate.phase !== "paid") return;
    let cancelled = false;
    void (async () => {
      const s = await loadSettings();
      const token = s.authToken?.trim();
      const base = s.apiBaseUrl.trim();
      if (!token || s.useMock || !base) return;
      try {
        const { profile: remote } = await apiGetServerProfile(base, token);
        if (cancelled || !remote) return;
        const next = compactProfileArrays(remote);
        setProfile(next);
        await saveProfile(next);
      } catch {
        // keep local profile
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, gate.phase]);

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

  useEffect(() => {
    if (!hydrated) return;
    if (gate.phase !== "paid") return;
    const token = settings.authToken?.trim();
    const base = settings.apiBaseUrl.trim();
    if (!token || settings.useMock || !base) return;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          setServerSync("syncing");
          await apiPutServerProfile(base, token, compactProfileArrays(profile));
          setServerSync("ok");
          setServerSyncMsg(null);
          window.setTimeout(() => setServerSync("idle"), 1400);
        } catch (e) {
          setServerSync("error");
          setServerSyncMsg(e instanceof Error ? e.message : "Could not sync profile to server");
          window.setTimeout(() => setServerSync("idle"), 6000);
        }
      })();
    }, 1100);
    return () => window.clearTimeout(id);
  }, [profile, hydrated, gate.phase, settings.authToken, settings.useMock, settings.apiBaseUrl]);

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

  if (!hydrated || gate.phase === "loading") {
    return (
      <div className="flex min-h-screen flex-col bg-[#f4f6f9] text-slate-600">
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <span className="cc-spinner h-8 w-8 border-[3px]" aria-hidden />
          <p className="text-[13px] font-medium">Loading…</p>
        </div>
        <OptionsBuildFootnote />
      </div>
    );
  }

  if (gate.phase === "no_api" || gate.phase === "signed_out" || gate.phase === "unpaid" || gate.phase === "account_error") {
    return (
      <div className="flex min-h-full flex-col bg-[#f4f6f9] text-slate-900">
        <div className="min-h-0 flex-1">
          <AuthWall
            variant="options"
            mode={
              gate.phase === "no_api"
                ? "no_api"
                : gate.phase === "signed_out"
                  ? "signed_out"
                  : gate.phase === "account_error"
                    ? "account_error"
                    : "unpaid"
            }
            me={gate.me}
            authBusy={gate.authBusy}
            authError={gate.authError}
            onGoogleSignIn={() => void gate.signInWithGoogle()}
            onSignOut={() => void gate.signOut()}
            onSubscribe={() => void gate.openStripeCheckout()}
            onManageBilling={() => void gate.openCustomerPortal()}
            onRefreshAccess={() => void gate.refresh()}
          />
        </div>
        <OptionsBuildFootnote />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-[#f4f6f9] text-slate-900">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-[0_4px_24px_rgba(15,23,42,0.35)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-sky-400 text-[12px] font-black tracking-tight text-white shadow-lg shadow-indigo-950/40">
              CC
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[16px] font-bold tracking-tight">CoverClick</h1>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-100/95 ring-1 ring-white/10">
                  Pro
                </span>
              </div>
              <p className="truncate text-[11px] font-medium text-indigo-100/80">Profile · cloud autosave</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
            {gate.me?.email ? (
              <span className="hidden max-w-[200px] truncate text-[11px] text-indigo-100/75 sm:block" title={gate.me.email}>
                {gate.me.email}
              </span>
            ) : null}
            <AutosaveStatus profile={profileSave} settings={settingsSave} server={serverSync} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 sm:py-6">
        <div className={cn(ccSurfaceQuiet, "px-4 py-3.5 sm:px-5")}>
          <OptionsSectionNav active={mainTab} onChange={setMainTab} />
        </div>

        {loadError ? (
          <div className="mt-4 rounded-lg border border-red-200/90 bg-red-50 px-3 py-2.5 text-[13px] text-red-800">{loadError}</div>
        ) : null}

        {mainTab === "profile" ? (
          <div className="cc-fade-in mt-5 space-y-8">
            <header className="max-w-3xl">
              <p className={ccEyebrow}>Your profile</p>
              <h2 className={cn(ccSectionTitle, "mt-1")}>What the model knows about you</h2>
              <p className={cn(ccMuted, "mt-2")}>
                Save once — the side panel pairs this with the active job tab so you can draft, tune, and export without
                copy-paste.
              </p>
            </header>

            <div
              className={cn(
                ccSurfaceQuiet,
                "flex flex-col gap-3 border border-indigo-200/50 border-l-[4px] border-l-indigo-500 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/40 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4",
              )}
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700/90">Quick start</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-900">Autofill from your resume</p>
                <p className="mt-0.5 text-[12px] leading-snug text-slate-600">
                  Upload PDF, DOCX, or TXT — we suggest profile fields you can merge or replace. Always review before you
                  apply.
                </p>
                {settings.useMock ? (
                  <p className="mt-1.5 text-[11px] text-amber-900/90">Turn off demo mode under Cloud & billing to use resume import.</p>
                ) : null}
              </div>
              <button type="button" className={cn(ccBtnPrimarySm, "shrink-0 self-start sm:self-center")} onClick={() => setMainTab("import")}>
                Import resume…
              </button>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
              <div className="space-y-6 lg:col-span-5">
                <div>
                  <p className={ccEyebrow}>Basics</p>
                  <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
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
                </div>

                <div className={ccHairline} aria-hidden />

                <div>
                  <p className={ccEyebrow}>Story</p>
                  <div className="mt-3 space-y-4">
                    <Field label="Summary" hint="What you want next and what you excel at — a short paragraph.">
                      <textarea
                        className={fieldTextareaClass}
                        rows={4}
                        value={profile.summary}
                        onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
                      />
                    </Field>
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
                  </div>
                </div>
              </div>

              <div className="space-y-6 lg:col-span-7">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <BulletListEditor
                    label="Skills"
                    hint="Short phrases the letter can lean on."
                    items={profile.skills}
                    onChange={(skills) => setProfile({ ...profile, skills })}
                    placeholder="e.g. TypeScript"
                  />
                  <BulletListEditor
                    label="Experience bullets"
                    hint="Outcomes you are fine citing."
                    items={profile.experienceBullets}
                    onChange={(experienceBullets) => setProfile({ ...profile, experienceBullets })}
                    placeholder="Impact + scope"
                  />
                </div>
                <BulletListEditor
                  label="Project bullets"
                  hint="Shipped work, products, or initiatives."
                  items={profile.projectBullets}
                  onChange={(projectBullets) => setProfile({ ...profile, projectBullets })}
                  placeholder="Built / measured / shipped"
                />

                <details className="group rounded-xl bg-slate-50/60 ring-1 ring-slate-200/50 open:bg-white open:ring-slate-200/70">
                  <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-semibold text-slate-800 outline-none marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="mr-2 inline-block w-4 text-slate-400 transition-transform duration-200 group-open:rotate-90">›</span>
                    Education & school details
                  </summary>
                  <div className="border-t border-slate-200/60 px-4 pb-4 pt-1">
                    <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
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
                  </div>
                </details>

                <details className="group rounded-xl bg-slate-50/60 ring-1 ring-slate-200/50 open:bg-white open:ring-slate-200/70">
                  <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-semibold text-slate-800 outline-none marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="mr-2 inline-block w-4 text-slate-400 transition-transform duration-200 group-open:rotate-90">›</span>
                    Resume text & signature
                  </summary>
                  <div className="border-t border-slate-200/60 px-4 pb-4 pt-1">
                    <div className="mt-3 space-y-4">
                      <Field label="Resume text" hint="Optional — richer grounding for the server model.">
                        <textarea
                          className={fieldTextareaClass}
                          rows={6}
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
                  </div>
                </details>
              </div>
            </div>
          </div>
        ) : null}

        {mainTab === "account" ? (
          <div className="cc-fade-in mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
            <ConnectionSettings
              settings={settings}
              setSettings={setSettings}
              showApiAdvanced={showApiAdvanced}
              setShowApiAdvanced={setShowApiAdvanced}
              serverSyncMsg={serverSyncMsg}
            />
            <CloudAndSyncSection
              hydrated={hydrated}
              settings={settings}
              profile={profile}
              setProfile={setProfile}
              serverFeaturesEnabled={gate.phase === "paid"}
              onSignOut={async () => {
                await gate.signOut();
                setSettings(await loadSettings());
              }}
              onOpenCheckout={() => void gate.openStripeCheckout()}
              onOpenBillingPortal={() => void gate.openCustomerPortal()}
            />
          </div>
        ) : null}

        {mainTab === "import" ? (
          <div className="cc-fade-in mt-6 max-w-3xl">
            <ResumeImportSection
              hydrated={hydrated}
              settings={settings}
              profile={profile}
              setProfile={setProfile}
              serverFeaturesEnabled={gate.phase === "paid"}
              onNavigateToTab={setMainTab}
            />
          </div>
        ) : null}
      </div>
      <OptionsBuildFootnote />
    </div>
  );
}
