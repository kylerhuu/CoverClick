import type { JobApplication } from "../../lib/types";
import { getPreparedAssetItems } from "../applicationDisplay";
import { cn } from "../../lib/classNames";
import {
  ccPreparedAssetCell,
  ccPreparedAssetCellIcon,
  ccPreparedAssetCellLabel,
  ccPreparedAssetGrid,
  ccPreparedAssetsSectionTitle,
} from "../../ui/ccUi";

type Props = {
  application: JobApplication;
  className?: string;
};

export function PreparedAssets({ application, className }: Props) {
  const items = getPreparedAssetItems(application);
  if (items.length === 0) return null;

  return (
    <section className={cn("space-y-2", className)}>
      <h3 className={ccPreparedAssetsSectionTitle}>Prepared assets</h3>
      <ul className={ccPreparedAssetGrid}>
        {items.map((item) => (
          <li key={item.id} className={ccPreparedAssetCell}>
            <span className={ccPreparedAssetCellIcon}>{item.iconLabel}</span>
            <span className={ccPreparedAssetCellLabel}>{item.assetName}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
