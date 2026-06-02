import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth, hasRole } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { SocioFormDialog } from "./Socios";
import { formatMoney, formatMesYM, formatDate } from "@/utils/format";
import { ArrowLeft, Pencil, CreditCard, AlertTriangle, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import html2canvas from "html2canvas";
import RegistrarPagoDialog from "@/components/RegistrarPagoDialog";
import CarnetDigital from "@/components/CarnetDigital";
import CarnetActions from "@/components/CarnetActions";
import { ConfirmActionDialog, FeedbackDialog } from "@/components/ConfirmActionDialog";

export default function SocioDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [socio, setSocio] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [pagoOpen, setPagoOpen] = useState(false);
  const carnetRef = useRef(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const load = async () => {
    const [s, c] = await Promise.all([
      api.get(`/socios/${id}`),
      api.get("/config"),
    ]);
    setSocio(s.data);
    setCfg(c.data);
    setCategorias(c.data.categorias);
  };
  useEffect(() => { load(); }, [id]);

  if (!socio || !cfg) {
    return <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" />Cargando ficha...</div>;
  }

  const isEntrenador = hasRole(user, "entrenador");
  const canEdit = hasRole(user, "admin", "secretaria");
  const canDeletePermanente = hasRole(user, "admin") && socio.estado === "baja";
  const canSeeSensitive = hasRole(user, "admin", "secretaria");
  const publicCarnetUrl = `${window.location.origin}/carnet/socio/${socio.id}`;
  const fechaEmision = new Date().toISOString().slice(0, 10);
  const mostrarFoto = Boolean(socio.autorizacionImagen && socio.fotoUrl);

  const baja = () => {
    setConfirmAction({
      title: "Dar de baja socio",
      description: "¿Querés dar de baja este socio? Permanecerá registrado, pero quedará marcado como baja.",
      confirmText: "Dar de baja",
      variant: "danger",
      run: async () => {
        await api.delete(`/socios/${id}`);
        setFeedback({ title: "Socio dado de baja", description: "El socio fue dado de baja correctamente." });
        load();
      },
    });
  };

  const eliminarDefinitivo = () => {
    setConfirmAction({
      title: "Eliminar socio definitivamente",
      description: `¿Querés eliminar definitivamente a ${socio.nombre} ${socio.apellido}? También se eliminarán sus pagos asociados. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      variant: "danger",
      run: async () => {
        await api.delete(`/socios/${id}/permanente`);
        setFeedback({ title: "Socio eliminado", description: "El socio fue eliminado definitivamente." });
        navigate("/socios");
      },
    });
  };

  function formatMesesHistorialPago(pago) {
    if (pago?.esPagoAnual) return "PAGO ANUAL";
    const meses = pago?.meses || [];
    if (meses.length === 12) return "PAGO ANUAL";
    return meses.map(formatMesYM).join(", ");
  }

  const downloadCarnetPNG = async () => {
    if (!carnetRef.current) return;
    const previousWidth = carnetRef.current.style.width;
    const previousHeight = carnetRef.current.style.height;
    const previousMaxWidth = carnetRef.current.style.maxWidth;
    carnetRef.current.style.width = "560px";
    carnetRef.current.style.height = "353px";
    carnetRef.current.style.maxWidth = "560px";
    const canvas = await html2canvas(carnetRef.current, { backgroundColor: null, scale: 3, useCORS: true, logging: false });
    carnetRef.current.style.width = previousWidth;
    carnetRef.current.style.height = previousHeight;
    carnetRef.current.style.maxWidth = previousMaxWidth;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `carnet-${socio.numeroSocio}-${socio.apellido}.png`;
    a.click();
  };

  const compartirLinkPago = () => {
    const txt = `Hola, te paso el link para abonar la cuota social de ${socio.nombre} ${socio.apellido} (Socio #${socio.numeroSocio} - ${cfg.nombreClub}):\n${cfg.linkPago || "(configurar link)"}\nAlias: ${cfg.aliasPago || "-"}\nGracias!`;
    const phone = (socio.tutorTelefono || "").replace(/\D/g, "");
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(txt)}` : `https://wa.me/?text=${encodeURIComponent(txt)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6" data-testid="socio-detalle-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/socios" className="text-sm text-blue-700 hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Volver a socios
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mt-2" style={{ fontFamily: "Outfit, sans-serif" }}>
            {socio.apellido}, {socio.nombre}
          </h1>
          <p className="text-slate-500 mt-1">Socio N° {socio.numeroSocio} · Categoría {socio.categoria} · Fútbol</p>
          {isEntrenador && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Vista de entrenador: solo se muestra el carnet de la categoría asignada.
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {canEdit && (
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="edit-socio-button"><Pencil className="w-4 h-4 mr-2" />Editar</Button>
              </DialogTrigger>
              <SocioFormDialog
                initial={socio}
                isEdit
                socioId={id}
                categorias={categorias}
                onSaved={() => { setEditOpen(false); load(); }}
              />
            </Dialog>
          )}
          {canEdit && socio.estado !== "baja" && (
            <Button variant="outline" onClick={baja} className="text-red-600 border-red-200" data-testid="baja-socio-button">Dar de baja</Button>
          )}
          {canDeletePermanente && (
            <Button variant="outline" onClick={eliminarDefinitivo} className="text-red-700 border-red-300 hover:bg-red-50" data-testid="eliminar-socio-button">
              <Trash2 className="w-4 h-4 mr-2" />Eliminar definitivo
            </Button>
          )}
          {canEdit && (
            <Button className="bg-blue-700 hover:bg-blue-800" onClick={() => setPagoOpen(true)} data-testid="open-registrar-pago">
              <CreditCard className="w-4 h-4 mr-2" />Registrar pago
            </Button>
          )}
        </div>
      </div>

      <div className={isEntrenador ? "grid gap-6 max-w-[620px]" : "grid gap-6 xl:grid-cols-[minmax(0,1fr)_560px] lg:grid-cols-[minmax(0,1fr)_500px]"}>
        {!isEntrenador && (
        <div className="space-y-6">
          <Section title="Datos del socio">
            <Row k="Estado" v={<EstadoBadge v={socio.estado} />} />
            <Row k="Categoría" v={socio.categoria || "-"} />
            <Row k="Fecha de alta" v={formatDate(socio.fechaAlta)} />
            <Row k="Fecha de nacimiento" v={formatDate(socio.fechaNacimiento)} />
            {canSeeSensitive && <Row k="DNI" v={socio.dni || "-"} />}
            {canSeeSensitive && <Row k="Dirección" v={socio.direccion || "-"} />}
            {canSeeSensitive && <Row k="Obra social" v={socio.obraSocial || "-"} />}
            <Row k="Madre, padre o tutor" v={socio.tutorNombre || "-"} />
            <Row k="Teléfono" v={socio.tutorTelefono || "-"} />
            <Row k="Autorización imagen" v={socio.autorizacionImagen ? "Sí" : "No"} />
            <Row k="Foto carnet" v={mostrarFoto ? "Cargada" : "No cargada o sin autorización"} />
            <Row k="Observaciones" v={socio.observaciones || "-"} />
          </Section>

          <Section title="Estado administrativo">
            <Row k="Cuota mensual" v={formatMoney(cfg.cuotaMensual || 0)} />
            <Row k="Cuota" v={
              socio.estadoCuota === "al_dia"
                ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-4 h-4" />Al día</span>
                : <span className="inline-flex items-center gap-1 text-red-700"><AlertTriangle className="w-4 h-4" />Con deuda</span>
            } />
            <Row k="Meses adeudados" v={socio.mesesAdeudados?.length ? socio.mesesAdeudados.map(formatMesYM).join(", ") : "Sin deuda"} />
            <Row k="Deuda total" v={formatMoney(socio.deudaTotal || 0)} />
          </Section>

          <Section title="Historial de pagos">
            {socio.pagos.length === 0 && <p className="text-sm text-slate-500">Sin pagos registrados.</p>}
            {socio.pagos.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs uppercase font-semibold text-slate-500">Fecha</th>
                      <th className="px-4 py-2 text-left text-xs uppercase font-semibold text-slate-500">Meses</th>
                      <th className="px-4 py-2 text-left text-xs uppercase font-semibold text-slate-500">Monto</th>
                      <th className="px-4 py-2 text-left text-xs uppercase font-semibold text-slate-500">Método</th>
                    </tr>
                  </thead>
                  <tbody>
                    {socio.pagos.map((p) => (
                      <tr key={p.id} className="border-t border-slate-200">
                        <td className="px-4 py-2 text-sm">{formatDate(p.fechaPago)}</td>
                        <td className="px-4 py-2 text-sm">{formatMesesHistorialPago(p)}</td>
                        <td className="px-4 py-2 text-sm font-semibold">{formatMoney(p.monto)}</td>
                        <td className="px-4 py-2 text-sm capitalize">{p.metodo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
        )}

        <div className="space-y-4 w-full lg:justify-self-end">
          <div className="w-full max-w-[560px] lg:max-w-none xl:w-[560px]">
            <h3 className="mb-4 text-sm uppercase tracking-wider font-semibold text-slate-500">Carnet digital</h3>
          <CarnetDigital
            refProp={carnetRef}
            tipo="socio"
            nombreClub={cfg.nombreClub}
            logoUrl={cfg.logoUrl}
            titulo="Carnet de Socio"
            etiquetaPersona="Socio"
            nombre={socio.nombre}
            apellido={socio.apellido}
            fotoUrl={socio.fotoUrl}
            mostrarFoto={mostrarFoto}
            estado={socio.estado}
            estadoCuota={socio.estadoCuota}
            fechaEmision={fechaEmision}
            qrValue={publicCarnetUrl}
            detalles={[
              { label: "N° Socio", value: `#${socio.numeroSocio}` },
              { label: "Categoría", value: socio.categoria },
            ]}
            testId="carnet-card"
          />
          <CarnetActions
            linkPago={cfg.linkPago}
            onDownloadImage={downloadCarnetPNG}
            onSendPaymentLink={compartirLinkPago}
            publicUrl={publicCarnetUrl}
            showPaymentActions={!isEntrenador}
          />
          </div>
        </div>
      </div>

      <RegistrarPagoDialog
        open={pagoOpen}
        onOpenChange={setPagoOpen}
        socio={socio}
        cfg={cfg}
        onSaved={() => { setPagoOpen(false); load(); }}
      />

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

function Section({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Row({ k, v }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold pt-0.5">{k}</span>
      <span className="text-sm text-slate-900 text-right">{v}</span>
    </div>
  );
}
function EstadoBadge({ v }) {
  const map = {
    activo: "bg-emerald-100 text-emerald-800",
    inactivo: "bg-slate-100 text-slate-700",
    baja: "bg-red-100 text-red-800",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[v]}`}>{v}</span>;
}
