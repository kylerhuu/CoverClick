import { useCallback, useEffect, useRef, useState } from "react";
import type { OptionsMainTab } from "../options/components/OptionsSectionNav";
import {
  getStep,
  loadOnboardingState,
  markOnboardingCompleted,
  ONBOARDING_STEPS,
  resetOnboardingForRelaunch,
  saveOnboardingState,
  shouldOfferOnboarding,
  type OnboardingState,
  type OnboardingSurface,
} from "../lib/onboarding";
import { loadProfile } from "../lib/storage";
import { STORAGE_KEYS } from "../lib/storageKeys";
import type { UserProfile } from "../lib/types";
import { EMPTY_PROFILE } from "../lib/types";

type Options = {
  surface: OnboardingSurface;
  enabled: boolean;
  onNavigateTab?: (tab: OptionsMainTab) => void;
  /** When step 4 starts, optionally prompt opening the side panel. */
  onRequestSidePanel?: () => void;
};

export function useOnboardingTour({ surface, enabled, onNavigateTab, onRequestSidePanel }: Options) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [ready, setReady] = useState(false);
  const autoActivatedRef = useRef(false);

  const refresh = useCallback(async () => {
    const [s, p] = await Promise.all([loadOnboardingState(), loadProfile()]);
    setState(s);
    setProfile(p);
    setReady(true);
    return { state: s, profile: p };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local") return;
      if (changes[STORAGE_KEYS.onboarding] || changes[STORAGE_KEYS.profile]) {
        void refresh();
      }
    };
    chrome.storage.onChanged.addListener(onStorage);
    return () => chrome.storage.onChanged.removeListener(onStorage);
  }, [enabled, refresh]);

  const currentStep = state ? getStep(state.step) : null;
  const eligible = state ? shouldOfferOnboarding(profile, state) : false;
  const surfaceMatches = currentStep?.surface === surface;
  const open = Boolean(enabled && ready && state && state.active && !state.completed && eligible && surfaceMatches);

  useEffect(() => {
    if (!enabled || !ready || !state || state.completed) return;
    if (!shouldOfferOnboarding(profile, state)) return;
    const stepDef = getStep(state.step);
    if (!stepDef || stepDef.surface !== surface) return;
    if (stepDef.optionsTab && onNavigateTab) onNavigateTab(stepDef.optionsTab);
  }, [enabled, onNavigateTab, profile, ready, state, state?.step, surface]);

  useEffect(() => {
    if (!enabled || !ready || !state || state.completed || state.active) return;
    if (!shouldOfferOnboarding(profile, state)) return;
    const stepDef = getStep(state.step);
    if (!stepDef || stepDef.surface !== surface) return;
    if (autoActivatedRef.current) return;
    autoActivatedRef.current = true;
    void (async () => {
      await saveOnboardingState({ ...state, active: true });
      setState({ ...state, active: true });
    })();
  }, [enabled, profile, ready, state?.active, state?.completed, state?.step, surface]);

  const persist = useCallback(async (next: OnboardingState) => {
    await saveOnboardingState(next);
    setState(next);
  }, []);

  const onNext = useCallback(async () => {
    if (!state) return;
    const nextIndex = state.step + 1;
    if (nextIndex >= ONBOARDING_STEPS.length) {
      await markOnboardingCompleted();
      setState({ completed: true, active: false, step: 0 });
      return;
    }
    const nextStep = getStep(nextIndex);
    if (nextStep?.surface === "sidepanel") {
      onRequestSidePanel?.();
    }
    await persist({ ...state, step: nextIndex, active: true });
    if (nextStep?.optionsTab && onNavigateTab) onNavigateTab(nextStep.optionsTab);
  }, [onNavigateTab, onRequestSidePanel, persist, state]);

  const onBack = useCallback(async () => {
    if (!state || state.step <= 0) return;
    const prevIndex = state.step - 1;
    const prevStep = getStep(prevIndex);
    await persist({ ...state, step: prevIndex, active: true });
    if (prevStep?.optionsTab && onNavigateTab) onNavigateTab(prevStep.optionsTab);
  }, [onNavigateTab, persist, state]);

  const onSkip = useCallback(async () => {
    await markOnboardingCompleted();
    setState({ completed: true, active: false, step: 0 });
  }, []);

  const onClose = useCallback(async () => {
    if (!state) return;
    await persist({ ...state, active: false });
  }, [persist, state]);

  const relaunch = useCallback(async () => {
    autoActivatedRef.current = true;
    const next = await resetOnboardingForRelaunch();
    setState(next);
    const first = getStep(0);
    if (first?.optionsTab && onNavigateTab) onNavigateTab(first.optionsTab);
  }, [onNavigateTab]);

  return {
    open,
    stepIndex: state?.step ?? 0,
    currentStep,
    eligible,
    completed: state?.completed ?? false,
    onNext,
    onBack,
    onSkip,
    onClose,
    relaunch,
  };
}
