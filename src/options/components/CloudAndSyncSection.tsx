import type { Dispatch, SetStateAction } from "react";
import { useCallback, useState } from "react";
import type { AppSettings, UserProfile } from "../../lib/types";
import { apiGetServerProfile, apiPutServerProfile } from "../../lib/backendApi";
import { compactProfileArrays } from "../../lib/profileArrays";
import { saveProfile } from "../../lib/storage";
import { cn } from "../../lib/classNames";
import { WorkspaceCard, WorkspaceSection } from "../../ui/workspaceUi";
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
  /** When true, renders as cards inside Account workspace (no page header). */
  embedded?: boolean;
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
  embedded = false,
}: Props) {
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const [lastSyncedLabel] = useState("Autosave enabled");

  const base = settings.apiBaseUrl.trim();
  const token = settings.authToken?.trim();
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
        setAccountMsg("Nothing on the server yet — save from Profile to sync.");
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
    const mockBody = (
      <div className={cn(embedded ? "" : ccSurfaceQuiet, embedded ? "" : "border border-amber-100/80 bg-amber-50/35 px-4 py-3")}>
        <WorkspaceCard className="border-amber-100/80 bg-amber-50/30">
          <p className={cn(ccMuted, "text-[13px]")}>
            {import.meta.env.PROD ? (
              <>
                <span className="font-semibold text-amber-950">Cloud features are off.</span> Sign in from the side panel
                with an active plan to sync your profile and use live generation.
              </>
            ) : (
              <>
                <span className="font-semibold text-amber-950">Demo mode is on.</span> Turn off demo mode in Advanced
                settings to sign in, subscribe, and sync your profile.
              </>
            )}
          </p>
        </WorkspaceCard>
      </div>
    );

    if (embedded) {
      return (
        <WorkspaceSection title="Cloud & billing">
          {mockBody}
        </WorkspaceSection>
      );
    }

    return (
      <div className="space-y-3">
        <header>
          <p className={ccEyebrow}>Cloud</p>
          <h2 className={cn(ccSectionTitle, "mt-1")}>Account & sync</h2>
        </header>
        {mockBody}
      </div>
    );
  }

  const syncCard = (
    <WorkspaceCard>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cloud sync</p>
          <p className="mt-1 text-[14px] font-semibold text-slate-900">{lastSyncedLabel}</p>
          <p className="mt-1 text-[12px] text-slate-500">Profile changes autosave and sync when your plan is active.</p>
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
        <div className="flex shrink-0 flex-wrap gap-2">
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
        </div>
      </div>
    </WorkspaceCard>
  );

  const billingCard = (
    <WorkspaceCard>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Billing</p>
          <p className="mt-1 text-[14px] font-semibold text-slate-900">
            {serverFeaturesEnabled ? "Manage your subscription" : "Unlock live generation & sync"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            className={ccBtnPrimarySm}
            disabled={!hasLikelySession || accountBusy}
            onClick={() => void onOpenBillingPortal()}
          >
            Manage subscription
          </button>
        </div>
      </div>
      <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
        <button
          type="button"
          className={cn(ccBtnGhost, "text-slate-500")}
          disabled={!token || accountBusy}
          onClick={() => void onLogout()}
        >
          Sign out
        </button>
      </div>
    </WorkspaceCard>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        <WorkspaceSection title="Cloud & billing">{syncCard}</WorkspaceSection>
        {billingCard}
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
      {syncCard}
      {billingCard}
    </div>
  );
}
