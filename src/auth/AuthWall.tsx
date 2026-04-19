import type { AccountMeResponse } from "../lib/types";
import { cn } from "../lib/classNames";

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

const card = cn(
  "mx-auto max-w-md rounded-2xl border border-slate-200/90 bg-white p-8 shadow-lg",
  "text-center",
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
      <div className={cn("flex min-h-[360px] flex-col items-center justify-center bg-slate-100 px-4 py-10", compact && "min-h-0 flex-1")}>
        <div className={card}>
          <h1 className="text-lg font-bold text-slate-900">CoverClick isn’t configured</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
            This extension build is missing <span className="font-mono text-[12px]">VITE_COVERCLICK_API_ORIGIN</span>. Add it to the project{" "}
            <span className="font-mono">.env</span> and rebuild, or use <strong>Mock generation</strong> in Options for local UI testing.
          </p>
        </div>
      </div>
    );
  }

  if (mode === "signed_out") {
    return (
      <div className={cn("flex min-h-[360px] flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-indigo-50/40 px-4 py-10", compact && "min-h-0 flex-1")}>
        <div className={card}>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-[14px] font-black text-white shadow-md">
            CC
          </div>
          <h1 className="text-lg font-bold text-slate-900">Welcome to CoverClick</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
            Sign in with Google to use job-aware cover letters. Your subscription is managed securely on our servers.
          </p>
          {authError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800" role="alert">
              {authError}
            </p>
          ) : null}
          <button
            type="button"
            disabled={authBusy}
            onClick={() => onGoogleSignIn()}
            className={cn(
              "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-slate-800 shadow-sm",
              "hover:bg-slate-50 disabled:opacity-50",
            )}
          >
            {authBusy ? <span className="cc-spinner h-4 w-4 shrink-0 border-2" aria-hidden /> : null}
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  /* unpaid */
  return (
    <div className={cn("flex min-h-[360px] flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-amber-50/30 px-4 py-10", compact && "min-h-0 flex-1")}>
      <div className={card}>
        <h1 className="text-lg font-bold text-slate-900">Upgrade to continue</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
          You’re signed in as <span className="font-medium text-slate-900">{me?.email ?? "—"}</span>. An active subscription is required for AI
          features, profile sync, and exports that use the server.
        </p>
        {me?.subscriptionStatus ? (
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">Status: {me.subscriptionStatus}</p>
        ) : null}
        {authError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800" role="alert">
            {authError}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            disabled={authBusy}
            onClick={() => onSubscribe()}
            className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 px-4 py-3 text-[13px] font-semibold text-white shadow-md hover:from-indigo-500 hover:to-sky-500 disabled:opacity-50"
          >
            {authBusy ? <span className="cc-spinner h-4 w-4 shrink-0 border-2 border-white/40 border-t-white" aria-hidden /> : null}
            Subscribe with Stripe
          </button>
          <button
            type="button"
            disabled={authBusy}
            onClick={() => onManageBilling()}
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            Manage billing
          </button>
          <button
            type="button"
            disabled={authBusy}
            onClick={() => onRefreshAccess()}
            className="text-[12px] font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900"
          >
            I completed checkout — refresh
          </button>
          <button
            type="button"
            onClick={() => onSignOut()}
            className="mt-2 text-[12px] font-medium text-slate-500 hover:text-slate-800"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
