import type { JobApplication } from "../../lib/types";
import { getPreparedAssetItems } from "../applicationDisplay";
import { cn } from "../../lib/classNames";
import {
  ccPreparedAssetCheck,
  ccPreparedAssetIcon,
  ccPreparedAssetTile,
  ccPreparedAssetsSectionTitle,
} from "../../ui/ccUi";

const ICON_LABEL: Record<string, string> = {
  materials: "CL",
  resume: "CV",
  fit: "FT",
};

type Props = {
  application: JobApplication;
  className?: string;
};

export function PreparedAssets({ application, className }: Props) {
  const items = getPreparedAssetItems(application);
  if (items.length === 0) return null;

  return (
    <section className={cn("space-y-2.5", className)}>
      <h3 className={ccPreparedAssetsSectionTitle}>Prepared assets</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className={cn(ccPreparedAssetTile, "relative")}>
            <span className={ccPreparedAssetCheck} aria-hidden>
              ✓
            </span>
            <span className={cn(ccPreparedAssetIcon, "text-[11px] font-bold")} aria-hidden>
              {ICON_LABEL[item.icon]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-900">{item.title}</p>
              <p className="mt-0.5 text-[12px] text-slate-500">{item.subtitle}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
