import { AuthWall } from "../auth/AuthWall";
import { useAccessGate } from "../auth/useAccessGate";
import { WorkspaceApp } from "../workspace/WorkspaceApp";

export function SidePanelRoot() {
  const gate = useAccessGate();

  if (gate.phase === "loading") {
    return (
      <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-3 bg-slate-100 text-slate-600">
        <span className="cc-spinner h-8 w-8 border-[3px]" aria-hidden />
        <p className="text-[12px] font-medium">Loading…</p>
      </div>
    );
  }

  if (gate.phase === "no_api") {
    return (
      <AuthWall
        variant="sidepanel"
        mode="no_api"
        me={null}
        authBusy={false}
        authError={null}
        onGoogleSignIn={() => {}}
        onSignOut={() => {}}
        onSubscribe={() => {}}
        onManageBilling={() => {}}
        onRefreshAccess={() => {}}
      />
    );
  }

  if (gate.phase === "signed_out" || gate.phase === "unpaid") {
    return (
      <AuthWall
        variant="sidepanel"
        mode={gate.phase === "signed_out" ? "signed_out" : "unpaid"}
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

  return <WorkspaceApp />;
}
