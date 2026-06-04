import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Search, CreditCard, Banknote, ListFilter, Eye, RotateCcw } from "lucide-react";
import { useAuth, hasRole } from "@/context/AuthContext";
import { formatMoney, formatDate, formatMesYM, formatMetodoPago } from "@/utils/format";
import ActionMenu from "@/components/ActionMenu";
import { ConfirmActionDialog, FeedbackDialog } from "@/components/ConfirmActionDialog";
import { downloadCsv } from "@/utils/exportCsv";
import PagosSummaryCard from "@/components/payments/PagosSummaryCard";
import DateFilterField from "@/components/payments/DateFilterField";

function normalizar(texto = "") {
  return String(texto).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function currentYm() {
  return new Date().toISOString().slice(0, 7);
}

function pagoSortValue(p = {}) {
  return `${p.fechaPago || ""}T${p.createdAt || ""}`;
}

function sortPagosDesc(a, b) {
  return pagoSortValue(b).localeCompare(pagoSortValue(a));
}

function formatMesesPago(pago) {
  if (pago?.esPagoAnual) return "PAGO ANUAL";
  const meses = pago?.meses || [];
  if (pago?.tipo === "socio" && meses.length === 12) return "PAGO ANUAL";
  return meses.map(formatMesYM).join(", ");
}

export default function Pagos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState("todos");
  const [metodo, setMetodo] = useState("todos");
  const [categoria, setCategoria] = useState("todas");
  const [actividadId, setActividadId] = useState("todas");
  const [mes, setMes] = useState(currentYm());
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cats, setCats] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [allSocios, setAllSocios] = useState([]);
  const [cfg, setCfg] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cfgRes, sociosRes, pagosSociosRes, actividadesRes, pagosActividadesRes] = await Promise.all([
        api.get("/config"),
        api.get("/socios"),
        api.get("/pagos"),
        api.get("/actividades"),
        api.get("/actividades/pagos"),
      ]);

      const pagosSocios = (pagosSociosRes.data || []).map((p) => ({
        ...p,
        rowId: `socio-${p.id}`,
        tipo: "socio",
        tipoLabel: "Socio",
        personaNombre: p.socioNombre,
        detalle: `N° ${p.socioNumero || "-"} · Cat. ${p.socioCategoria || "-"}`,
        categoria: p.socioCategoria || "",
        actividadId: "",
        concepto: p.esPagoAnual ? "Cuota anual" : "Cuota social",
        destinoUrl: p.socioId ? `/socios/${p.socioId}` : "",
      }));

      const pagosActividades = (pagosActividadesRes.data || []).map((p) => ({
        ...p,
        rowId: `actividad-${p.id}`,
        tipo: "actividad",
        tipoLabel: "Actividad",
        personaNombre: p.alumnoNombre,
        detalle: `${p.actividadNombre || "Sin actividad"} · Prof. ${p.profesor || "A definir"}`,
        categoria: "",
        concepto: "Cuota actividad",
        destinoUrl: p.alumnoId ? `/actividades/alumnos/${p.alumnoId}` : "",
      }));

      setCfg(cfgRes.data);
      setCats(cfgRes.data.categorias || []);
      setAllSocios(sociosRes.data || []);
      setActividades(actividadesRes.data || []);
      setList([...pagosSocios, ...pagosActividades].sort(sortPagosDesc));
    } catch (e) {
      setFeedback({ variant: "error", title: "No se pudo cargar", description: formatApiError(e?.response?.data?.detail) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const canEdit = hasRole(user, "admin", "secretaria");
  const canExport = hasRole(user, "admin", "secretaria", "comision");

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return list
      .filter((p) => tipo === "todos" || p.tipo === tipo)
      .filter((p) => metodo === "todos" || p.metodo === metodo)
      .filter((p) => categoria === "todas" || p.categoria === categoria)
      .filter((p) => actividadId === "todas" || p.actividadId === actividadId)
      .filter((p) => !mes || (p.fechaPago || "").startsWith(mes))
      .filter((p) => !desde || p.fechaPago >= desde)
      .filter((p) => !hasta || p.fechaPago <= hasta)
      .filter((p) => {
        if (!q) return true;
        return normalizar(`${p.personaNombre} ${p.detalle} ${p.concepto} ${p.observacion}`).includes(q);
      })
      .sort(sortPagosDesc);
  }, [list, tipo, metodo, categoria, actividadId, mes, desde, hasta, busqueda]);

  const resumen = useMemo(() => {
    const total = filtrados.reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const efectivo = filtrados.filter((p) => p.metodo === "efectivo").reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const mercadoPago = filtrados.filter((p) => p.metodo === "mercadopago").reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const otros = filtrados.filter((p) => !["efectivo", "mercadopago"].includes(p.metodo)).reduce((acc, p) => acc + Number(p.monto || 0), 0);
    return { total, efectivo, mercadoPago, otros, cantidad: filtrados.length };
  }, [filtrados]);

  const doExportCSV = () => {
    const rows = [
      ["Fecha", "Tipo", "Nombre", "Detalle", "Concepto", "Meses", "Monto", "Método", "Observación"],
      ...filtrados.map((p) => [
        p.fechaPago,
        p.tipoLabel,
        p.personaNombre,
        p.detalle,
        p.concepto,
        formatMesesPago(p),
        p.monto,
        formatMetodoPago(p.metodo),
        p.observacion || "",
      ]),
    ];
    downloadCsv(`pagos-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    setFeedback({ title: "CSV descargado", description: "El listado de movimientos se descargó correctamente." });
  };

  const exportCSV = () => {
    setConfirmAction({
      title: "Descargar CSV",
      description: "¿Querés descargar los pagos según los filtros actuales?",
      confirmText: "Descargar",
      run: doExportCSV,
    });
  };

  const clearFilters = () => {
    setTipo("todos");
    setMetodo("todos");
    setCategoria("todas");
    setActividadId("todas");
    setMes(currentYm());
    setDesde("");
    setHasta("");
    setBusqueda("");
  };

  const anularPago = (pago) => {
    const tipoTexto = pago.tipo === "actividad" ? "actividad" : "socio";
    setConfirmAction({
      title: "Anular pago",
      description: `¿Querés anular este pago de ${tipoTexto}? Esta acción vuelve a dejar pendiente el/los mes/es asociados.`,
      confirmText: "Anular pago",
      variant: "danger",
      run: async () => {
        const endpoint = pago.tipo === "actividad" ? `/actividades/pagos/${pago.id}` : `/pagos/${pago.id}`;
        await api.delete(endpoint);
        setFeedback({ title: "Pago anulado", description: "El movimiento fue anulado correctamente." });
        load();
      },
    });
  };

  return (
    <div className="space-y-6" data-testid="pagos-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>Pagos</h1>
          <p className="text-slate-500 mt-1">Consulta de movimientos de socios y actividades.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canExport && (
            <Button variant="outline" onClick={exportCSV} data-testid="pagos-export-csv"><Download className="w-4 h-4 mr-2" />CSV</Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <PagosSummaryCard icon={CreditCard} tone="blue" label={mes ? `Total por fecha ${formatMesYM(mes)}` : "Total filtrado"} value={formatMoney(resumen.total)} />
        <PagosSummaryCard icon={Banknote} tone="emerald" label="Efectivo" value={formatMoney(resumen.efectivo)} />
        <PagosSummaryCard icon={CreditCard} tone="amber" label="Mercado Pago" value={formatMoney(resumen.mercadoPago)} />
        <PagosSummaryCard icon={ListFilter} tone="slate" label="Movimientos" value={resumen.cantidad} details={resumen.otros > 0 ? `Otros: ${formatMoney(resumen.otros)}` : ""} />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por socio, alumno, actividad, profesor u observación..." className="pl-9" />
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="socio">Socios / Fútbol</SelectItem>
              <SelectItem value="actividad">Actividades</SelectItem>
            </SelectContent>
          </Select>
          <Select value={metodo} onValueChange={setMetodo}>
            <SelectTrigger data-testid="pagos-filter-metodo"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los métodos</SelectItem>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="mercadopago">Mercado Pago</SelectItem>
              <SelectItem value="otro">Otro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoria} onValueChange={setCategoria} disabled={tipo === "actividad"}>
            <SelectTrigger data-testid="pagos-filter-categoria"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {cats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={actividadId} onValueChange={setActividadId} disabled={tipo === "socio"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las actividades</SelectItem>
              {actividades.map((a) => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 md:grid-cols-4 md:items-end">
          <label className="block min-w-0">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Mes</span>
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="h-11 bg-white text-slate-900 [color-scheme:light]" />
          </label>
          <DateFilterField label="Desde" value={desde} onChange={setDesde} testId="pagos-filter-desde" />
          <DateFilterField label="Hasta" value={hasta} onChange={setHasta} testId="pagos-filter-hasta" />
          <Button type="button" variant="outline" onClick={clearFilters} className="h-11">Limpiar filtros</Button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {["Fecha", "Nombre", "Tipo", "Concepto", "Meses", "Método", "Monto", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs uppercase font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500"><Loader2 className="inline w-4 h-4 animate-spin mr-2" />Cargando...</td></tr>}
              {!loading && filtrados.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500 text-sm">Sin pagos para los filtros seleccionados.</td></tr>}
              {!loading && filtrados.map((p) => (
                <tr key={p.rowId} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(p.fechaPago)}</td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      type="button"
                      onClick={() => p.destinoUrl && navigate(p.destinoUrl)}
                      className="font-semibold text-blue-700 text-left"
                    >
                      {p.personaNombre || "-"}
                    </button>
                    <div className="text-xs text-slate-500 mt-0.5">{p.detalle}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${p.tipo === "socio" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{p.tipoLabel}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.concepto}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatMesesPago(p)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatMetodoPago(p.metodo)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900 whitespace-nowrap">{formatMoney(p.monto)}</td>
                  <td className="px-4 py-3 text-right">
                    <ActionMenu
                      testId={`actions-pago-${p.rowId}`}
                      options={[
                        { label: "Ver ficha", icon: Eye, color: "info", onClick: () => p.destinoUrl && navigate(p.destinoUrl) },
                        canEdit && { label: "Anular pago", icon: RotateCcw, color: "danger", onClick: () => anularPago(p) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmActionDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.title}
        description={confirmAction?.description}
        confirmText={confirmAction?.confirmText}
        variant={confirmAction?.variant}
        onConfirm={async () => {
          const action = confirmAction;
          setConfirmAction(null);
          try { await action?.run?.(); }
          catch (e) { setFeedback({ variant: "error", title: "No se pudo completar", description: formatApiError(e?.response?.data?.detail) }); }
        }}
      />
      <FeedbackDialog
        open={!!feedback}
        onOpenChange={(open) => !open && setFeedback(null)}
        title={feedback?.title}
        description={feedback?.description}
        variant={feedback?.variant}
      />
    </div>
  );
}

