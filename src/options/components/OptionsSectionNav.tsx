import { cn } from "../../lib/classNames";
import { ccFocusRing, ccSegmentTab, ccSegmentTrack } from "../../ui/ccUi";

export type OptionsMainTab = "profile" | "account" | "import";

const tabs: { id: OptionsMainTab; label: string; description: string }[] = [
  { id: "profile", label: "Profile", description: "Your details and story" },
  { id: "account", label: "Cloud & billing", description: "Connection, plan, sync" },
  { id: "import", label: "Resume import", description: "AI extraction from a file" },
];

type Props = {
  active: OptionsMainTab;
  onChange: (tab: OptionsMainTab) => void;
};

export function OptionsSectionNav({ active, onChange }: Props) {
  return (
    <nav className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between" aria-label="Options sections">
      <div className={cn(ccSegmentTrack, "w-full sm:w-auto")} role="tablist">
        {tabs.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              title={t.description}
              onClick={() => onChange(t.id)}
              className={cn(
                "min-h-[40px] flex-1 sm:flex-none sm:min-w-[7.5rem]",
                ccSegmentTab(isActive),
                ccFocusRing,
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <p className="text-[12px] leading-snug text-slate-500 sm:text-right">{tabs.find((t) => t.id === active)?.description}</p>
    </nav>
  );
}
