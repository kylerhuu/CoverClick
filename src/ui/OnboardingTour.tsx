import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/classNames";
import type { OnboardingStep } from "../lib/onboarding";
import { ONBOARDING_STEPS } from "../lib/onboarding";
import { ccBtnPrimary, ccFocusRing } from "./ccUi";

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type Props = {
  open: boolean;
  stepIndex: number;
  step: OnboardingStep;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onClose: () => void;
};

const SPOTLIGHT_PAD = 10;
const TOOLTIP_GAP = 16;

function measureTarget(selector: string): SpotlightRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    top: rect.top - SPOTLIGHT_PAD,
    left: rect.left - SPOTLIGHT_PAD,
    width: rect.width + SPOTLIGHT_PAD * 2,
    height: rect.height + SPOTLIGHT_PAD * 2,
  };
}

export function OnboardingTour({ open, stepIndex, step, onNext, onBack, onSkip, onClose }: Props) {
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [tooltipPlacement, setTooltipPlacement] = useState<"below" | "above">("below");
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isLastStep = stepIndex >= ONBOARDING_STEPS.length - 1;

  const updateGeometry = useCallback(() => {
    const el = document.querySelector(step.target);
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth", inline: "nearest" });
    }
    window.setTimeout(() => {
      const rect = measureTarget(step.target);
      setSpotlight(rect);
      if (!rect) return;
      const tooltipHeight = tooltipRef.current?.offsetHeight ?? 220;
      const spaceBelow = window.innerHeight - (rect.top + rect.height + TOOLTIP_GAP);
      const spaceAbove = rect.top - TOOLTIP_GAP;
      setTooltipPlacement(spaceBelow >= tooltipHeight || spaceBelow >= spaceAbove ? "below" : "above");
    }, el ? 280 : 0);
  }, [step.target]);

  useLayoutEffect(() => {
    if (!open) {
      setSpotlight(null);
      return;
    }
    updateGeometry();
  }, [open, stepIndex, step.target, updateGeometry]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    const onLayout = () => updateGeometry();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [open, onClose, updateGeometry]);

  if (!open || typeof document === "undefined") return null;

  const tooltipStyle: CSSProperties = spotlight
    ? tooltipPlacement === "below"
      ? {
          top: spotlight.top + spotlight.height + TOOLTIP_GAP,
          left: Math.max(16, Math.min(spotlight.left, window.innerWidth - 360)),
        }
      : {
          bottom: window.innerHeight - spotlight.top + TOOLTIP_GAP,
          left: Math.max(16, Math.min(spotlight.left, window.innerWidth - 360)),
        }
    : {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };

  return createPortal(
    <div className="fixed inset-0 z-[100000] pointer-events-auto" role="dialog" aria-modal="true" aria-labelledby="onboarding-tour-title">
      <div
        className={cn(
          "absolute inset-0 bg-slate-950/40 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />

      {spotlight ? (
        <div
          className="pointer-events-none absolute rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.78), 0 0 0 1px rgba(255,255,255,0.12), 0 0 40px rgba(91,76,240,0.35)",
          }}
        />
      ) : null}

      <div
        ref={tooltipRef}
        className={cn(
          "absolute w-[min(340px,calc(100vw-32px))] rounded-2xl border border-white/10 bg-slate-900/95 p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl",
          "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        )}
        style={tooltipStyle}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300">
            Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
          </p>
          <button
            type="button"
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200",
              ccFocusRing,
            )}
            onClick={onSkip}
          >
            Skip tour
          </button>
        </div>

        <h2 id="onboarding-tour-title" className="text-[17px] font-semibold tracking-tight text-white">
          {step.title}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-300">{step.body}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            className={cn(
              "rounded-lg px-3 py-1.5 text-[12px] font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-200 disabled:opacity-40",
              ccFocusRing,
            )}
            disabled={stepIndex === 0}
            onClick={onBack}
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            {ONBOARDING_STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === stepIndex ? "w-5 bg-indigo-400" : "w-1.5 bg-white/20",
                )}
                aria-hidden
              />
            ))}
          </div>
          <button type="button" className={cn(ccBtnPrimary, "px-4 py-2 text-[12px]")} onClick={onNext}>
            {isLastStep ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
