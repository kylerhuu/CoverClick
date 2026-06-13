type Props = {
  saved: number;
  ready: number;
  preparing: number;
};

export function HubSummaryChips({ saved, ready, preparing }: Props) {
  const parts: string[] = [];
  if (ready > 0) {
    parts.push(`${ready} ready to apply`);
  }
  if (preparing > 0) {
    parts.push(`${preparing} preparing`);
  }
  if (parts.length === 0 && saved > 0) {
    parts.push(`${saved} saved`);
  }

  if (parts.length === 0) return null;

  return (
    <p className="text-[12px] text-slate-500">
      {parts.map((part, index) => {
        const isReady = part.includes("ready to apply");
        const isPreparing = part.includes("preparing");
        return (
          <span key={part}>
            {index > 0 ? (
              <span className="mx-1.5 text-slate-300" aria-hidden>
                ·
              </span>
            ) : null}
            <span
              className={
                isReady
                  ? "font-semibold text-emerald-700"
                  : isPreparing
                    ? "font-medium text-amber-700"
                    : "font-medium text-slate-600"
              }
            >
              {part}
            </span>
          </span>
        );
      })}
    </p>
  );
}
