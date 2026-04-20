import type { Dispatch, SetStateAction } from "react";
import { useCallback, useState } from "react";
import type { AppSettings, UserProfile } from "../../lib/types";
import { apiGetServerProfile, apiPutServerProfile } from "../../lib/backendApi";
import { compactProfileArrays } from "../../lib/profileArrays";
import { saveProfile } from "../../lib/storage";
import { cn } from "../../lib/classNames";
import { ccBtnGhost, ccBtnPrimarySm, ccBtnSecondarySm, ccEyebrow, ccMuted, ccSectionTitle, ccSurfaceQuiet } from "../../ui/ccUi";

type Props = {
  settings: AppSettings;
  profile: UserProfile;
  setProfile: Dispatch<SetStateAction<UserProfile>>;
  hydrated: boolean;
  serverFeaturesEnabled: boolean;
  onSignOut: () => void | Promise<void>;
  onOpenCheckout: () => void | Promise<void>;
  onOpenBillingPortal: () => void | Promise<void>;
};

export function CloudAndSyncSection({
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

  const base = settings.apiBaseUrl.trim();
  const token = settings.authToken?.trim();
  /** Session may exist in storage before Options `settings` state catches up — still allow billing portal. */
  const hasLikelySession = Boolean(token) || Boolean(settings.authEmail?.trim());
  const canNetwork = hydrated && serverFeaturesEnabled && base.length > 0 && Boolean(token);

  const onLogout = useCallback(async () => {
    setAccountMsg(null);
    await onSignOut();
    setAccountMsg("Signed out.");
  }, [onSignOut]);

  const onPull = useCallback(async () => {
    if (!canNetwork || !token) return;
    setAccountBusy(true);
    setAccountMsg(null);
    try {
      const { profile: remote } = await apiGetServerProfile(base, token);
      if (!remote) {
        setAccountMsg("Nothing on the server yet — save from this page with Push.");
        return;
      }
      setProfile(compactProfileArrays(remote));
      await saveProfile(compactProfileArrays(remote));
      setAccountMsg("Loaded the latest profile from the cloud.");
    } catch (e) {
      setAccountMsg(e instanceof Error ? e.message : "Could not pull profile");
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
      setAccountMsg("Profile saved to the cloud.");
    } catch (e) {
      setAccountMsg(e instanceof Error ? e.message : "Could not push profile");
    } finally {
      setAccountBusy(false);
    }
  }, [base, canNetwork, profile, token]);

  if (settings.useMock) {
    return (
      <div className="space-y-3">
        <header>
          <p className={ccEyebrow}>Cloud</p>
          <h2 className={cn(ccSectionTitle, "mt-1")}>Account & sync</h2>
        </header>
        <div className={cn(ccSurfaceQuiet, "border border-amber-100/80 bg-amber-50/35 px-4 py-3")}>
          <p className={cn(ccMuted, "text-[13px]")}>
            {import.meta.env.PROD ? (
              <>
                <span className="font-semibold text-amber-950">Cloud features are off.</span> Sign in from the side panel
                with an active plan to sync your profile and use live generation.
              </>
            ) : (
              <>
                <span className="font-semibold text-amber-950">Demo mode is on.</span> The extension stays offline. Turn off
                demo mode under Connection to sign in, subscribe, and sync your profile.
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className={ccEyebrow}>Cloud</p>
        <h2 className={cn(ccSectionTitle, "mt-1")}>Account & sync</h2>
        <p className={cn(ccMuted, "mt-2 max-w-2xl")}>
          {serverFeaturesEnabled
            ? "Your plan is active — sync your profile with the cloud and open billing if you need invoices, payment method, or cancellation."
            : "Your subscription unlocks live drafting and a profile that follows you across devices."}
        </p>
      </header>

      <div className={cn(ccSurfaceQuiet, "px-4 py-4")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {settings.authEmail ? (
              <>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Signed in</p>
                <p className="mt-0.5 truncate text-[15px] font-semibold text-slate-900">{settings.authEmail}</p>
              </>
            ) : (
              <p className="text-[13px] text-slate-600">Open the side panel to sign in with Google.</p>
            )}
            {!canNetwork ? (
              <p className="mt-2 text-[12px] leading-snug text-amber-900/90">
                An active plan is required for cloud sync. Use the side panel to finish checkout if needed.
              </p>
            ) : null}
            {accountMsg ? (
              <p className="mt-2 text-[12px] text-slate-600" role="status">
                {accountMsg}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {serverFeaturesEnabled ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 ring-1 ring-emerald-200/70">
                Active plan
              </span>
            ) : (
              <button type="button" className={ccBtnPrimarySm} disabled={accountBusy} onClick={() => void onOpenCheckout()}>
                Subscribe
              </button>
            )}
            <button
              type="button"
              className={ccBtnSecondarySm}
              disabled={!hasLikelySession || accountBusy}
              onClick={() => void onOpenBillingPortal()}
            >
              Manage billing
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200/50 pt-4">
          <button
            type="button"
            className={ccBtnSecondarySm}
            disabled={!canNetwork || accountBusy}
            onClick={() => void onPull()}
          >
            Pull latest
          </button>
          <button
            type="button"
            className={ccBtnSecondarySm}
            disabled={!canNetwork || accountBusy}
            onClick={() => void onPush()}
          >
            Push to cloud
          </button>
          <button
            type="button"
            className={cn(ccBtnGhost, "ml-auto text-slate-500")}
            disabled={!token || accountBusy}
            onClick={() => void onLogout()}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
