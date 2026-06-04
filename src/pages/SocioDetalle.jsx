import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth, hasRole } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { SocioFormDialog } from "./Socios";
import { formatMoney, formatMesYM, formatDate } from "@/utils/format";
import {
  ArrowLeft,
  Pencil,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
} from "lucide-react";
import RegistrarPagoDialog from "@/components/RegistrarPagoDialog";
import CarnetDigital from "@/components/CarnetDigital";
import CarnetActions from "@/components/CarnetActions";
import { ConfirmActionDialog, FeedbackDialog } from "@/components/ConfirmActionDialog";
import { createCarnetPngCanvas, sanitizeFileName, waitForCarnetImages } from "@/utils/carnetCanvas";

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
  const exportCarnetRef = useRef(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const load = async () => {
    const [s, c] = await Promise.all([
      api.get(`/socios/${id}`),
      api.get("/config"),
    ]);

    setSocio(s.data);
    setCfg(c.data);
    setCategorias(c.data.categorias || []);
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!socio || !cfg) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando ficha...
      </div>
    );
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
        setFeedback({
          title: "Socio dado de baja",
          description: "El socio fue dado de baja correctamente.",
        });
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
        setFeedback({
          title: "Socio eliminado",
          description: "El socio fue eliminado definitivamente.",
        });
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
    if (!exportCarnetRef.current) return;

    await waitForCarnetImages(exportCarnetRef.current);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const qrCanvas = exportCarnetRef.current.querySelector("canvas");
    const canvas = await createCarnetPngCanvas({
      tipo: "socio",
      nombreClub: cfg.nombreClub,
      titulo: "Carnet de Socio",
      etiquetaPersona: "Socio",
      nombre: socio.nombre,
      apellido: socio.apellido,
      fotoUrl: socio.fotoUrl,
      mostrarFoto,
      detalles: [
        { label: "N° Socio", value: `#${socio.numeroSocio}` },
        { label: "Categoría", value: socio.categoria },
      ],
      estado: socio.estado,
      fechaEmision: formatDate(fechaEmision),
      qrCanvas,
    });

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFileName(`carnet-${socio.numeroSocio}-${socio.apellido}`)}.png`;
    a.click();
  };

  const compartirLinkPago = () => {
    const txt = `Hola, te paso el link para abonar la cuota social de ${socio.nombre} ${socio.apellido} (Socio #${socio.numeroSocio} - ${cfg.nombreClub}):\n${cfg.linkPago || "(configurar link)"}\nAlias: ${cfg.aliasPago || "-"}\nGracias!`;
    const phone = (socio.tutorTelefono || "").replace(/\D/g, "");
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(txt)}`
      : `https://wa.me/?text=${encodeURIComponent(txt)}`;

    window.open(url, "_blank");
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-hidden" data-testid="socio-detalle-page">
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Link
            to="/socios"
            className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
          >
            <ArrowLeft className="h-3 w-3 shrink-0" />
            Volver a socios
          </Link>

          <h1
            className="mt-2 break-words text-2xl font-bold text-slate-900 md:text-3xl"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {socio.apellido}, {socio.nombre}
          </h1>

          <p className="mt-1 break-words text-sm text-slate-500 sm:text-base">
            Socio N° {socio.numeroSocio} · Categoría {socio.categoria} · Fútbol
          </p>

          {isEntrenador && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Vista de entrenador: solo se muestra el carnet de la categoría asignada.
            </p>
          )}
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
          {canEdit && (
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto" data-testid="edit-socio-button">
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </DialogTrigger>

              <SocioFormDialog
                initial={socio}
                isEdit
                socioId={id}
                categorias={categorias}
                onSaved={() => {
                  setEditOpen(false);
                  load();
                }}
              />
            </Dialog>
          )}

          {canEdit && socio.estado !== "baja" && (
            <Button
              variant="outline"
              onClick={baja}
              className="w-full border-red-200 text-red-600 sm:w-auto"
              data-testid="baja-socio-button"
            >
              Dar de baja
            </Button>
          )}

          {canDeletePermanente && (
            <Button
              variant="outline"
              onClick={eliminarDefinitivo}
              className="w-full border-red-300 text-red-700 hover:bg-red-50 sm:w-auto"
              data-testid="eliminar-socio-button"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar definitivo
            </Button>
          )}

          {canEdit && (
            <Button
              className="w-full bg-blue-700 hover:bg-blue-800 sm:w-auto"
              onClick={() => setPagoOpen(true)}
              data-testid="open-registrar-pago"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Registrar pago
            </Button>
          )}
        </div>
      </div>

      <div
        className={
          isEntrenador
            ? "grid min-w-0 gap-6"
            : "grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_560px]"
        }
      >
        {!isEntrenador && (
          <div className="min-w-0 space-y-6">
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

              <Row
                k="Cuota"
                v={
                  socio.estadoCuota === "al_dia" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Al día
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-700">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Con deuda
                    </span>
                  )
                }
              />

              <Row
                k="Meses adeudados"
                v={socio.mesesAdeudados?.length ? socio.mesesAdeudados.map(formatMesYM).join(", ") : "Sin deuda"}
              />

              <Row k="Deuda total" v={formatMoney(socio.deudaTotal || 0)} />
            </Section>

            <Section title="Historial de pagos">
              {socio.pagos.length === 0 && (
                <p className="text-sm text-slate-500">Sin pagos registrados.</p>
              )}

              {socio.pagos.length > 0 && (
                <div className="w-full overflow-x-auto rounded-lg border border-slate-100">
                  <table className="min-w-[560px] w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">Fecha</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">Meses</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">Monto</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">Método</th>
                      </tr>
                    </thead>
                    <tbody>
                      {socio.pagos.map((p) => (
                        <tr key={p.id} className="border-t border-slate-200">
                          <td className="whitespace-nowrap px-4 py-2">{formatDate(p.fechaPago)}</td>
                          <td className="px-4 py-2">{formatMesesHistorialPago(p)}</td>
                          <td className="whitespace-nowrap px-4 py-2 font-semibold">{formatMoney(p.monto)}</td>
                          <td className="whitespace-nowrap px-4 py-2 capitalize">
                            {p.metodo === "mercadopago" ? "Mercado Pago" : p.metodo}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        )}

        <aside className={isEntrenador ? "min-w-0" : "min-w-0 space-y-4 xl:justify-self-end"}>
          <div className="mx-auto w-full max-w-[560px]">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Carnet digital
            </h3>

            <div className="w-full overflow-hidden">
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
            </div>

            <div className="mt-4">
              <CarnetActions
                linkPago={cfg.linkPago}
                onDownloadImage={downloadCarnetPNG}
                onSendPaymentLink={compartirLinkPago}
                publicUrl={publicCarnetUrl}
                showPaymentActions={!isEntrenador}
              />

              <div className="fixed left-[-10000px] top-0 h-[353px] w-[560px] overflow-hidden opacity-100 pointer-events-none">
                <CarnetDigital
                  refProp={exportCarnetRef}
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
                  testId="carnet-card-export"
                  exportMode
                />
              </div>
            </div>
          </div>
        </aside>
      </div>

      <RegistrarPagoDialog
        open={pagoOpen}
        onOpenChange={setPagoOpen}
        socio={socio}
        cfg={cfg}
        onSaved={() => {
          setPagoOpen(false);
          load();
        }}
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
          try {
            await action?.run?.();
          } catch (e) {
            setFeedback({
              variant: "error",
              title: "No se pudo completar",
              description: formatApiError(e?.response?.data?.detail),
            });
          }
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
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <h3 className="mb-4 break-words text-base font-semibold text-slate-900">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Row({ k, v }) {
  return (
    <div className="grid min-w-0 gap-1 border-b border-slate-100 py-3 last:border-0 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-start sm:gap-4">
      <span className="min-w-0 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {k}
      </span>
      <span className="min-w-0 break-words text-sm font-medium text-slate-900 sm:text-right [&_*]:break-words">
        {v}
      </span>
    </div>
  );
}

function EstadoBadge({ v }) {
  const map = {
    activo: "bg-emerald-100 text-emerald-800",
    inactivo: "bg-slate-100 text-slate-700",
    baja: "bg-red-100 text-red-800",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${map[v] || map.inactivo}`}>
      {v}
    </span>
  );
}
