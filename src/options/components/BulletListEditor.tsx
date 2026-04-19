import { cn, fieldInputClass } from "../../lib/classNames";
import { Field, type FieldProps } from "./Field";

export type BulletListEditorProps = Omit<FieldProps, "children"> & {
  items: string[];
  onChange: (next: string[]) => void;
  addLabel?: string;
  placeholder?: string;
};

export function BulletListEditor({
  label,
  hint,
  items,
  onChange,
  addLabel = "Add line",
  placeholder = "One entry per row",
}: BulletListEditorProps) {
  const rows = items.length > 0 ? items : [""];

  const setRow = (index: number, value: string) => {
    const base = items.length > 0 ? [...items] : [""];
    base[index] = value;
    onChange(base);
  };

  const removeRow = (index: number) => {
    const base = [...(items.length > 0 ? items : [""])];
    base.splice(index, 1);
    onChange(base.length ? base : [""]);
  };

  const addRow = () => {
    onChange([...(items.length > 0 ? items : [""]), ""]);
  };

  return (
    <Field label={label} hint={hint}>
      <div className="rounded-xl bg-slate-50/90 p-2 ring-1 ring-slate-200/55">
        <div className="space-y-1">
          {rows.map((value, index) => (
            <div key={index} className="flex items-center gap-2 rounded-lg bg-white/90 px-1.5 py-0.5 ring-1 ring-slate-200/40">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold tabular-nums text-slate-500">
                {index + 1}
              </span>
              <input
                className={cn(
                  fieldInputClass,
                  "min-w-0 flex-1 border-0 bg-transparent py-1.5 shadow-none ring-0 focus:ring-0",
                )}
                value={value}
                placeholder={placeholder}
                onChange={(e) => setRow(index, e.target.value)}
                aria-label={`${label} ${index + 1}`}
              />
              <button
                type="button"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[14px] font-medium leading-none text-slate-400 hover:bg-red-50 hover:text-red-700"
                onClick={() => removeRow(index)}
                aria-label={`Remove ${label} row ${index + 1}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 w-full rounded-md py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50/80"
          onClick={addRow}
        >
          + {addLabel}
        </button>
      </div>
    </Field>
  );
}
