import { useEffect, useMemo, useState } from "react";
import type { AppSettings, DefaultTone, UserProfile } from "../lib/types";
import { DEFAULT_SETTINGS, EMPTY_PROFILE } from "../lib/types";
import { cn } from "../lib/classNames";
import { compactProfileArrays } from "../lib/profileArrays";
import { apiGetServerProfile, apiPutServerProfile } from "../lib/backendApi";
import { loadProfile, loadSettings, saveProfile, saveSettings } from "../lib/storage";
import { AuthWall } from "../auth/AuthWall";
import { useAccessGate } from "../auth/useAccessGate";
import { AutosaveStatus, type SaveStatus, type ServerSyncStatus } from "./components/AutosaveStatus";
import { AccountWorkspaceSection } from "./components/AccountWorkspaceSection";
import { OptionsSectionNav, type OptionsMainTab } from "./components/OptionsSectionNav";
import { ProfileWorkspaceSection } from "./components/ProfileWorkspaceSection";
import { ResumeImportSection } from "./components/ResumeImportSection";
import { SavedResumesSection } from "./components/SavedResumesSection";
import { ApplicationHubSection } from "../hub/ApplicationHubSection";
import { clearRequestedOptionsTab, OPTIONS_TAB_KEY, readRequestedOptionsTab } from "../lib/openOptionsTab";
import { wsShell } from "../ui/workspaceUi";
import { EXTENSION_BUILD_ID } from "virtual:coverclick-build";

const AUTOSAVE_MS = 700;

/** Published Google Doc — linked from Options for users and store review. */
const COVERCLICK_PRIVACY_POLICY_URL =
  "https://docs.google.com/document/d/e/2PACX-1vR9MqoEtybZBmumYWfHCn4Jy70AlZOi6O8KUSHn6Tfpre-d5FEunSK4BdCqx04U8OKounmZHDwtY72C/pub";

function OptionsBuildFootnote() {
  const isProd = import.meta.env.PROD;
  return (
    <footer className="mx-auto max-w-5xl border-t border-slate-200/80 px-4 py-4 text-center text-[10px] leading-relaxed text-slate-400 sm:px-5">
      <p className={isProd ? undefined : "mb-3"}>
        <a
          href={COVERCLICK_PRIVACY_POLICY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold text-indigo-600 underline decoration-indigo-300/60 underline-offset-2 hover:text-indigo-800"
        >
          Privacy policy
        </a>
      </p>
      {!isProd ? (
        <>
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
        </>
      ) : null}
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
    const applyHash = () => {
      const hash = window.location.hash.replace(/^#/, "").split("?")[0];
      if (hash === "applications") setMainTab("applications");
      if (hash === "resumes") setMainTab("resumes");
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => {
    void (async () => {
      const data = await chrome.storage.local.get(OPTIONS_TAB_KEY);
      const tab = readRequestedOptionsTab(data);
      if (tab === "resumes") setMainTab("resumes");
      if (tab === "applications") setMainTab("applications");
      if (tab) await clearRequestedOptionsTab();
    })();
  }, []);

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

  /** Keep Options `settings` in sync with chrome.storage when auth changes elsewhere (e.g. sign-in from side panel). */
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    void loadSettings().then((s) => {
      if (!cancelled) setSettings(s);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, gate.phase, gate.me?.email]);

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
      <div className={cn("flex min-h-screen flex-col text-slate-600", wsShell)}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <span className="cc-spinner h-8 w-8 border-[3px]" aria-hidden />
          <p className="text-[13px] font-medium">Loading…</p>
        </div>
        <OptionsBuildFootnote />
      </div>
    );
  }

  if (gate.phase === "no_api" || gate.phase === "signed_out" || gate.phase === "account_error") {
    return (
      <div className={cn("flex min-h-full flex-col text-slate-900", wsShell)}>
        <div className="min-h-0 flex-1">
          <AuthWall
            variant="options"
            mode={
              gate.phase === "no_api"
                ? "no_api"
                : gate.phase === "signed_out"
                  ? "signed_out"
                  : "account_error"
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
    <div className={cn("flex min-h-full flex-col text-slate-900", wsShell)}>
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5B4CF0] text-[11px] font-black tracking-tight text-white shadow-sm">
              CC
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[15px] font-bold tracking-tight text-slate-900">CoverClick</h1>
                <span className="rounded-full bg-[#5B4CF0]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#5B4CF0]">
                  Workspace
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
            {gate.me?.email ? (
              <span className="hidden max-w-[200px] truncate text-[11px] text-slate-500 sm:block" title={gate.me.email}>
                {gate.me.email}
              </span>
            ) : null}
            <AutosaveStatus profile={profileSave} settings={settingsSave} server={serverSync} />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-5">
        <div className="border-b border-slate-200/80 bg-transparent pt-1">
          <OptionsSectionNav active={mainTab} onChange={setMainTab} />
        </div>

        {loadError ? (
          <div className="mt-4 rounded-lg border border-red-200/90 bg-red-50 px-3 py-2.5 text-[13px] text-red-800">{loadError}</div>
        ) : null}

        {mainTab === "account" && gate.authError ? (
          <div
            className="mt-4 rounded-lg border border-red-200/90 bg-red-50 px-3 py-2.5 text-[13px] text-red-800"
            role="alert"
          >
            {gate.authError}
          </div>
        ) : null}

        {mainTab === "profile" ? (
          <ProfileWorkspaceSection
            profile={profile}
            setProfile={setProfile}
            settings={settings}
            tones={tones}
            onNavigateImport={() => setMainTab("import")}
          />
        ) : null}

        {mainTab === "resumes" ? (
          <SavedResumesSection />
        ) : null}

        {mainTab === "applications" ? <ApplicationHubSection /> : null}

        {mainTab === "account" ? (
          <AccountWorkspaceSection
            settings={settings}
            setSettings={setSettings}
            profile={profile}
            setProfile={setProfile}
            hydrated={hydrated}
            serverFeaturesEnabled={gate.phase === "paid"}
            showApiAdvanced={showApiAdvanced}
            setShowApiAdvanced={setShowApiAdvanced}
            serverSyncMsg={serverSyncMsg}
            onSignOut={async () => {
              await gate.signOut();
              setSettings(await loadSettings());
            }}
            onOpenCheckout={() => void gate.openStripeCheckout()}
            onOpenBillingPortal={() => void gate.openCustomerPortal()}
          />
        ) : null}

        {mainTab === "import" ? (
          <ResumeImportSection
            hydrated={hydrated}
            settings={settings}
            profile={profile}
            setProfile={setProfile}
            serverFeaturesEnabled={gate.phase === "paid"}
            onNavigateToTab={setMainTab}
          />
        ) : null}
      </div>
      <OptionsBuildFootnote />
    </div>
  );
}
