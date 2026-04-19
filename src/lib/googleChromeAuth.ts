import { apiAuthExchangeWithCode, normalizeApiOrigin } from "./backendApi";

/**
 * Google sign-in for MV3 extensions using chrome.identity.launchWebAuthFlow.
 *
 * The extension never talks to accounts.google.com directly for OAuth parameters.
 * It opens the CoverClick API `/api/auth/google/start`, which redirects to Google with
 * redirect_uri = the server’s `/api/auth/google/callback` (never the chromiumapp.org URL).
 * After Google finishes, the server redirects back to chrome.identity.getRedirectURL()
 * with `cc_exchange`, which we swap for a CoverClick JWT via POST /api/auth/exchange.
 */

export function getGoogleAuthStartUrl(apiBaseUrl: string): string {
  const origin = normalizeApiOrigin(apiBaseUrl);
  const chromeRedirect = chrome.identity.getRedirectURL();
  return `${origin}/api/auth/google/start?chrome_redirect=${encodeURIComponent(chromeRedirect)}`;
}

function launchWebAuthFlowPromise(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url, interactive: true }, (responseUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || "Sign-in failed"));
        return;
      }
      if (!responseUrl) {
        reject(new Error("Sign-in was canceled."));
        return;
      }
      resolve(responseUrl);
    });
  });
}

function parseChromeAuthRedirect(responseUrl: string): string {
  let u: URL;
  try {
    u = new URL(responseUrl);
  } catch {
    throw new Error("Unexpected sign-in response URL.");
  }
  const err = u.searchParams.get("cc_error");
  if (err) throw new Error(decodeURIComponent(err));
  const code = u.searchParams.get("cc_exchange");
  if (!code) throw new Error("Missing exchange code — try signing in again.");
  return decodeURIComponent(code);
}

/**
 * Opens Google OAuth in a secure browser window, then exchanges the one-time code for a CoverClick JWT.
 */
export async function signInWithGoogleChrome(apiBaseUrl: string) {
  const startUrl = getGoogleAuthStartUrl(apiBaseUrl);
  const responseUrl = await launchWebAuthFlowPromise(startUrl);
  const code = parseChromeAuthRedirect(responseUrl);
  return apiAuthExchangeWithCode(apiBaseUrl, code);
}
