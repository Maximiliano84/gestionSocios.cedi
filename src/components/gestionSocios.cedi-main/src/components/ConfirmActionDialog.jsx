import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title = "Confirmar acción",
  description = "¿Querés continuar?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  loading = false,
  onConfirm,
}) {
  const isDanger = variant === "danger";
  return (
    <Dialog open={open} onOpenChange={(value) => !loading && onOpenChange?.(value)}>
      <DialogContent className="max-w-md rounded-2xl border-slate-200 p-0 overflow-hidden">
        <div className={`px-6 py-5 ${isDanger ? "bg-red-50" : "bg-blue-50"}`}>
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full ${isDanger ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-slate-950">{title}</DialogTitle>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            </div>
          </DialogHeader>
        </div>
        <DialogFooter className="gap-2 px-6 py-4 sm:justify-end sm:space-x-0">
          <Button type="button" variant="outline" disabled={loading} onClick={() => onOpenChange?.(false)}>
            {cancelText}
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={isDanger ? "bg-red-600 hover:bg-red-700" : "bg-blue-700 hover:bg-blue-800"}
          >
            {loading ? "Procesando..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FeedbackDialog({
  open,
  onOpenChange,
  title = "Acción realizada",
  description = "La operación se completó correctamente.",
  variant = "success",
  buttonText = "Aceptar",
}) {
  const isError = variant === "error";
  const Icon = isError ? XCircle : CheckCircle2;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl border-slate-200 p-0 overflow-hidden">
        <div className={`px-6 py-6 text-center ${isError ? "bg-red-50" : "bg-emerald-50"}`}>
          <div className={`mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full ${isError ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
            <Icon className="h-6 w-6" />
          </div>
          <DialogTitle className="text-slate-950">{title}</DialogTitle>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <div className="px-6 py-4">
          <Button type="button" className="w-full bg-slate-900 hover:bg-slate-800" onClick={() => onOpenChange?.(false)}>
            {buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
