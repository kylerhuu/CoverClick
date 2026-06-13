import { AuthWall } from "../auth/AuthWall";
import { useAccessGate } from "../auth/useAccessGate";
import { ApplicationSidePanel } from "./ApplicationSidePanel";

export function SidePanelRoot() {
  const gate = useAccessGate();

  if (gate.phase === "loading") {
    return (
      <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-3 bg-[#f4f6f9] text-slate-600">
        <span className="cc-spinner h-8 w-8 border-[3px]" aria-hidden />
        <p className="text-[12px] font-medium">Loading…</p>
      </div>
    );
  }

  if (gate.phase === "no_api" || gate.phase === "signed_out" || gate.phase === "account_error") {
    return (
      <AuthWall
        variant="sidepanel"
        mode={
          gate.phase === "no_api" ? "no_api" : gate.phase === "account_error" ? "account_error" : "signed_out"
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
    );
  }

  return <ApplicationSidePanel />;
}
