import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Download, Loader2, MessageCircle, UserRound } from "lucide-react";
import { formatMoney, formatMesYM } from "@/utils/format";
import { downloadCsv } from "@/utils/exportCsv";
import ActionMenu from "@/components/ActionMenu";
import RegistrarPagoDialog from "@/components/RegistrarPagoDialog";
import { ConfirmActionDialog, FeedbackDialog } from "@/components/ConfirmActionDialog";

export default function Deudores() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoria, setCategoria] = useState("todas");
  const [cats, setCats] = useState([]);
  const [cfg, setCfg] = useState(null);
  const [pagoOpen, setPagoOpen] = useState(false);
  const [selectedSocio, setSelectedSocio] = useState(null);
  const [confirmExport, setConfirmExport] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/deudores", { params: { categoria } });
      setList(data);
    } catch (e) {
      setFeedback({ variant: "error", title: "No se pudo cargar", description: formatApiError(e?.response?.data?.detail) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get("/config").then(({ data }) => {
      setCats(data.categorias || []);
      setCfg(data);
    });
  }, []);

  useEffect(() => { load(); }, [categoria]);


  const totalDeuda = list.reduce((a, d) => a + Number(d.deudaTotal || 0), 0);

  const exportarCSV = () => {
    const rows = [
      ["N° Socio", "Apellido", "Nombre", "Categoría", "Madre, padre o tutor", "Teléfono", "Meses adeudados", "Cantidad", "Deuda total"],
      ...list.map((d) => [
        d.numeroSocio,
        d.apellido,
        d.nombre,
        d.categoria,
        d.tutorNombre,
        d.tutorTelefono,
        d.mesesAdeudados.map(formatMesYM).join(", "),
        d.cantidadMeses,
        d.deudaTotal,
      ]),
    ];
    downloadCsv(`deudores-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    setFeedback({ title: "CSV descargado", description: "El listado de deudores se descargó correctamente." });
  };

  const buildMsg = (d) => {
    const meses = d.mesesAdeudados.map(formatMesYM).join(", ");
    const link = cfg?.linkPago || "(link de pago)";
    const template = cfg?.mensajeWhatsapp || "Hola, familia. Les recordamos que se encuentra pendiente la cuota social de {meses} de {nombre}. Pueden abonarla desde este link: {link}. Muchas gracias. Comisión CEDI LOS 15.";
    return template
      .replace("{meses}", meses)
      .replace("{nombre}", `${d.nombre} ${d.apellido}`)
      .replace("{link}", link);
  };

  const openWhatsapp = (d) => {
    const phone = (d.tutorTelefono || "").replace(/\D/g, "");
    const txt = encodeURIComponent(buildMsg(d));
    const url = phone ? `https://wa.me/${phone}?text=${txt}` : `https://wa.me/?text=${txt}`;
    window.open(url, "_blank");
  };


  const openPago = (d) => {
    setSelectedSocio(d);
    setPagoOpen(true);
  };

  return (
    <div className="space-y-6" data-testid="deudores-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>Deudores</h1>
          <p className="text-slate-500 mt-1">{list.length} socios deben · {formatMoney(totalDeuda)} acumulado</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setConfirmExport(true)} data-testid="export-csv-button">
            <Download className="w-4 h-4 mr-2" />CSV
          </Button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger data-testid="deudores-filter-categoria" className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {cats.map(c => <SelectItem key={c} value={c}>Categoría {c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="text-sm text-slate-500">
          Usá el menú de cada fila para ver ficha, registrar pago o enviar WhatsApp.
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {["N°", "Socio", "Categoría", "Madre, padre o tutor", "Meses", "Cant.", "Deuda", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs uppercase font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500"><Loader2 className="inline w-4 h-4 animate-spin mr-2" />Cargando...</td></tr>}
              {!loading && list.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500 text-sm">🎉 No hay deudores. ¡Excelente!</td></tr>}
              {!loading && list.map((d) => (
                <tr key={d.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">#{d.numeroSocio}</td>
                  <td className="px-4 py-3 text-sm text-slate-900"><Link to={`/socios/${d.id}`} className="font-medium hover:text-blue-700">{d.apellido}, {d.nombre}</Link></td>
                  <td className="px-4 py-3 text-sm text-slate-600">{d.categoria}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {d.tutorNombre || "-"}<br />
                    <span className="text-xs text-slate-500">{d.tutorTelefono || "Sin teléfono"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate" title={d.mesesAdeudados.map(formatMesYM).join(", ")}>
                    {d.mesesAdeudados.map(formatMesYM).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-red-600">{d.cantidadMeses}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900">{formatMoney(d.deudaTotal)}</td>
                  <td className="px-4 py-3 text-right">
                    <ActionMenu
                      testId={`deudor-actions-${d.numeroSocio}`}
                      options={[
                        { label: "Ver ficha", icon: UserRound, color: "info", onClick: () => { window.location.href = `/socios/${d.id}`; } },
                        { label: "Registrar pago", icon: CreditCard, color: "payment", onClick: () => openPago(d) },
                        { label: "Enviar WhatsApp", icon: MessageCircle, color: "success", onClick: () => openWhatsapp(d) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RegistrarPagoDialog
        open={pagoOpen}
        onOpenChange={setPagoOpen}
        socio={selectedSocio}
        cfg={cfg}
        onSaved={() => {
          setPagoOpen(false);
          setSelectedSocio(null);
          load();
        }}
      />

      <ConfirmActionDialog
        open={confirmExport}
        onOpenChange={setConfirmExport}
        title="Descargar CSV"
        description="¿Querés descargar el listado de deudores según los filtros actuales?"
        confirmText="Descargar"
        onConfirm={() => {
          setConfirmExport(false);
          exportarCSV();
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
