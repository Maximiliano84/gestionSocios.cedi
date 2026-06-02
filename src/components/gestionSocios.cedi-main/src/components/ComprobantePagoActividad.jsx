import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Download, MessageCircle, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmActionDialog, FeedbackDialog } from "@/components/ConfirmActionDialog";
import { formatDate, formatMesYM, formatMetodoPago, formatMoney } from "@/utils/format";

function cleanFileName(value) {
  return String(value || "comprobante")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getMesesLabel(pago) {
  const meses = Array.isArray(pago?.meses) ? pago.meses : [];
  return meses.length ? meses.map(formatMesYM).join(", ") : "-";
}

function getPhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function getNombreAlumno(alumno, pago) {
  if (alumno?.nombre || alumno?.apellido) {
    return `${alumno?.nombre || ""} ${alumno?.apellido || ""}`.trim();
  }
  return String(pago?.alumnoNombre || "").replace(/^([^,]+),\s*(.+)$/, "$2 $1").trim();
}

function buildWhatsAppMessage({ alumno }) {
  const nombreCompleto = [alumno?.nombre, alumno?.apellido].filter(Boolean).join(" ") || "el alumno";

  return [
    `Hola, familia. Les compartimos el comprobante de pago de la actividad de ${nombreCompleto}.`,
    "",
    "Muchas gracias. Comisión CEDI LOS 15.",
  ].join("\n");
}

function ReceiptRow({ label, value, strong = false }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <span className={`text-right text-sm ${strong ? "font-black text-slate-950" : "font-semibold text-slate-800"}`}>{value || "-"}</span>
    </div>
  );
}

export default function ComprobantePagoActividadDialog({ open, onOpenChange, alumno, pago, onFinish }) {
  const comprobanteRef = useRef(null);
  const [confirmDownload, setConfirmDownload] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!alumno || !pago) return null;

  const nombreCompleto = getNombreAlumno(alumno, pago);
  const mesesLabel = getMesesLabel(pago);
  const logoSrc = "/logo-cedi.png";
  const recargoTotal = Number(pago.recargoTotal || 0);
  const subtotalCuotas = Number(pago.subtotalCuotas || (Number(pago.montoBaseMensual || alumno.cuotaMensual || 0) * (pago.meses?.length || 0)) || 0);

  const close = () => {
    onOpenChange?.(false);
    onFinish?.();
  };

  const downloadPNG = async () => {
    if (!comprobanteRef.current) return;
    const element = comprobanteRef.current;
    const previousWidth = element.style.width;
    const previousMaxWidth = element.style.maxWidth;

    try {
      element.style.width = "520px";
      element.style.maxWidth = "520px";
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 3,
        useCORS: true,
        logging: false,
        width: 520,
        windowWidth: 900,
      });

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cleanFileName(`comprobante-actividad-${alumno.apellido || "alumno"}-${pago.fechaPago || ""}`)}.png`;
      a.click();
      setFeedback({ title: "Comprobante descargado", description: "La imagen del comprobante se descargó correctamente." });
    } catch {
      setFeedback({ variant: "error", title: "No se pudo descargar", description: "Ocurrió un problema al generar la imagen del comprobante." });
    } finally {
      element.style.width = previousWidth;
      element.style.maxWidth = previousMaxWidth;
      setConfirmDownload(false);
    }
  };

  const sendWhatsApp = () => {
    const message = buildWhatsAppMessage({ alumno });
    const phone = getPhone(alumno.tutorTelefono);
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(value) => !value && close()}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border-slate-200 p-0">
          <div className="bg-emerald-50 px-6 py-5">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-slate-950">Pago realizado con éxito</DialogTitle>
                  <p className="mt-2 text-sm text-slate-600">
                    Se generó el comprobante de pago para {nombreCompleto || "el alumno"}.
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="px-4 py-5 sm:px-6">
            <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div ref={comprobanteRef} className="w-full max-w-[520px] bg-white p-6 text-slate-900">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
                  <div className="flex items-center gap-4">
                    <img src={logoSrc} alt="Logo del club" className="h-20 w-20 object-contain" crossOrigin="anonymous" />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">CEDI LOS 15</div>
                      <h2 className="mt-1 text-2xl font-black text-slate-950" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Comprobante de pago
                      </h2>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Actividad</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Fecha</div>
                    <div className="text-sm font-black text-slate-950">{formatDate(pago.fechaPago)}</div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <ReceiptRow label="Alumno/a" value={nombreCompleto} strong />
                  <ReceiptRow label="Actividad" value={pago.actividadNombre || alumno.actividadNombre || "-"} />
                  <ReceiptRow label="Profesor/a" value={pago.profesor || alumno.profesor || "-"} />
                  <ReceiptRow label="Concepto" value="Cuota de actividad" />
                  <ReceiptRow label="Meses abonados" value={mesesLabel} strong />
                  <ReceiptRow label="Método" value={formatMetodoPago(pago.metodo)} />
                  {pago.observacion && <ReceiptRow label="Observación" value={pago.observacion} />}
                </div>

                {(subtotalCuotas > 0 || recargoTotal > 0) && (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                    <ReceiptRow label="Cuotas" value={formatMoney(subtotalCuotas)} />
                    {recargoTotal > 0 && <ReceiptRow label="Recargo fuera de término" value={formatMoney(recargoTotal)} />}
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                  <div className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">Monto abonado</div>
                  <div className="mt-1 text-4xl font-black text-slate-950" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {formatMoney(Number(pago.monto || 0))}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-200 pt-4 text-xs text-slate-500">
                  <span>Comprobante emitido por CEDI LOS 15</span>
                  <span className="font-mono">ID: {String(pago.id || "-").slice(0, 10)}</span>
                </div>
              </div>
            </div>

            <p className="mx-auto mt-3 max-w-[520px] text-xs leading-5 text-slate-500">
              Para enviar el comprobante por WhatsApp, descargá la imagen y adjuntala manualmente. El botón de WhatsApp abre el chat con el mensaje armado.
            </p>
          </div>

          <DialogFooter className="gap-2 px-6 pb-6 sm:justify-end sm:space-x-0">
            <Button type="button" variant="outline" onClick={() => setConfirmDownload(true)}>
              <Download className="mr-2 h-4 w-4" /> Descargar comprobante
            </Button>
            <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" onClick={sendWhatsApp}>
              <MessageCircle className="mr-2 h-4 w-4" /> Enviar WhatsApp
            </Button>
            <Button type="button" className="bg-slate-900 hover:bg-slate-800" onClick={close}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={confirmDownload}
        onOpenChange={setConfirmDownload}
        title="Descargar comprobante"
        description="¿Querés descargar la imagen del comprobante de pago?"
        confirmText="Descargar"
        onConfirm={downloadPNG}
      />

      <FeedbackDialog
        open={!!feedback}
        onOpenChange={(value) => !value && setFeedback(null)}
        title={feedback?.title}
        description={feedback?.description}
        variant={feedback?.variant}
      />
    </>
  );
}
