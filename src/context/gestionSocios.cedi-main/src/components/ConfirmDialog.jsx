import { AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const toneStyles = {
  danger: {
    icon: "bg-red-50 text-red-700 border-red-100",
    confirm: "bg-red-700 text-white hover:bg-red-800",
  },
  warning: {
    icon: "bg-amber-50 text-amber-700 border-amber-100",
    confirm: "bg-amber-600 text-white hover:bg-amber-700",
  },
  success: {
    icon: "bg-emerald-50 text-emerald-700 border-emerald-100",
    confirm: "bg-emerald-700 text-white hover:bg-emerald-800",
  },
  info: {
    icon: "bg-blue-50 text-blue-700 border-blue-100",
    confirm: "bg-blue-700 text-white hover:bg-blue-800",
  },
};

export default function ConfirmDialog({
  open,
  onOpenChange,
  title = "Confirmar acción",
  description = "¿Querés continuar?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  tone = "info",
  loading = false,
  onConfirm,
}) {
  const styles = toneStyles[tone] || toneStyles.info;

  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border ${styles.icon}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} disabled={loading}>
            {cancelText}
          </Button>
          <Button type="button" className={styles.confirm} onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
