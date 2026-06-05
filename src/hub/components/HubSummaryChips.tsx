import { cn } from "../../lib/classNames";
import { ccSummaryChip } from "../../ui/ccUi";

type Props = {
  saved: number;
  ready: number;
  preparing: number;
};

export function HubSummaryChips({ saved, ready, preparing }: Props) {
  const items = [
    { label: "Saved", value: saved, highlight: saved > 0 },
    { label: "Ready", value: ready, highlight: ready > 0 },
    { label: "Preparing", value: preparing, highlight: preparing > 0 },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div key={item.label} className={cn(ccSummaryChip(item.highlight))}>
          <span className="text-[18px] font-bold leading-none text-slate-900">{item.value}</span>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
