import type { JobApplication } from "../../lib/types";
import { getPreparedAssetItems } from "../applicationDisplay";
import {
  ccPreparedAssetCard,
  ccPreparedAssetCardIcon,
  ccPreparedAssetCardSubtitle,
  ccPreparedAssetCardTitle,
  ccPreparedAssetCheck,
} from "../../ui/ccUi";

type PreparedAssetsProps = {
  application: JobApplication;
};

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.5 6L5 8.5L9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PreparedAssets({ application }: PreparedAssetsProps) {
  const items = getPreparedAssetItems(application);

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {items.map((item) => (
        <div key={item.id} className={ccPreparedAssetCard}>
          <div className="flex items-start justify-between gap-2">
            <div className={ccPreparedAssetCardIcon}>{item.iconLabel}</div>
            <span className={ccPreparedAssetCheck} aria-hidden="true">
              <CheckIcon />
            </span>
          </div>
          <p className={ccPreparedAssetCardTitle}>{item.title}</p>
          <p className={ccPreparedAssetCardSubtitle}>{item.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
