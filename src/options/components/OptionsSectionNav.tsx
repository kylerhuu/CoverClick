import { cn } from "../../lib/classNames";
import { ccFocusRing } from "../../ui/ccUi";
import { wsNavIndicator, wsNavTab, wsNavTrack } from "../../ui/workspaceUi";

export type OptionsMainTab = "profile" | "resumes" | "applications" | "account" | "import";

const tabs: { id: OptionsMainTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "resumes", label: "Saved Resumes" },
  { id: "applications", label: "Application Hub" },
  { id: "account", label: "Cloud & Billing" },
  { id: "import", label: "Import Resume" },
];

type Props = {
  active: OptionsMainTab;
  onChange: (tab: OptionsMainTab) => void;
};

export function OptionsSectionNav({ active, onChange }: Props) {
  return (
    <nav className={wsNavTrack} aria-label="Workspace sections">
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(wsNavTab(isActive), ccFocusRing)}
          >
            {t.label}
            {isActive ? <span className={wsNavIndicator} aria-hidden /> : null}
          </button>
        );
      })}
    </nav>
  );
}
