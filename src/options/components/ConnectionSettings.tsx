import type { Dispatch, SetStateAction } from "react";
import type { AppSettings } from "../../lib/types";
import { hasBuiltInApiOrigin, resolveApiBaseUrl, VITE_COVERCLICK_API_ORIGIN } from "../../lib/apiOrigin";
import { cn, fieldInputClass } from "../../lib/classNames";
import { Field } from "./Field";
import { ccBtnGhost, ccEyebrow, ccMuted, ccSectionTitle, ccSurfaceQuiet } from "../../ui/ccUi";

type Props = {
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  showApiAdvanced: boolean;
  setShowApiAdvanced: Dispatch<SetStateAction<boolean>>;
  serverSyncMsg: string | null;
};

function summarizeOrigin(url: string): { label: string; detail: string } {
  const t = url.trim();
  if (!t) {
    return {
      label: "Not set",
      detail: "Add your CoverClick API URL at build time, or use Advanced to point at a server.",
    };
  }
  try {
    const u = new URL(t);
    return { label: `${u.hostname}`, detail: t };
  } catch {
    return { label: "Custom", detail: t };
  }
}

export function ConnectionSettings({
  settings,
  setSettings,
  showApiAdvanced,
  setShowApiAdvanced,
  serverSyncMsg,
}: Props) {
  const effective = settings.apiBaseUrl.trim();
  const summary = summarizeOrigin(effective);
  const baked = hasBuiltInApiOrigin();

  return (
    <div className="space-y-5">
      <header>
        <p className={ccEyebrow}>Connection</p>
        <h2 className={cn(ccSectionTitle, "mt-1")}>How CoverClick reaches your workspace</h2>
        <p className={cn(ccMuted, "mt-2 max-w-2xl")}>
          Letters and profile sync use your CoverClick cloud — not ChatGPT in the tab. Your API keys stay on the server.
        </p>
      </header>

      <div className={cn(ccSurfaceQuiet, "px-4 py-3.5")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500">Active endpoint</p>
            <p className="mt-0.5 text-[14px] font-semibold text-slate-900">{summary.label}</p>
            <p className="mt-1 break-all font-mono text-[11px] leading-snug text-slate-500">{summary.detail || "—"}</p>
          </div>
          {baked ? (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/60">
              Build default
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/70">
              No baked URL
            </span>
          )}
        </div>
        {!baked && !effective ? (
          <p className="mt-3 text-[12px] leading-snug text-amber-900/90">
            This build has no default server URL. Turn on demo mode for local UI, or set a server under Advanced.
          </p>
        ) : null}
        {baked && VITE_COVERCLICK_API_ORIGIN ? (
          <p className="mt-3 text-[11px] text-slate-500">
            Packaged default:{" "}
            <span className="font-mono text-slate-600">{VITE_COVERCLICK_API_ORIGIN}</span>
          </p>
        ) : null}
      </div>

      {serverSyncMsg ? (
        <p className="rounded-lg border border-red-200/80 bg-red-50/90 px-3 py-2 text-[12px] text-red-800" role="alert">
          {serverSyncMsg}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-900">Demo mode</p>
          <p className="mt-0.5 text-[12px] leading-snug text-slate-600">
            Generate sample letters without calling your API. Turn off when you want live drafts and cloud profile.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm">
          <span className="text-[12px] font-semibold text-slate-700">Mock generation</span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/40"
            checked={settings.useMock}
            onChange={(e) => setSettings({ ...settings, useMock: e.target.checked })}
          />
        </label>
      </div>

      <div className="border-t border-slate-200/60 pt-4">
        <button
          type="button"
          className={cn(ccBtnGhost, "w-full justify-start text-left text-[12px] text-slate-600")}
          aria-expanded={showApiAdvanced}
          onClick={() => setShowApiAdvanced((v) => !v)}
        >
          <span
            className={cn(
              "mr-2 inline-block w-4 text-center text-slate-400 transition-transform duration-200",
              showApiAdvanced && "rotate-90",
            )}
            aria-hidden
          >
            ›
          </span>
          Advanced: custom API URL
        </button>
        {showApiAdvanced ? (
          <div className="mt-3 pl-1">
            <Field
              label="API base URL"
              hint="For developers or staging. Leave empty to use the packaged default. No trailing slash."
            >
              <input
                className={fieldInputClass}
                value={settings.apiOriginOverride ?? ""}
                onChange={(e) => {
                  const raw = e.target.value.trim().replace(/\/+$/, "");
                  setSettings({
                    ...settings,
                    apiOriginOverride: raw.length > 0 ? raw : undefined,
                    apiBaseUrl: resolveApiBaseUrl(raw),
                  });
                }}
                placeholder={hasBuiltInApiOrigin() ? VITE_COVERCLICK_API_ORIGIN : "https://api.example.com"}
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
          </div>
        ) : null}
      </div>
    </div>
  );
}
