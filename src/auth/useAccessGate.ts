import { useCallback, useEffect, useState } from "react";
import type { AccountMeResponse } from "../lib/types";
import { ApiHttpError, apiCreateCheckoutSession, apiCreatePortalSession, apiGetMe } from "../lib/backendApi";
import { signInWithGoogleChrome } from "../lib/googleChromeAuth";
import { STORAGE_KEYS, clearCachedLetter, loadSettings, saveSettings } from "../lib/storage";

export type AccessPhase =
  | "loading"
  | "no_api"
  | "mock"
  | "signed_out"
  | "unpaid"
  | "paid"
  /** Valid token in storage but /api/me failed (network/5xx) — do not clear the session. */
  | "account_error";

export function useAccessGate() {
  const [phase, setPhase] = useState<AccessPhase>("loading");
  const [me, setMe] = useState<AccountMeResponse | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setAuthError(null);
    const s = await loadSettings();
    if (s.useMock) {
      setPhase("mock");
      setMe(null);
      return;
    }
    if (!s.apiBaseUrl.trim()) {
      setPhase("no_api");
      setMe(null);
      return;
    }
    if (!s.authToken?.trim()) {
      setPhase("signed_out");
      setMe(null);
      return;
    }
    try {
      const m = await apiGetMe(s.apiBaseUrl, s.authToken);
      setMe(m);
      setPhase(m.hasPaidAccess ? "paid" : "unpaid");
    } catch (e) {
      if (e instanceof ApiHttpError && (e.status === 401 || e.status === 404)) {
        const cur = await loadSettings();
        await clearCachedLetter();
        await saveSettings({ ...cur, authToken: undefined, authEmail: undefined });
        setAuthError(
          e.status === 404 ? "Your account is no longer available. Please sign in again." : "Session expired. Please sign in again.",
        );
        setPhase("signed_out");
        setMe(null);
        return;
      }
      const msg = e instanceof Error ? e.message : "Could not verify your account.";
      setMe(null);
      setAuthError(msg);
      setPhase("account_error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local") return;
      if (!changes[STORAGE_KEYS.settings]) return;
      void refresh();
    };
    chrome.storage.onChanged.addListener(onStorage);
    return () => chrome.storage.onChanged.removeListener(onStorage);
  }, [refresh]);

  const signInWithGoogle = useCallback(async () => {
    const s = await loadSettings();
    if (!s.apiBaseUrl.trim()) {
      setAuthError("This build has no API URL. Set VITE_COVERCLICK_API_ORIGIN when building the extension.");
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    try {
      const out = await signInWithGoogleChrome(s.apiBaseUrl);
      await saveSettings({
        ...s,
        authToken: out.token,
        authEmail: out.user.email,
        useMock: false,
      });
      await refresh();
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setAuthBusy(false);
    }
  }, [refresh]);

  const signOut = useCallback(async () => {
    const s = await loadSettings();
    await clearCachedLetter();
    await saveSettings({ ...s, authToken: undefined, authEmail: undefined });
    setMe(null);
    setAuthError(null);
    setPhase(s.useMock ? "mock" : "signed_out");
  }, []);

  const openStripeCheckout = useCallback(async () => {
    const s = await loadSettings();
    const t = s.authToken?.trim();
    if (!s.apiBaseUrl.trim()) {
      setAuthError("No API server URL. Set one under Options → Connection (Advanced), or use the official build.");
      return;
    }
    if (!t) {
      setAuthError("You’re not signed in. Sign in from the side panel, then open Options again (or click Refresh access).");
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    try {
      const { url } = await apiCreateCheckoutSession(s.apiBaseUrl, t);
      chrome.tabs.create({ url });
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const openCustomerPortal = useCallback(async () => {
    const s = await loadSettings();
    const t = s.authToken?.trim();
    if (!s.apiBaseUrl.trim()) {
      setAuthError("No API server URL. Set one under Options → Connection (Advanced), or use the official build.");
      return;
    }
    if (!t) {
      setAuthError("You’re not signed in. Sign in from the side panel, then open Options again (or click Refresh access).");
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    try {
      const { url } = await apiCreatePortalSession(s.apiBaseUrl, t);
      if (!url?.trim()) {
        setAuthError("The server did not return a billing link. Try again in a moment.");
        return;
      }
      try {
        await chrome.tabs.create({ url: url.trim() });
      } catch (tabErr) {
        setAuthError(
          tabErr instanceof Error ? tabErr.message : "Could not open a new tab. Allow pop-ups for this extension.",
        );
      }
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Could not open billing portal");
    } finally {
      setAuthBusy(false);
    }
  }, []);

  return {
    phase,
    me,
    authBusy,
    authError,
    refresh,
    signInWithGoogle,
    signOut,
    openStripeCheckout,
    openCustomerPortal,
  };
}
