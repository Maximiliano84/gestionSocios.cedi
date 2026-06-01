import { useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, X } from "lucide-react";
import { formatMesYM } from "@/utils/format";
import { getTodayLocalDate, getCurrentLocalMonth } from "@/utils/date";
import ComprobantePagoActividadDialog from "@/components/ComprobantePagoActividad";
import { ConfirmActionDialog, FeedbackDialog } from "@/components/ConfirmActionDialog";

const currentYm = () => getCurrentLocalMonth();
const today = () => getTodayLocalDate();

function normalize(text = "") {
  return String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function dueDateForMonth(mesYm, diaVencimiento) {
  const dia = Number(diaVencimiento || 0);
  if (!mesYm || !dia) return null;
  return `${mesYm}-${String(Math.min(31, Math.max(1, dia))).padStart(2, "0")}`;
}

function isLatePaymentMonth(mesYm, fechaPago, diaVencimiento) {
  const due = dueDateForMonth(mesYm, diaVencimiento);
  if (!due || !fechaPago) return false;
  return String(fechaPago) > due;
}

function isInitialMonthAfterDueExempt(mesYm, fechaAlta, diaVencimiento) {
  const due = dueDateForMonth(mesYm, diaVencimiento);
  if (!due || !fechaAlta) return false;
  const alta = String(fechaAlta).slice(0, 10);
  return alta.slice(0, 7) === mesYm && alta > due;
}

function calculateActivityPaymentTotal(alumno, meses, fechaPago, montoBase) {
  const base = Number(montoBase || 0);
  const recargo = Number(alumno?.recargoFueraTermino || 0);
  const detalleRecargos = (meses || []).map((mes) => ({
    mes,
    recargo: recargo
      && isLatePaymentMonth(mes, fechaPago, alumno?.diaVencimiento)
      && !isInitialMonthAfterDueExempt(mes, alumno?.fechaAlta, alumno?.diaVencimiento)
        ? recargo
        : 0,
  })).filter((item) => item.recargo > 0);
  const recargoTotal = detalleRecargos.reduce((sum, item) => sum + item.recargo, 0);
  return {
    subtotal: base * (meses || []).length,
    recargoTotal,
    total: base * (meses || []).length + recargoTotal,
    detalleRecargos,
  };
}

export default function RegistrarPagoActividadDialog({ open, onOpenChange, alumno, allAlumnos, onSaved }) {
  const [alumnoId, setAlumnoId] = useState(alumno?.id || "");
  const [selAlumno, setSelAlumno] = useState(alumno || null);
  const [meses, setMeses] = useState([]);
  const [monto, setMonto] = useState(alumno?.cuotaMensual || 0);
  const [fechaPago, setFechaPago] = useState(today());
  const [metodo, setMetodo] = useState("efectivo");
  const [observacion, setObservacion] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [comprobantePago, setComprobantePago] = useState(null);

  const alumnos = useMemo(() => allAlumnos || [], [allAlumnos]);
  const filteredAlumnos = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return alumnos;
    return alumnos.filter((a) => normalize(`${a.apellido} ${a.nombre} ${a.actividadNombre} ${a.profesor} ${a.tutorNombre}`).includes(q));
  }, [alumnos, search]);

  useEffect(() => {
    if (!open) return;
    setAlumnoId(alumno?.id || "");
    setSelAlumno(alumno || null);
    setMeses([]);
    setMonto(alumno?.cuotaMensual || 0);
    setFechaPago(today());
    setMetodo("efectivo");
    setObservacion("");
    setSearch("");
  }, [open, alumno]);

  useEffect(() => {
    if (alumno || !alumnoId) return;
    const found = alumnos.find((a) => a.id === alumnoId) || null;
    setSelAlumno(found);
    setMeses([]);
    setMonto(found?.cuotaMensual || 0);
  }, [alumnoId, alumno, alumnos]);

  const mesesPagados = useMemo(() => new Set(selAlumno?.mesesPagados || []), [selAlumno]);

  const opciones = useMemo(() => {
    const set = new Set([...(selAlumno?.mesesAdeudados || []), ...meses]);
    const now = new Date();
    for (let i = -12; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return Array.from(set).sort();
  }, [selAlumno, meses]);

  const toggleMes = (m) => {
    if (mesesPagados.has(m)) return;
    setMeses((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]).sort());
  };

  const mesesDuplicados = meses.filter((m) => mesesPagados.has(m));
  const tieneMesesDuplicados = mesesDuplicados.length > 0;

  const save = async () => {
    if (!selAlumno || !alumnoId || !meses.length) {
      setFeedback({ variant: "error", title: "Faltan datos", description: "Seleccione alumno y al menos un mes." });
      return;
    }
    if (tieneMesesDuplicados) {
      setFeedback({
        variant: "error",
        title: "Mes ya pagado",
        description: `No se puede registrar dos veces el mismo mes. Ya figura pagado: ${mesesDuplicados.map(formatMesYM).join(", ")}. Para corregirlo, primero anulá el pago anterior desde el historial.`,
      });
      return;
    }
    setSaving(true);
    try {
      const { data: pagoRegistrado } = await api.post("/actividades/pagos", {
        alumnoId,
        actividadId: selAlumno.actividadId,
        meses,
        monto: Number(monto || 0),
        fechaPago,
        metodo,
        observacion,
      });
      const alumnoComprobante = selAlumno || alumno || allAlumnos?.find((a) => a.id === alumnoId) || null;
      onOpenChange?.(false);
      setComprobantePago({ pago: pagoRegistrado, alumno: alumnoComprobante });
    } catch (e) {
      setFeedback({ variant: "error", title: "No se pudo registrar", description: formatApiError(e?.response?.data?.detail) });
    } finally {
      setSaving(false);
    }
  };

  const totalPago = calculateActivityPaymentTotal(selAlumno, meses, fechaPago, monto);
  const totalMonto = totalPago.total;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar pago{selAlumno ? ` - ${selAlumno.apellido}, ${selAlumno.nombre}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!alumno && allAlumnos && (
            <div>
              <Label>Alumno/a de actividad</Label>
              <div className="relative mt-1.5 mb-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre, actividad, profesor/a o tutor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-9"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Select value={alumnoId} onValueChange={setAlumnoId}>
                <SelectTrigger><SelectValue placeholder={`Seleccionar alumno (${filteredAlumnos.length} disponibles)`} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {filteredAlumnos.length === 0 && <div className="px-3 py-4 text-sm text-slate-500 text-center">Sin resultados</div>}
                  {filteredAlumnos.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.apellido}, {a.nombre} — {a.actividadNombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selAlumno && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{selAlumno.actividadNombre}</span>
              <span> · Prof. {selAlumno.profesor || "A definir"}</span>
              {!!selAlumno.recargoFueraTermino && !!selAlumno.diaVencimiento && (
                <div className="mt-1 text-xs font-semibold text-amber-700">
                  Vence el día {selAlumno.diaVencimiento}. Fuera de término suma ${Number(selAlumno.recargoFueraTermino || 0).toLocaleString("es-AR")} por mes.
                </div>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs uppercase tracking-wider font-semibold text-slate-500">Meses a abonar</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-md">
              {opciones.map((m) => {
                const yaPagado = mesesPagados.has(m);
                const seleccionado = meses.includes(m);
                const adeudado = selAlumno?.mesesAdeudados?.includes(m);

                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMes(m)}
                    disabled={yaPagado}
                    title={yaPagado ? "Mes ya pagado" : undefined}
                    className={`text-xs px-2 py-1.5 rounded border transition-colors text-left disabled:cursor-not-allowed ${
                      yaPagado
                        ? "bg-slate-100 border-slate-200 text-slate-400 line-through"
                        : seleccionado
                          ? "bg-blue-700 border-blue-700 text-white"
                          : adeudado
                            ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>{formatMesYM(m)}</span>
                    {yaPagado && <span className="ml-1 text-[10px] font-semibold">· pagado</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">Los meses en rojo son los que el alumno adeuda. También podés seleccionar meses futuros para pagar por adelantado. Los meses tachados ya están pagados y no se pueden volver a registrar.</p>
            {tieneMesesDuplicados && (
              <p className="text-xs font-semibold text-red-600 mt-1.5">
                Ya existe un pago para: {mesesDuplicados.map(formatMesYM).join(", ")}. Anulá el pago anterior antes de volver a cargarlo.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monto por mes</Label>
              <Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Fecha de pago</Label>
              <Input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label>Método</Label>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observación</Label>
            <Input value={observacion} onChange={(e) => setObservacion(e.target.value)} className="mt-1.5" />
          </div>

          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Cuotas seleccionadas</span>
              <span className="font-semibold text-slate-900">${Number(totalPago.subtotal || 0).toLocaleString("es-AR")}</span>
            </div>
            {totalPago.recargoTotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-amber-700">Recargo fuera de término</span>
                <span className="font-bold text-amber-700">+ ${Number(totalPago.recargoTotal || 0).toLocaleString("es-AR")}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="text-sm text-slate-600">Total a registrar</span>
              <span className="text-lg font-bold text-slate-900">${Number(totalMonto || 0).toLocaleString("es-AR")}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setConfirmOpen(true)} disabled={saving || meses.length === 0 || !alumnoId || tieneMesesDuplicados} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar pago"
        description={`¿Querés registrar este pago por $${Number(totalMonto || 0).toLocaleString("es-AR")} para ${selAlumno ? `${selAlumno.apellido}, ${selAlumno.nombre}` : "el alumno seleccionado"}?`}
        confirmText="Registrar pago"
        onConfirm={async () => { setConfirmOpen(false); await save(); }}
      />
      <ComprobantePagoActividadDialog
        open={!!comprobantePago}
        onOpenChange={(open) => !open && setComprobantePago(null)}
        alumno={comprobantePago?.alumno}
        pago={comprobantePago?.pago}
        onFinish={() => {
          setComprobantePago(null);
          onSaved?.();
        }}
      />
      <FeedbackDialog
        open={!!feedback}
        onOpenChange={(open) => !open && setFeedback(null)}
        title={feedback?.title}
        description={feedback?.description}
        variant={feedback?.variant}
      />
    </Dialog>
  );
}
