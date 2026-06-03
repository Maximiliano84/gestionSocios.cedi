import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth, hasRole } from "@/context/AuthContext";
import { formatDate, formatMesYM, formatMoney } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, ArrowLeft, CheckCircle2, CreditCard, Edit2, Loader2, Trash2 } from "lucide-react";
import html2canvas from "html2canvas";
import CarnetDigital from "@/components/CarnetDigital";
import CarnetActions from "@/components/CarnetActions";
import RegistrarPagoActividadDialog from "@/components/RegistrarPagoActividadDialog";
import { ConfirmActionDialog, FeedbackDialog } from "@/components/ConfirmActionDialog";
import PhotoUploadField from "@/components/PhotoUploadField";

const currentYm = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);

export default function AlumnoActividadDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = hasRole(user, "admin", "secretaria");
  const canDeletePermanente = hasRole(user, "admin");

  const [alumno, setAlumno] = useState(null);
  const [actividades, setActividades] = useState([]);
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pagoOpen, setPagoOpen] = useState(false);
  const [form, setForm] = useState({});
  const [pagoForm, setPagoForm] = useState({
    mes: currentYm(),
    monto: "",
    fechaPago: today(),
    metodo: "efectivo",
    observacion: "",
  });
  const carnetRef = useRef(null);
  const exportCarnetRef = useRef(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [alumnoRes, actsRes, cfgRes] = await Promise.all([
        api.get(`/actividades/alumnos/${id}`),
        api.get("/actividades"),
        api.get("/config"),
      ]);
      setAlumno(alumnoRes.data);
      setActividades(actsRes.data || []);
      setCfg(cfgRes.data);
    } catch (e) {
      setFeedback({
        variant: "error",
        title: "No se pudo cargar",
        description: formatApiError(e?.response?.data?.detail),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando ficha del alumno...
      </div>
    );
  }

  if (!alumno || !cfg) {
    return <div className="text-slate-500">Alumno no encontrado.</div>;
  }

  const fechaEmision = today();
  const carnetUrl = `${window.location.origin}/carnet/actividad/${alumno.id}`;
  const mostrarFoto = Boolean(alumno.autorizacionImagen && alumno.fotoUrl);

  const openEdit = () => {
    setForm({
      nombre: alumno.nombre || "",
      apellido: alumno.apellido || "",
      actividadId: alumno.actividadId || "",
      dni: alumno.dni || "",
      fechaNacimiento: alumno.fechaNacimiento || "",
      direccion: alumno.direccion || "",
      obraSocial: alumno.obraSocial || "",
      tutorNombre: alumno.tutorNombre || "",
      tutorTelefono: alumno.tutorTelefono || "",
      fotoUrl: alumno.fotoUrl || "",
      fotoPublicId: alumno.fotoPublicId || "",
      autorizacionImagen: !!alumno.autorizacionImagen,
      fechaAlta: alumno.fechaAlta || today(),
      estado: alumno.estado || "activo",
      observaciones: alumno.observaciones || "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/actividades/alumnos/${alumno.id}`, form);
      setFeedback({
        title: "Alumno actualizado",
        description: "Los datos del alumno fueron actualizados correctamente.",
      });
      setEditOpen(false);
      load();
    } catch (e) {
      setFeedback({
        variant: "error",
        title: "No se pudo guardar",
        description: formatApiError(e?.response?.data?.detail),
      });
    } finally {
      setSaving(false);
    }
  };

  const openPago = () => {
    setPagoForm({
      mes: currentYm(),
      monto: String(alumno.cuotaMensual || ""),
      fechaPago: today(),
      metodo: "efectivo",
      observacion: "",
    });
    setPagoOpen(true);
  };

  const savePago = async () => {
    setSaving(true);
    try {
      await api.post("/actividades/pagos", {
        alumnoId: alumno.id,
        actividadId: alumno.actividadId,
        meses: [pagoForm.mes],
        monto: Number(pagoForm.monto || 0),
        fechaPago: pagoForm.fechaPago,
        metodo: pagoForm.metodo,
        observacion: pagoForm.observacion,
      });
      setFeedback({
        title: "Pago realizado con éxito",
        description: "El pago quedó registrado correctamente.",
      });
      setPagoOpen(false);
      load();
    } catch (e) {
      setFeedback({
        variant: "error",
        title: "No se pudo registrar",
        description: formatApiError(e?.response?.data?.detail),
      });
    } finally {
      setSaving(false);
    }
  };

  const bajaAlumno = () => {
    setConfirmAction({
      title: "Dar de baja alumno",
      description: `¿Querés dar de baja a ${alumno.nombre} ${alumno.apellido}?`,
      confirmText: "Dar de baja",
      variant: "danger",
      run: async () => {
        await api.delete(`/actividades/alumnos/${alumno.id}`);
        setFeedback({
          title: "Alumno dado de baja",
          description: "El alumno fue dado de baja correctamente.",
        });
        load();
      },
    });
  };

  const eliminarDefinitivo = () => {
    setConfirmAction({
      title: "Eliminar alumno definitivamente",
      description: `¿Querés eliminar definitivamente a ${alumno.nombre} ${alumno.apellido}? También se eliminarán sus pagos asociados.`,
      confirmText: "Eliminar",
      variant: "danger",
      run: async () => {
        await api.delete(`/actividades/alumnos/${alumno.id}/permanente`);
        setFeedback({
          title: "Alumno eliminado",
          description: "El alumno fue eliminado definitivamente.",
        });
        navigate("/actividades");
      },
    });
  };

  const downloadCarnetPNG = async () => {
    if (!exportCarnetRef.current) return;

    await waitForCarnetImages(exportCarnetRef.current);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const qrCanvas = exportCarnetRef.current.querySelector("canvas");
    const canvas = await createCarnetPngCanvas({
      tipo: "actividad",
      nombreClub: cfg.nombreClub,
      titulo: "Carnet de Alumno",
      etiquetaPersona: "Alumno/a",
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      fotoUrl: alumno.fotoUrl,
      mostrarFoto,
      detalles: [
        { label: "Actividad", value: alumno.actividadNombre },
        { label: "Profesor/a", value: alumno.profesor },
      ],
      estado: alumno.estado,
      fechaEmision: formatDate(fechaEmision),
      qrCanvas,
    });

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${sanitizeFileName(`carnet-alumno-${alumno.apellido}-${alumno.nombre}`)}.png`;
    a.click();
  };

  const compartirLinkPago = () => {
    const txt = `Hola, te paso el link para abonar la cuota de ${alumno.actividadNombre} de ${alumno.nombre} ${alumno.apellido} (${cfg.nombreClub}):\n${cfg.linkPago || "(configurar link)"}\nAlias: ${cfg.aliasPago || "-"}\nGracias!`;
    const phone = (alumno.tutorTelefono || "").replace(/\D/g, "");
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(txt)}`
      : `https://wa.me/?text=${encodeURIComponent(txt)}`;

    window.open(url, "_blank");
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-hidden px-0">
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <Link
            to="/actividades"
            className="mb-2 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Volver a actividades
          </Link>

          <h2
            className="break-words text-2xl font-bold text-slate-900 md:text-3xl"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {alumno.nombre} {alumno.apellido}
          </h2>

          <p className="min-w-0 break-words text-sm text-slate-500 sm:text-base">
            Ficha de alumno de actividades · {alumno.actividadNombre}
          </p>
        </div>

        {canManage && (
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
            <Button onClick={openPago} className="w-full bg-blue-700 hover:bg-blue-800 sm:w-auto">
              <CreditCard className="mr-2 h-4 w-4" />
              Registrar pago
            </Button>

            <Button variant="outline" onClick={openEdit} className="w-full sm:w-auto">
              <Edit2 className="mr-2 h-4 w-4" />
              Editar
            </Button>

            {alumno.estado !== "baja" && (
              <Button
                variant="outline"
                onClick={bajaAlumno}
                className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 sm:w-auto"
              >
                Dar de baja
              </Button>
            )}

            {canDeletePermanente && alumno.estado === "baja" && (
              <Button
                variant="outline"
                onClick={eliminarDefinitivo}
                className="w-full border-red-200 text-red-600 hover:bg-red-50 sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_560px]">
        <div className="min-w-0 space-y-6">
          <Section title="Datos del alumno">
            <Row k="Estado" v={<EstadoBadge estado={alumno.estado} />} />
            <Row k="Actividad" v={`${alumno.actividadNombre || "-"} · ${alumno.profesor || "-"}`} />
            <Row k="Fecha de alta" v={formatDate(alumno.fechaAlta)} />
            <Row k="Fecha de nacimiento" v={formatDate(alumno.fechaNacimiento)} />
            <Row k="DNI" v={alumno.dni || "-"} />
            <Row k="Dirección" v={alumno.direccion || "-"} />
            <Row k="Obra social" v={alumno.obraSocial || "-"} />
            <Row k="Madre, padre o tutor" v={alumno.tutorNombre || "-"} />
            <Row k="Teléfono" v={alumno.tutorTelefono || "-"} />
            <Row k="Autorización imagen" v={alumno.autorizacionImagen ? "Sí" : "No"} />
            <Row k="Foto carnet" v={mostrarFoto ? "Cargada" : "No cargada o sin autorización"} />
            <Row k="Observaciones" v={alumno.observaciones || "-"} />
          </Section>

          <Section title="Estado administrativo">
            <Row k="Cuota mensual" v={formatMoney(alumno.cuotaMensual)} />

            <Row
              k="Cuota"
              v={
                alumno.estadoCuota === "al_dia" ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Al día
                  </span>
                ) : (
                  <span className="inline-flex flex-col items-start gap-1 sm:items-end">
                    <span className="inline-flex items-center gap-1 text-red-700">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Con deuda
                    </span>
                    {alumno.cuotaVencida && (
                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        {alumno.cuotaVencidaTexto || "Cuota vencida"}
                      </span>
                    )}
                  </span>
                )
              }
            />

            <Row
              k="Meses adeudados"
              v={alumno.mesesAdeudados?.length ? alumno.mesesAdeudados.map(formatMesYM).join(", ") : "Sin deuda"}
            />
            <Row k="Deuda total" v={formatMoney(alumno.deudaTotal || 0)} />
          </Section>

          <Section title="Historial de pagos">
            {!alumno.pagos?.length ? (
              <p className="text-sm text-slate-500">Sin pagos registrados.</p>
            ) : (
              <div className="w-full overflow-x-auto rounded-lg border border-slate-100">
                <table className="min-w-[560px] w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Fecha</th>
                      <th className="px-4 py-2 text-left font-semibold">Meses</th>
                      <th className="px-4 py-2 text-left font-semibold">Monto</th>
                      <th className="px-4 py-2 text-left font-semibold">Método</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {alumno.pagos.map((p) => (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap px-4 py-2">{formatDate(p.fechaPago)}</td>
                        <td className="px-4 py-2">{(p.meses || []).map(formatMesYM).join(", ")}</td>
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

        <aside className="min-w-0 space-y-4 xl:justify-self-end">
          <div className="mx-auto w-full max-w-[560px]">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Carnet de alumno
            </h3>

            <div className="w-full overflow-hidden">
              <CarnetDigital
                refProp={carnetRef}
                tipo="actividad"
                nombreClub={cfg.nombreClub}
                logoUrl={cfg.logoUrl}
                titulo="Carnet de Alumno"
                etiquetaPersona="Alumno/a"
                nombre={alumno.nombre}
                apellido={alumno.apellido}
                fotoUrl={alumno.fotoUrl}
                mostrarFoto={mostrarFoto}
                estado={alumno.estado}
                estadoCuota={alumno.estadoCuota}
                fechaEmision={fechaEmision}
                qrValue={carnetUrl}
                detalles={[
                  { label: "Actividad", value: alumno.actividadNombre },
                  { label: "Profesor/a", value: alumno.profesor },
                ]}
                testId="carnet-alumno"
              />
            </div>

            <div className="mt-4">
              <CarnetActions
                linkPago={cfg.linkPago}
                onDownloadImage={downloadCarnetPNG}
                onSendPaymentLink={compartirLinkPago}
                publicUrl={carnetUrl}
              />

              <div className="fixed left-[-10000px] top-0 h-[353px] w-[560px] overflow-hidden opacity-100 pointer-events-none">
                <CarnetDigital
                  refProp={exportCarnetRef}
                  tipo="actividad"
                  nombreClub={cfg.nombreClub}
                  logoUrl={cfg.logoUrl}
                  titulo="Carnet de Alumno"
                  etiquetaPersona="Alumno/a"
                  nombre={alumno.nombre}
                  apellido={alumno.apellido}
                  fotoUrl={alumno.fotoUrl}
                  mostrarFoto={mostrarFoto}
                  estado={alumno.estado}
                  estadoCuota={alumno.estadoCuota}
                  fechaEmision={fechaEmision}
                  qrValue={carnetUrl}
                  detalles={[
                    { label: "Actividad", value: alumno.actividadNombre },
                    { label: "Profesor/a", value: alumno.profesor },
                  ]}
                  testId="carnet-alumno-export"
                  exportMode
                />
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-24px)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar alumno</DialogTitle>
            <DialogDescription>Este alumno pertenece solo al módulo de actividades.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre">
              <Input value={form.nombre || ""} onChange={(e) => setForm((v) => ({ ...v, nombre: e.target.value }))} />
            </Field>
            <Field label="Apellido">
              <Input value={form.apellido || ""} onChange={(e) => setForm((v) => ({ ...v, apellido: e.target.value }))} />
            </Field>
            <Field label="Actividad">
              <Select value={form.actividadId || ""} onValueChange={(value) => setForm((v) => ({ ...v, actividadId: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {actividades.map((a) => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Estado">
              <Select value={form.estado || "activo"} onValueChange={(value) => setForm((v) => ({ ...v, estado: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="DNI"><Input value={form.dni || ""} onChange={(e) => setForm((v) => ({ ...v, dni: e.target.value }))} /></Field>
            <Field label="Fecha de nacimiento"><Input type="date" value={form.fechaNacimiento || ""} onChange={(e) => setForm((v) => ({ ...v, fechaNacimiento: e.target.value }))} /></Field>
            <Field label="Dirección"><Input value={form.direccion || ""} onChange={(e) => setForm((v) => ({ ...v, direccion: e.target.value }))} /></Field>
            <Field label="Obra social"><Input value={form.obraSocial || ""} onChange={(e) => setForm((v) => ({ ...v, obraSocial: e.target.value }))} /></Field>
            <Field label="Madre, padre o tutor"><Input value={form.tutorNombre || ""} onChange={(e) => setForm((v) => ({ ...v, tutorNombre: e.target.value }))} /></Field>
            <Field label="Teléfono"><Input value={form.tutorTelefono || ""} onChange={(e) => setForm((v) => ({ ...v, tutorTelefono: e.target.value }))} /></Field>
            <Field label="Foto para carnet" colSpan>
              <PhotoUploadField
                value={form.fotoUrl || ""}
                publicId={form.fotoPublicId || ""}
                folder="cedi/actividades"
                onChange={({ fotoUrl, fotoPublicId }) => setForm((v) => ({ ...v, fotoUrl, fotoPublicId }))}
              />
            </Field>
            <Field label="Autorización imagen">
              <Select value={form.autorizacionImagen ? "si" : "no"} onValueChange={(value) => setForm((v) => ({ ...v, autorizacionImagen: value === "si" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Fecha de alta"><Input type="date" value={form.fechaAlta || ""} onChange={(e) => setForm((v) => ({ ...v, fechaAlta: e.target.value }))} /></Field>
            <div className="md:col-span-2">
              <Field label="Observaciones"><Textarea value={form.observaciones || ""} onChange={(e) => setForm((v) => ({ ...v, observaciones: e.target.value }))} /></Field>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving || !form.nombre || !form.apellido || !form.actividadId} className="w-full bg-blue-700 hover:bg-blue-800 sm:w-auto">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RegistrarPagoActividadDialog
        open={pagoOpen}
        onOpenChange={setPagoOpen}
        alumno={alumno}
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

function Field({ label, children, colSpan = false }) {
  return (
    <div className={`min-w-0 space-y-2 ${colSpan ? "md:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <h3 className="mb-4 break-words text-base font-semibold text-slate-900">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Row({ k, v }) {
  return (
    <div className="grid min-w-0 gap-1 border-b border-slate-100 py-3 last:border-0 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-start sm:gap-4">
      <span className="min-w-0 text-xs font-semibold uppercase tracking-wider text-slate-500">{k}</span>
      <span className="min-w-0 break-words text-sm font-medium text-slate-900 sm:text-right [&_*]:break-words">{v}</span>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const cls =
    estado === "activo"
      ? "bg-emerald-100 text-emerald-800"
      : estado === "inactivo"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${cls}`}>{estado}</span>;
}


function sanitizeFileName(value) {
  return String(value || "carnet")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function waitForCarnetImages(node) {
  if (!node) return Promise.resolve();
  const images = Array.from(node.querySelectorAll("img"));
  return Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );
}

function loadCanvasImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawImageContain(ctx, img, x, y, w, h) {
  if (!img) return;
  const ratio = Math.min(w / img.width, h / img.height);
  const nw = img.width * ratio;
  const nh = img.height * ratio;
  ctx.drawImage(img, x + (w - nw) / 2, y + (h - nh) / 2, nw, nh);
}

function drawImageCover(ctx, img, x, y, w, h, r = 0) {
  if (!img) return;
  const ratio = Math.max(w / img.width, h / img.height);
  const nw = img.width * ratio;
  const nh = img.height * ratio;
  const sx = (w - nw) / 2;
  const sy = (h - nh) / 2;
  ctx.save();
  if (r) {
    roundedRect(ctx, x, y, w, h, r);
    ctx.clip();
  }
  ctx.drawImage(img, x + sx, y + sy, nw, nh);
  ctx.restore();
}

function drawTextFit(ctx, text, x, y, maxWidth, font, color, align = "left") {
  const value = String(text || "-");
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";

  let output = value;
  if (ctx.measureText(output).width > maxWidth) {
    while (output.length > 1 && ctx.measureText(`${output}…`).width > maxWidth) {
      output = output.slice(0, -1);
    }
    output = `${output}…`;
  }

  ctx.fillText(output, x, y);
  ctx.restore();
}

function drawLetterSpacedText(ctx, text, centerX, y, spacing, font, color, maxWidth) {
  const value = String(text || "").toUpperCase();
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";

  let total = 0;
  for (let i = 0; i < value.length; i += 1) {
    total += ctx.measureText(value[i]).width;
    if (i < value.length - 1) total += spacing;
  }

  if (total > maxWidth) {
    ctx.textAlign = "center";
    ctx.fillText(value, centerX, y, maxWidth);
    ctx.restore();
    return;
  }

  let x = centerX - total / 2;
  for (let i = 0; i < value.length; i += 1) {
    ctx.fillText(value[i], x, y);
    x += ctx.measureText(value[i]).width + spacing;
  }
  ctx.restore();
}

async function createCarnetPngCanvas({
  tipo,
  nombreClub,
  titulo,
  etiquetaPersona,
  nombre,
  apellido,
  fotoUrl,
  mostrarFoto,
  detalles,
  estado,
  fechaEmision,
  qrCanvas,
}) {
  const W = 560;
  const H = 353;
  const SCALE = 3;
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  const isActividad = tipo === "actividad";
  const colors = isActividad
    ? ["#064e3b", "#166534", "#365314"]
    : ["#172554", "#1e3a8a", "#0f172a"];
  const labelColor = isActividad ? "#d1fae5" : "#dbeafe";

  roundedRect(ctx, 0, 0, W, H, 28);
  ctx.clip();

  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.55, colors[1]);
  gradient.addColorStop(1, colors[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.arc(W - 60, -15, 110, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.035)";
  ctx.beginPath();
  ctx.arc(-35, H + 35, 145, 0, Math.PI * 2);
  ctx.fill();

  const logo = await loadCanvasImage("/logo-cedi.png");
  ctx.save();
  ctx.globalAlpha = 0.055;
  drawImageContain(ctx, logo, 150, 56, 260, 260);
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  roundedRect(ctx, 0.5, 0.5, W - 1, H - 1, 28);
  ctx.stroke();

  drawImageContain(ctx, logo, 20, 20, 110, 110);

const photo = mostrarFoto ? await loadCanvasImage(fotoUrl) : null;

ctx.save();
roundedRect(ctx, 416, 18, 124, 124, 18);
ctx.fillStyle = "#f8fafc";
ctx.fill();
ctx.restore();

if (photo) {
  drawImageCover(ctx, photo, 418, 20, 120, 120, 16);
} else {
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Sin foto", 478, 80);
}

  drawLetterSpacedText(
    ctx,
    nombreClub || "CEDI LOS 15",
    280,
    56,
    5,
    "700 17px Arial, Helvetica, sans-serif",
    "rgba(255,255,255,0.72)",
    310
  );

  drawTextFit(
    ctx,
    titulo,
    280,
    92,
    310,
    "900 25px Arial, Helvetica, sans-serif",
    "#ffffff",
    "center"
  );

  roundedRect(ctx, 22, 198, 390, 130, 18);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = labelColor;
  ctx.font = "700 10px Arial, Helvetica, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  drawLetterSpacedText(ctx, etiquetaPersona, 70, 211, 3.4, "700 10px Arial, Helvetica, sans-serif", labelColor, 120);

  drawTextFit(
    ctx,
    `${nombre || ""} ${apellido || ""}`.trim(),
    38,
    239,
    345,
    "900 20px Arial, Helvetica, sans-serif",
    "#ffffff",
    "left"
  );

  const allDetails = [
    ...(detalles || []),
    { label: "Estado", value: estado },
    { label: "Emisión", value: fechaEmision },
  ].slice(0, 4);

  const positions = [
    [38, 269],
    [216, 269],
    [38, 303],
    [216, 303],
  ];

  allDetails.forEach((d, index) => {
    const [x, y] = positions[index];
    drawTextFit(ctx, d.label, x, y, 150, "700 8px Arial, Helvetica, sans-serif", "rgba(255,255,255,0.58)", "left");
    drawTextFit(ctx, d.value, x, y + 17, 150, "800 12px Arial, Helvetica, sans-serif", "#ffffff", "left");
  });

  roundedRect(ctx, 436, 224, 104, 104, 16);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  if (qrCanvas) {
   ctx.drawImage(qrCanvas, 442, 230, 92, 92);
  }

  return canvas;
}
