import { Input } from "@/components/ui/input";

export default function DateFilterField({ label, value, onChange, testId }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full min-w-0 bg-white text-slate-900 [color-scheme:light]"
        data-testid={testId}
      />
    </label>
  );
}
