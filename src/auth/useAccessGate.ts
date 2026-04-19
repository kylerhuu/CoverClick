import { useCallback, useEffect, useState } from "react";
import type { AccountMeResponse } from "../lib/types";
import { apiCreateCheckoutSession, apiCreatePortalSession, apiGetMe } from "../lib/backendApi";
import { signInWithGoogleChrome } from "../lib/googleChromeAuth";
import { loadSettings, saveSettings } from "../lib/storage";

export type AccessPhase = "loading" | "no_api" | "mock" | "signed_out" | "unpaid" | "paid";

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
    } catch {
      const cur = await loadSettings();
      await saveSettings({ ...cur, authToken: undefined, authEmail: undefined });
      setPhase("signed_out");
      setMe(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
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
    await saveSettings({ ...s, authToken: undefined, authEmail: undefined });
    setMe(null);
    setPhase(s.useMock ? "mock" : "signed_out");
  }, []);

  const openStripeCheckout = useCallback(async () => {
    const s = await loadSettings();
    const t = s.authToken?.trim();
    if (!t || !s.apiBaseUrl.trim()) return;
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
    if (!t || !s.apiBaseUrl.trim()) return;
    setAuthBusy(true);
    setAuthError(null);
    try {
      const { url } = await apiCreatePortalSession(s.apiBaseUrl, t);
      chrome.tabs.create({ url });
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
