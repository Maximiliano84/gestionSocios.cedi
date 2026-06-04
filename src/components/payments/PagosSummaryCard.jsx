const TONES = {
  blue: {
    card: "border-blue-100 bg-blue-50/60",
    icon: "bg-white text-blue-700 ring-blue-100",
    label: "text-blue-700",
    value: "text-blue-950",
  },
  emerald: {
    card: "border-emerald-100 bg-emerald-50/70",
    icon: "bg-white text-emerald-700 ring-emerald-100",
    label: "text-emerald-700",
    value: "text-emerald-950",
  },
  amber: {
    card: "border-amber-100 bg-amber-50/70",
    icon: "bg-white text-amber-700 ring-amber-100",
    label: "text-amber-700",
    value: "text-amber-950",
  },
  slate: {
    card: "border-slate-200 bg-slate-50/80",
    icon: "bg-white text-slate-700 ring-slate-200",
    label: "text-slate-600",
    value: "text-slate-950",
  },
};

export default function PagosSummaryCard({ icon: Icon, label, value, details, tone = "blue" }) {
  const colors = TONES[tone] || TONES.blue;

  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${colors.card}`}>
      <div className="flex items-center gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ${colors.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className={`truncate text-xs font-bold uppercase tracking-wider ${colors.label}`}>{label}</p>
          <p className={`mt-0.5 truncate text-xl font-black ${colors.value}`}>{value}</p>
          {details && <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{details}</p>}
        </div>
      </div>
    </div>
  );
}
