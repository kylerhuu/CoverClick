import { useCallback, useRef, useState } from "react";
import type { AppSettings, UserProfile } from "../../lib/types";
import { apiGetServerProfile, apiParseResume, apiPutServerProfile } from "../../lib/backendApi";
import { mergeProfileFromExtraction, replaceProfileFromExtraction } from "../../lib/mergeProfile";
import { compactProfileArrays } from "../../lib/profileArrays";
import { saveProfile } from "../../lib/storage";

type Props = {
  settings: AppSettings;
  profile: UserProfile;
  setProfile: (next: UserProfile) => void;
  hydrated: boolean;
  /** Live server + paid subscription (not mock). */
  serverFeaturesEnabled: boolean;
  onSignOut: () => void | Promise<void>;
  onOpenCheckout: () => void | Promise<void>;
  onOpenBillingPortal: () => void | Promise<void>;
};

export function ServerPanels({
  settings,
  profile,
  setProfile,
  hydrated,
  serverFeaturesEnabled,
  onSignOut,
  onOpenCheckout,
  onOpenBillingPortal,
}: Props) {
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeMsg, setResumeMsg] = useState<string | null>(null);
  const [lastExtracted, setLastExtracted] = useState<UserProfile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const base = settings.apiBaseUrl.trim();
  const token = settings.authToken?.trim();
  const canNetwork = hydrated && serverFeaturesEnabled && base.length > 0 && Boolean(token);

  const onLogout = useCallback(async () => {
    setAccountMsg(null);
    await onSignOut();
    setAccountMsg("Signed out.");
    setLastExtracted(null);
  }, [onSignOut]);

  const onPull = useCallback(async () => {
    if (!canNetwork || !token) return;
    setAccountBusy(true);
    setAccountMsg(null);
    try {
      const { profile: remote } = await apiGetServerProfile(base, token);
      if (!remote) {
        setAccountMsg("No profile stored on the server yet — use Push after saving locally.");
        return;
      }
      setProfile(remote);
      await saveProfile(compactProfileArrays(remote));
      setAccountMsg("Loaded profile from server into this page (autosaved).");
    } catch (e) {
      setAccountMsg(e instanceof Error ? e.message : "Pull failed");
    } finally {
      setAccountBusy(false);
    }
  }, [base, canNetwork, setProfile, token]);

  const onPush = useCallback(async () => {
    if (!canNetwork || !token) return;
    setAccountBusy(true);
    setAccountMsg(null);
    try {
      await apiPutServerProfile(base, token, compactProfileArrays(profile));
      setAccountMsg("Profile saved on the server.");
    } catch (e) {
      setAccountMsg(e instanceof Error ? e.message : "Push failed");
    } finally {
      setAccountBusy(false);
    }
  }, [base, canNetwork, profile, token]);

  const onParseResume = useCallback(async () => {
    if (!canNetwork || !token) return;
    const input = fileRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setResumeMsg("Choose a PDF, DOCX, or TXT file first.");
      return;
    }
    setResumeBusy(true);
    setResumeMsg(null);
    try {
      const { profile: extracted, warnings } = await apiParseResume(base, token, file);
      setLastExtracted(extracted);
      setResumeMsg(
        [
          "Extraction finished. Review carefully, then merge or replace.",
          ...(warnings?.length ? warnings : []),
        ].join(" "),
      );
    } catch (e) {
      setLastExtracted(null);
      setResumeMsg(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setResumeBusy(false);
    }
  }, [base, canNetwork, token]);

  if (settings.useMock) {
    return (
      <section className="mt-14 border-t border-slate-200/90 pt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cloud account</h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-600">
          <strong>Mock mode</strong> is on — the extension does not call your API. Turn off mock under Backend to use Google sign-in, Stripe billing, and server-backed profile sync from the side panel.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="mt-14 border-t border-slate-200/90 pt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cloud account</h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-600">
          Sign in and subscribe from the <strong>side panel</strong>. When you have an active plan, you can pull/push your profile and run resume import here.
        </p>
        {!canNetwork ? (
          <p className="mt-3 text-[12px] text-amber-800">
            You need an active subscription to use server features. Open the CoverClick side panel to sign in with Google and subscribe.
          </p>
        ) : null}
        {settings.authEmail ? (
          <p className="mt-3 text-[12px] text-slate-600">
            Signed in as <span className="font-medium text-slate-900">{settings.authEmail}</span>
          </p>
        ) : null}
        {accountMsg ? (
          <p className="mt-2 text-[12px] text-slate-700" role="status">
            {accountMsg}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-[12px] text-slate-600 disabled:opacity-40"
            disabled={!token || accountBusy}
            onClick={() => void onLogout()}
          >
            Sign out
          </button>
          <button
            type="button"
            className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[12px] font-medium text-indigo-950 disabled:opacity-40"
            disabled={accountBusy}
            onClick={() => void onOpenCheckout()}
          >
            Subscribe / upgrade
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-[12px] text-slate-600 disabled:opacity-40"
            disabled={!token || accountBusy}
            onClick={() => void onOpenBillingPortal()}
          >
            Manage billing
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-[12px] text-slate-600 disabled:opacity-40"
            disabled={!canNetwork || accountBusy}
            onClick={() => void onPull()}
          >
            Pull profile from server
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-[12px] text-slate-600 disabled:opacity-40"
            disabled={!canNetwork || accountBusy}
            onClick={() => void onPush()}
          >
            Push profile to server
          </button>
        </div>
      </section>

      <section className="mt-10 border-t border-slate-200/90 pt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Resume → profile (AI)</h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-600">
          Upload a resume and let the server extract fields with OpenAI. Accuracy varies by layout; always review before applying.
        </p>
        <div className="mt-4 max-w-2xl space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            disabled={!canNetwork || resumeBusy}
            className="block w-full text-[12px] text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-slate-800"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-40"
              disabled={!canNetwork || resumeBusy}
              onClick={() => void onParseResume()}
            >
              {resumeBusy ? <span className="cc-spinner" aria-hidden /> : null}
              {resumeBusy ? "Extracting…" : "Extract with AI"}
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-200 px-3 py-1.5 text-[12px] text-slate-700 disabled:opacity-40"
              disabled={!lastExtracted}
              onClick={() => {
                if (!lastExtracted) return;
                setProfile(mergeProfileFromExtraction(profile, lastExtracted));
                setResumeMsg("Merged extraction into your profile (autosave will run).");
              }}
            >
              Merge into profile
            </button>
            <button
              type="button"
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] text-amber-950 disabled:opacity-40"
              disabled={!lastExtracted}
              onClick={() => {
                if (!lastExtracted) return;
                setProfile(replaceProfileFromExtraction(lastExtracted));
                setResumeMsg("Replaced profile with extraction (autosave will run).");
              }}
            >
              Replace profile
            </button>
          </div>
          {resumeMsg ? <p className="text-[12px] text-slate-700">{resumeMsg}</p> : null}
        </div>
      </section>
    </>
  );
}
