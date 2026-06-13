import type { Dispatch, SetStateAction } from "react";
import { ConnectionSettings } from "./ConnectionSettings";
import { CloudAndSyncSection } from "./CloudAndSyncSection";
import type { AppSettings, UserProfile } from "../../lib/types";
import { cn } from "../../lib/classNames";
import { WorkspaceCard, WorkspaceHero, WorkspaceSection } from "../../ui/workspaceUi";
import { PlanBadge } from "../../ui/PlanBadge";
import { ccBtnGhost } from "../../ui/ccUi";

type Props = {
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  profile: UserProfile;
  setProfile: Dispatch<SetStateAction<UserProfile>>;
  hydrated: boolean;
  serverFeaturesEnabled: boolean;
  showApiAdvanced: boolean;
  setShowApiAdvanced: Dispatch<SetStateAction<boolean>>;
  serverSyncMsg: string | null;
  onSignOut: () => void | Promise<void>;
  onDeleteAccount: () => void | Promise<void>;
  onOpenCheckout: () => void | Promise<void>;
  onOpenBillingPortal: () => void | Promise<void>;
};

export function AccountWorkspaceSection({
  settings,
  setSettings,
  profile,
  setProfile,
  hydrated,
  serverFeaturesEnabled,
  showApiAdvanced,
  setShowApiAdvanced,
  serverSyncMsg,
  onSignOut,
  onDeleteAccount,
  onOpenCheckout,
  onOpenBillingPortal,
}: Props) {
  const displayName = profile.fullName?.trim() || settings.authEmail?.split("@")[0] || "Your account";

  return (
    <div className="cc-fade-in mt-4 space-y-6">
      <WorkspaceHero>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Account</p>
            <h2 className="mt-1 text-[20px] font-bold tracking-tight text-slate-900">{displayName}</h2>
            {settings.authEmail ? (
              <p className="mt-0.5 text-[13px] text-slate-500">{settings.authEmail}</p>
            ) : null}
          </div>
          <PlanBadge
            isPro={serverFeaturesEnabled && !settings.useMock}
            loading={false}
            onUpgrade={onOpenCheckout}
          />
        </div>
      </WorkspaceHero>

      <CloudAndSyncSection
        hydrated={hydrated}
        settings={settings}
        profile={profile}
        setProfile={setProfile}
        serverFeaturesEnabled={serverFeaturesEnabled}
        onSignOut={onSignOut}
        onDeleteAccount={onDeleteAccount}
        onOpenCheckout={onOpenCheckout}
        onOpenBillingPortal={onOpenBillingPortal}
        embedded
      />

      {!import.meta.env.PROD ? (
        <WorkspaceSection title="Advanced settings" description="Server connection and developer options.">
          <WorkspaceCard className="p-0 overflow-hidden">
            <button
              type="button"
              className={cn(ccBtnGhost, "flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-semibold text-slate-800")}
              aria-expanded={showApiAdvanced}
              onClick={() => setShowApiAdvanced((v) => !v)}
            >
              <span>Server & connection</span>
              <span className="text-slate-400">{showApiAdvanced ? "▾" : "▸"}</span>
            </button>
            {showApiAdvanced ? (
              <div className="border-t border-slate-100 px-4 pb-4 pt-2">
                <ConnectionSettings
                  settings={settings}
                  setSettings={setSettings}
                  showApiAdvanced={showApiAdvanced}
                  setShowApiAdvanced={setShowApiAdvanced}
                  serverSyncMsg={serverSyncMsg}
                  embedded
                />
              </div>
            ) : null}
          </WorkspaceCard>
        </WorkspaceSection>
      ) : null}
    </div>
  );
}
