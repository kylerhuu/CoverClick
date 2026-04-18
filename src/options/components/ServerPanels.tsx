import { useCallback, useRef, useState } from "react";
import type { AppSettings, UserProfile } from "../../lib/types";
import { fieldInputClass } from "../../lib/classNames";
import { Field } from "./Field";
import { apiGetServerProfile, apiLogin, apiParseResume, apiPutServerProfile, apiRegister } from "../../lib/backendApi";
import { mergeProfileFromExtraction, replaceProfileFromExtraction } from "../../lib/mergeProfile";
import { compactProfileArrays } from "../../lib/profileArrays";
import { saveProfile } from "../../lib/storage";

type Props = {
  settings: AppSettings;
  setSettings: (next: AppSettings) => void;
  profile: UserProfile;
  setProfile: (next: UserProfile) => void;
  hydrated: boolean;
};

export function ServerPanels({ settings, setSettings, profile, setProfile, hydrated }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeMsg, setResumeMsg] = useState<string | null>(null);
  const [lastExtracted, setLastExtracted] = useState<UserProfile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const base = settings.apiBaseUrl.trim();
  const canNetwork = hydrated && !settings.useMock && base.length > 0;
  const token = settings.authToken?.trim();

  const onRegister = useCallback(async () => {
    if (!canNetwork) return;
    setAccountBusy(true);
    setAccountMsg(null);
    try {
      const { token: t, user } = await apiRegister(base, { email: email.trim(), password });
      setSettings({ ...settings, authToken: t, authEmail: user.email });
      setAccountMsg("Account created. You can pull/push profile or parse a resume.");
      setPassword("");
    } catch (e) {
      setAccountMsg(e instanceof Error ? e.message : "Register failed");
    } finally {
      setAccountBusy(false);
    }
  }, [base, canNetwork, email, password, setSettings, settings]);

  const onLogin = useCallback(async () => {
    if (!canNetwork) return;
    setAccountBusy(true);
    setAccountMsg(null);
    try {
      const { token: t, user } = await apiLogin(base, { email: email.trim(), password });
      setSettings({ ...settings, authToken: t, authEmail: user.email });
      setAccountMsg("Signed in.");
      setPassword("");
    } catch (e) {
      setAccountMsg(e instanceof Error ? e.message : "Login failed");
    } finally {
      setAccountBusy(false);
    }
  }, [base, canNetwork, email, password, setSettings, settings]);

  const onLogout = useCallback(() => {
    setSettings({ ...settings, authToken: undefined, authEmail: undefined });
    setAccountMsg("Signed out.");
    setLastExtracted(null);
  }, [setSettings, settings]);

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

  return (
    <>
      <section className="mt-14 border-t border-slate-200/90 pt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Server account</h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-600">
          Optional: create an account on your CoverClick server to sync your profile and run AI resume import. The
          extension still keeps a local copy in Chrome; the server stores another copy in its database.
        </p>
        {!canNetwork ? (
          <p className="mt-3 text-[12px] text-amber-800">
            Turn off <strong>Mock generation</strong> and set a valid <strong>API base URL</strong> in the Backend
            section above to use account features.
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
        <div className="mt-5 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Account email">
            <input
              className={fieldInputClass}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!canNetwork || accountBusy}
            />
          </Field>
          <Field label="Password">
            <input
              className={fieldInputClass}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!canNetwork || accountBusy}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-40"
            disabled={!canNetwork || accountBusy}
            onClick={() => void onRegister()}
          >
            Register
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-800 disabled:opacity-40"
            disabled={!canNetwork || accountBusy}
            onClick={() => void onLogin()}
          >
            Log in
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-[12px] text-slate-600 disabled:opacity-40"
            disabled={!token || accountBusy}
            onClick={onLogout}
          >
            Sign out
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-[12px] text-slate-600 disabled:opacity-40"
            disabled={!canNetwork || !token || accountBusy}
            onClick={() => void onPull()}
          >
            Pull profile from server
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-[12px] text-slate-600 disabled:opacity-40"
            disabled={!canNetwork || !token || accountBusy}
            onClick={() => void onPush()}
          >
            Push profile to server
          </button>
        </div>
      </section>

      <section className="mt-10 border-t border-slate-200/90 pt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Resume → profile (AI)</h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-600">
          Upload a resume and let the server extract fields with OpenAI. Accuracy varies by layout; always review before
          applying. Merge keeps your existing values when the model leaves a field blank.
        </p>
        <div className="mt-4 max-w-2xl space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            disabled={!canNetwork || !token || resumeBusy}
            className="block w-full text-[12px] text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-slate-800"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-40"
              disabled={!canNetwork || !token || resumeBusy}
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
