type Props = {
  saved: number;
  ready: number;
  preparing: number;
};

export function HubSummaryChips({ saved, ready, preparing }: Props) {
  return (
    <p className="text-[12px] text-slate-500">
      <span>
        Saved <span className="font-medium text-slate-700">{saved}</span>
      </span>
      <span className="mx-1.5 text-slate-300" aria-hidden>
        ·
      </span>
      <span>
        Ready <span className="font-medium text-slate-700">{ready}</span>
      </span>
      <span className="mx-1.5 text-slate-300" aria-hidden>
        ·
      </span>
      <span>
        Preparing <span className="font-medium text-slate-700">{preparing}</span>
      </span>
    </p>
  );
}
