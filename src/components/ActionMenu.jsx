import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

const COLOR_CLASSES = {
  default: "text-slate-700",
  info: "text-blue-700 bg-blue-50/60",
  success: "text-emerald-700 bg-emerald-50/60",
  payment: "text-blue-700 bg-blue-50/60",
  warning: "text-amber-700 bg-amber-50/60",
  danger: "text-red-700 bg-red-50/60",
};

export default function ActionMenu({ options = [], align = "right", testId = "action-menu" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  const menuRef = useRef(null);

  const visibleOptions = options.filter(Boolean);

  const openMenu = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      const width = 224;
      const estimatedHeight = Math.max(56, visibleOptions.length * 40 + 12);
      const margin = 8;
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldOpenUp = spaceBelow < estimatedHeight + margin && rect.top > estimatedHeight + margin;
      const top = shouldOpenUp
        ? Math.max(margin, rect.top - estimatedHeight - margin)
        : Math.min(rect.bottom + margin, window.innerHeight - estimatedHeight - margin);
      const rawLeft = align === "right" ? rect.right - width : rect.left;
      const left = Math.min(Math.max(margin, rawLeft), window.innerWidth - width - margin);
      setPos({ top, left });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    const handle = (e) => {
      if (ref.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", handle);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handle);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, []);

  return (
    <>
      <div className="relative inline-block text-left" ref={ref}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); openMenu(); }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label="Abrir opciones"
          data-testid={testId}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
          style={{ top: pos.top, left: pos.left }}
        >
          {visibleOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value || opt.label}
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(false); opt.onClick?.(); }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium ${COLOR_CLASSES[opt.color || "default"]}`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
