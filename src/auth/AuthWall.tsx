import type { AccountMeResponse } from "../lib/types";
import { cn } from "../lib/classNames";
import { ccBtnPrimary, ccBtnSecondary, ccFocusRing } from "../ui/ccUi";

type Props = {
  variant: "sidepanel" | "options";
  mode: "signed_out" | "unpaid" | "no_api";
  me: AccountMeResponse | null;
  authBusy: boolean;
  authError: string | null;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onSubscribe: () => void;
  onManageBilling: () => void;
  onRefreshAccess: () => void;
};

function shell(compact: boolean) {
  return cn(
    "flex flex-col items-center justify-center px-4 py-8",
    "bg-gradient-to-b from-[#eef1f6] via-[#f4f6f9] to-[#f8fafc]",
    compact ? "min-h-0 flex-1 py-6" : "min-h-[360px] py-12",
  );
}

function panel(compact: boolean) {
  return cn(
    "relative w-full max-w-[22rem] overflow-hidden rounded-2xl bg-white/95 p-7 text-center shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.06]",
    compact && "max-w-[20rem] px-5 py-6",
  );
}

const topAccent = (
  <div
    className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-500 opacity-90"
    aria-hidden
  />
);

export function AuthWall({
  variant,
  mode,
  me,
  authBusy,
  authError,
  onGoogleSignIn,
  onSignOut,
  onSubscribe,
  onManageBilling,
  onRefreshAccess,
}: Props) {
  const compact = variant === "sidepanel";

  if (mode === "no_api") {
    return (
      <div className={shell(compact)}>
        <div className={panel(compact)}>
          {topAccent}
          <h1 className="mt-1 text-[17px] font-bold tracking-tight text-slate-900">Finish setup</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
            This build does not know which CoverClick server to use. Ask your team for the packaged extension, or open
            Options and use demo mode while you test the UI.
          </p>
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-left text-[11px] leading-snug text-slate-600 ring-1 ring-slate-200/80">
            <span className="font-semibold text-slate-800">For developers:</span> set{" "}
            <code className="rounded bg-white px-1 font-mono text-[10px] text-slate-700">VITE_COVERCLICK_API_ORIGIN</code>{" "}
            in the project <span className="font-mono text-[10px]">.env</span>, then rebuild.
          </p>
        </div>
      </div>
    );
  }

  if (mode === "signed_out") {
    return (
      <div className={shell(compact)}>
        <div className={panel(compact)}>
          {topAccent}
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-[13px] font-black tracking-tight text-white shadow-lg shadow-indigo-900/25">
            CC
          </div>
          <h1 className="text-[17px] font-bold tracking-tight text-slate-900">CoverClick</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
            Sign in once. We will keep your profile in sync and draft letters from the job page you have open.
          </p>
          {authError ? (
            <p className="mt-4 rounded-lg border border-red-200/90 bg-red-50 px-3 py-2 text-left text-[12px] text-red-800" role="alert">
              {authError}
            </p>
          ) : null}
          <button
            type="button"
            disabled={authBusy}
            onClick={() => onGoogleSignIn()}
            className={cn(ccBtnSecondary, "mt-6 w-full border-slate-200 py-2.5 text-[13px] shadow-md")}
          >
            {authBusy ? <span className="cc-spinner h-4 w-4 shrink-0 border-2" aria-hidden /> : null}
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={shell(compact)}>
      <div className={panel(compact)}>
        {topAccent}
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700/90">Subscription</p>
        <h1 className="mt-1.5 text-[17px] font-bold tracking-tight text-slate-900">Unlock live drafting</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
          Signed in as <span className="font-semibold text-slate-900">{me?.email ?? "—"}</span>. An active plan enables
          AI letters, cloud profile, and imports.
        </p>
        {me?.subscriptionStatus ? (
          <p className="mt-2 text-[11px] font-medium text-slate-500">
            Current status: <span className="text-slate-700">{me.subscriptionStatus}</span>
          </p>
        ) : null}
        {authError ? (
          <p className="mt-4 rounded-lg border border-red-200/90 bg-red-50 px-3 py-2 text-left text-[12px] text-red-800" role="alert">
            {authError}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            disabled={authBusy}
            onClick={() => onSubscribe()}
            className={cn(ccBtnPrimary, "w-full py-2.5")}
          >
            {authBusy ? <span className="cc-spinner h-4 w-4 shrink-0 border-2 border-white/40 border-t-white" aria-hidden /> : null}
            Subscribe
          </button>
          <button
            type="button"
            disabled={authBusy}
            onClick={() => onManageBilling()}
            className={cn(ccBtnSecondary, "w-full py-2.5")}
          >
            Billing & invoices
          </button>
          <button
            type="button"
            disabled={authBusy}
            onClick={() => onRefreshAccess()}
            className={cn(
              "rounded-lg py-2 text-[12px] font-semibold text-indigo-700 hover:bg-indigo-50/80",
              ccFocusRing,
            )}
          >
            I finished checkout — refresh access
          </button>
          <button
            type="button"
            onClick={() => onSignOut()}
            className="mt-1 text-[12px] font-medium text-slate-500 hover:text-slate-800"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
