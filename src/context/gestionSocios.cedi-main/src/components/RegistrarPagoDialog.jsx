import { useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, X } from "lucide-react";
import ComprobantePagoSocioDialog from "@/components/ComprobantePagoSocio";
import { formatMesYM, MES_NAMES_FULL } from "@/utils/format";
import { ConfirmActionDialog, FeedbackDialog } from "@/components/ConfirmActionDialog";

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function yearMonths(year) {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

function yearFromDate(value) {
  const y = Number(String(value || "").slice(0, 4));
  return Number.isFinite(y) && y > 2000 ? y : new Date().getFullYear();
}

export default function RegistrarPagoDialog({ open, onOpenChange, socio, cfg, onSaved, allSocios }) {
  const [socioId, setSocioId] = useState(socio?.id || "");
  const [meses, setMeses] = useState([]);
  const [monto, setMonto] = useState(cfg?.cuotaMensual || 0);
  const [pagoAnual, setPagoAnual] = useState(false);
  const [fechaPago, setFechaPago] = useState(getTodayLocalDate());
  const [metodo, setMetodo] = useState("efectivo");
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);
  const [selSocio, setSelSocio] = useState(socio || null);
  const [socioSearch, setSocioSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [comprobantePago, setComprobantePago] = useState(null);

  const filteredSocios = useMemo(() => {
    if (!allSocios) return [];
    const normalize = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const q = normalize(socioSearch.trim());
    if (!q) return allSocios;
    return allSocios.filter((s) => {
      const full = normalize(`${s.apellido} ${s.nombre}`);
      return (
        full.includes(q) ||
        String(s.numeroSocio || "").includes(q) ||
        normalize(s.categoria).includes(q)
      );
    });
  }, [allSocios, socioSearch]);

  useEffect(() => {
    if (open) {
      setSocioId(socio?.id || "");
      setSelSocio(socio || null);
      setMonto(cfg?.cuotaMensual || 0);
      setPagoAnual(false);
      setMeses(socio?.mesesAdeudados?.length ? [socio.mesesAdeudados[0]] : []);
      setFechaPago(getTodayLocalDate());
      setMetodo("efectivo");
      setObservacion("");
      setSocioSearch("");
    }
  }, [open, socio, cfg]);

  // When using all-socios picker, load adeudados when socio changes
  useEffect(() => {
    if (!socio && socioId && allSocios) {
      const found = allSocios.find((s) => s.id === socioId);
      setSelSocio(found || null);
      setPagoAnual(false);
      setMeses(found?.mesesAdeudados?.length ? [found.mesesAdeudados[0]] : []);
    }
  }, [socioId, socio, allSocios]);

  const toggleMes = (m) => {
    if (pagoAnual) return;
    setMeses((prev) => {
      const next = prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m];
      setMonto((Number(cfg?.cuotaMensual || 0) * next.length).toString());
      return next;
    });
  };

  const togglePagoAnual = (checked) => {
    const enabled = !!checked;
    setPagoAnual(enabled);
    if (enabled) {
      const months = yearMonths(yearFromDate(fechaPago));
      setMeses(months);
      setMonto((Number(cfg?.cuotaMensual || 0) * months.length).toString());
      setObservacion((prev) => prev || `Pago anual ${yearFromDate(fechaPago)}`);
    } else {
      const next = selSocio?.mesesAdeudados?.length ? [selSocio.mesesAdeudados[0]] : [];
      setMeses(next);
      setMonto((Number(cfg?.cuotaMensual || 0) * Math.max(1, next.length)).toString());
    }
  };

  // Compute available months: union of mesesAdeudados + last 12 months for flexibility
  const computeOptions = () => {
    const set = new Set([...(selSocio?.mesesAdeudados || []), ...meses]);
    const now = new Date();
    for (let i = -12; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      set.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
    }
    return Array.from(set).sort();
  };

  const save = async () => {
    if (!socioId || meses.length === 0) {
      setFeedback({ variant: "error", title: "Faltan datos", description: "Seleccione socio y al menos un mes." });
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
      const { data: pagoRegistrado } = await api.post("/pagos", {
        socioId, meses, monto: parseFloat(monto), fechaPago, metodo, observacion, esPagoAnual: pagoAnual,
      });
      const socioComprobante = selSocio || socio || allSocios?.find((s) => s.id === socioId) || null;
      onOpenChange?.(false);
      setComprobantePago({ pago: pagoRegistrado, socio: socioComprobante });
    } catch (e) {
      setFeedback({ variant: "error", title: "No se pudo registrar", description: formatApiError(e?.response?.data?.detail) });
    } finally { setSaving(false); }
  };

  const mesesPagados = useMemo(() => new Set(selSocio?.mesesPagados || []), [selSocio]);
  const mesesDuplicados = meses.filter((m) => mesesPagados.has(m));
  const tieneMesesDuplicados = mesesDuplicados.length > 0;

  const opciones = computeOptions();
  const totalMonto = parseFloat(monto || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar pago{selSocio ? ` - ${selSocio.apellido}, ${selSocio.nombre}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!socio && allSocios && (
            <div>
              <Label>Socio</Label>
              <div className="relative mt-1.5 mb-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  data-testid="pago-search-socio"
                  placeholder="Buscar por nombre, apellido, N° o categoría..."
                  value={socioSearch}
                  onChange={(e) => setSocioSearch(e.target.value)}
                  className="pl-9 pr-9"
                />
                {socioSearch && (
                  <button
                    type="button"
                    onClick={() => setSocioSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Select value={socioId} onValueChange={setSocioId}>
                <SelectTrigger data-testid="pago-select-socio"><SelectValue placeholder={`Seleccionar socio (${filteredSocios.length} disponibles)`} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {filteredSocios.length === 0 && (
                    <div className="px-3 py-4 text-sm text-slate-500 text-center">Sin resultados</div>
                  )}
                  {filteredSocios.map((s) => (
                    <SelectItem key={s.id} value={s.id} data-testid={`pago-socio-option-${s.numeroSocio}`}>
                      #{s.numeroSocio} {s.apellido}, {s.nombre} — Cat. {s.categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs uppercase tracking-wider font-semibold text-slate-500">Meses a abonar</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-md">
              {opciones.map((m) => {
                const yaPagado = mesesPagados.has(m);
                const seleccionado = meses.includes(m);
                const adeudado = selSocio?.mesesAdeudados?.includes(m);

                return (
                  <button
                    key={m}
                    type="button"
                    data-testid={`pago-mes-${m}`}
                    onClick={() => toggleMes(m)}
                    disabled={pagoAnual || yaPagado}
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
            <p className="text-xs text-slate-500 mt-1.5">Los meses en rojo son los que el socio adeuda. Los meses tachados ya están pagados y no se pueden volver a registrar.</p>
            {tieneMesesDuplicados && (
              <p className="text-xs font-semibold text-red-600 mt-1.5">
                Ya existe un pago para: {mesesDuplicados.map(formatMesYM).join(", ")}. Anulá el pago anterior antes de volver a cargarlo.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={pagoAnual} onCheckedChange={togglePagoAnual} className="mt-0.5" />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Pago anual</span>
                <span className="block text-xs text-slate-600 mt-0.5">
                  Marca todos los meses del año {yearFromDate(fechaPago)} como abonados para este socio.
                </span>
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monto total abonado</Label>
              <Input data-testid="pago-monto" type="number" value={monto} onChange={(e) => setMonto(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Fecha de pago</Label>
              <Input type="date" value={fechaPago} onChange={(e) => {
                  const value = e.target.value;
                  setFechaPago(value);
                  if (pagoAnual) {
                    const months = yearMonths(yearFromDate(value));
                    setMeses(months);
                    setMonto((Number(cfg?.cuotaMensual || 0) * months.length).toString());
                  }
                }} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label>Método</Label>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger data-testid="pago-metodo" className="mt-1.5"><SelectValue /></SelectTrigger>
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
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex items-center justify-between">
            <span className="text-sm text-slate-600">Monto que figurará en pagos</span>
            <span className="text-lg font-bold text-slate-900">${totalMonto.toLocaleString("es-AR")}</span>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setConfirmOpen(true)} disabled={saving || meses.length === 0 || !socioId || tieneMesesDuplicados} className="bg-emerald-600 hover:bg-emerald-700" data-testid="confirm-pago-button">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar pago"
        description={`¿Querés registrar este pago por $${Number(totalMonto || 0).toLocaleString("es-AR")} para ${selSocio ? `${selSocio.apellido}, ${selSocio.nombre}` : "el socio seleccionado"}?`}
        confirmText="Registrar pago"
        onConfirm={async () => { setConfirmOpen(false); await save(); }}
      />
      <ComprobantePagoSocioDialog
        open={!!comprobantePago}
        onOpenChange={(open) => !open && setComprobantePago(null)}
        socio={comprobantePago?.socio}
        pago={comprobantePago?.pago}
        cfg={cfg}
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
