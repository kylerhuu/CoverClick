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
      <div className="space-y-1 divide-y divide-slate-200/70">
        {rows.map((value, index) => (
          <div key={index} className="flex items-center gap-1.5 pt-1 first:pt-0">
            <span className="w-5 shrink-0 text-center text-[10px] font-medium tabular-nums text-slate-400">
              {index + 1}
            </span>
            <input
              className={cn(fieldInputClass, "min-w-0 flex-1 bg-white py-1.5")}
              value={value}
              placeholder={placeholder}
              onChange={(e) => setRow(index, e.target.value)}
              aria-label={`${label} ${index + 1}`}
            />
            <button
              type="button"
              className="shrink-0 rounded px-1.5 py-1 text-[12px] font-medium text-slate-400 hover:bg-white hover:text-slate-700"
              onClick={() => removeRow(index)}
              aria-label={`Remove ${label} row ${index + 1}`}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="mt-2 w-full py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
          onClick={addRow}
        >
          {addLabel}
        </button>
      </div>
    </Field>
  );
}
