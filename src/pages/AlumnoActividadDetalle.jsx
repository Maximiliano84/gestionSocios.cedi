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
  const [pagoForm, setPagoForm] = useState({ mes: currentYm(), monto: "", fechaPago: today(), metodo: "efectivo", observacion: "" });
  const carnetRef = useRef(null);
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
      setFeedback({ variant: "error", title: "No se pudo cargar", description: formatApiError(e?.response?.data?.detail) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" />Cargando ficha del alumno...</div>;
  if (!alumno || !cfg) return <div className="text-slate-500">Alumno no encontrado.</div>;

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
      setFeedback({ title: "Alumno actualizado", description: "Los datos del alumno fueron actualizados correctamente." });
      setEditOpen(false);
      load();
    } catch (e) {
      setFeedback({ variant: "error", title: "No se pudo guardar", description: formatApiError(e?.response?.data?.detail) });
    } finally {
      setSaving(false);
    }
  };

  const openPago = () => {
    setPagoForm({ mes: currentYm(), monto: String(alumno.cuotaMensual || ""), fechaPago: today(), metodo: "efectivo", observacion: "" });
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
      setFeedback({ title: "Pago realizado con éxito", description: "El pago quedó registrado correctamente." });
      setPagoOpen(false);
      load();
    } catch (e) {
      setFeedback({ variant: "error", title: "No se pudo registrar", description: formatApiError(e?.response?.data?.detail) });
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
        setFeedback({ title: "Alumno dado de baja", description: "El alumno fue dado de baja correctamente." });
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
        setFeedback({ title: "Alumno eliminado", description: "El alumno fue eliminado definitivamente." });
        navigate("/actividades");
      },
    });
  };

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
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `carnet-alumno-${alumno.apellido}-${alumno.nombre}.png`;
    a.click();
  };

  const compartirLinkPago = () => {
    const txt = `Hola, te paso el link para abonar la cuota de ${alumno.actividadNombre} de ${alumno.nombre} ${alumno.apellido} (${cfg.nombreClub}):\n${cfg.linkPago || "(configurar link)"}\nAlias: ${cfg.aliasPago || "-"}\nGracias!`;
    const phone = (alumno.tutorTelefono || "").replace(/\D/g, "");
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(txt)}` : `https://wa.me/?text=${encodeURIComponent(txt)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link to="/actividades" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-2"><ArrowLeft className="w-4 h-4" /> Volver a actividades</Link>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>{alumno.nombre} {alumno.apellido}</h2>
          <p className="text-slate-500">Ficha de alumno de actividades · {alumno.actividadNombre}</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={openPago} className="bg-blue-700 hover:bg-blue-800"><CreditCard className="w-4 h-4 mr-2" />Registrar pago</Button>
            <Button variant="outline" onClick={openEdit}><Edit2 className="w-4 h-4 mr-2" />Editar</Button>
            {alumno.estado !== "baja" && <Button variant="outline" onClick={bajaAlumno} className="text-amber-700 border-amber-200 hover:bg-amber-50">Dar de baja</Button>}
            {canDeletePermanente && alumno.estado === "baja" && <Button variant="outline" onClick={eliminarDefinitivo} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="w-4 h-4 mr-2" />Eliminar</Button>}
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_560px] lg:grid-cols-[minmax(0,1fr)_500px]">
        <div className="space-y-6">
          <Section title="Datos del alumno">
            <Row k="Estado" v={<EstadoBadge estado={alumno.estado} />} />
            <Row k="Actividad" v={`${alumno.actividadNombre} · ${alumno.profesor}`} />
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
            <Row k="Cuota" v={alumno.estadoCuota === "al_dia" ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-4 h-4" />Al día</span> : <span className="inline-flex flex-col items-start gap-1"><span className="inline-flex items-center gap-1 text-red-700"><AlertTriangle className="w-4 h-4" />Con deuda</span>{alumno.cuotaVencida && <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{alumno.cuotaVencidaTexto || "Cuota vencida"}</span>}</span>} />
            <Row k="Meses adeudados" v={alumno.mesesAdeudados?.length ? alumno.mesesAdeudados.map(formatMesYM).join(", ") : "Sin deuda"} />
            <Row k="Deuda total" v={formatMoney(alumno.deudaTotal || 0)} />
          </Section>

          <Section title="Historial de pagos">
            {!alumno.pagos?.length ? <p className="text-sm text-slate-500">Sin pagos registrados.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
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
                        <td className="px-4 py-2">{formatDate(p.fechaPago)}</td>
                        <td className="px-4 py-2">{(p.meses || []).map(formatMesYM).join(", ")}</td>
                        <td className="px-4 py-2 font-semibold">{formatMoney(p.monto)}</td>
                        <td className="px-4 py-2 capitalize">{p.metodo === "mercadopago" ? "Mercado Pago" : p.metodo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-4 w-full lg:justify-self-end">
          <div className="w-full max-w-[560px] lg:max-w-none xl:w-[560px]">
            <h3 className="mb-4 text-sm uppercase tracking-wider font-semibold text-slate-500">Carnet de alumno</h3>
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
          <CarnetActions
            linkPago={cfg.linkPago}
            onDownloadImage={downloadCarnetPNG}
            onSendPaymentLink={compartirLinkPago}
            publicUrl={carnetUrl}
          />
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar alumno</DialogTitle>
            <DialogDescription>Este alumno pertenece solo al módulo de actividades.</DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Nombre"><Input value={form.nombre || ""} onChange={(e) => setForm((v) => ({ ...v, nombre: e.target.value }))} /></Field>
            <Field label="Apellido"><Input value={form.apellido || ""} onChange={(e) => setForm((v) => ({ ...v, apellido: e.target.value }))} /></Field>
            <Field label="Actividad"><Select value={form.actividadId || ""} onValueChange={(value) => setForm((v) => ({ ...v, actividadId: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{actividades.map((a) => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Estado"><Select value={form.estado || "activo"} onValueChange={(value) => setForm((v) => ({ ...v, estado: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="activo">Activo</SelectItem><SelectItem value="inactivo">Inactivo</SelectItem><SelectItem value="baja">Baja</SelectItem></SelectContent></Select></Field>
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
            <Field label="Autorización imagen"><Select value={form.autorizacionImagen ? "si" : "no"} onValueChange={(value) => setForm((v) => ({ ...v, autorizacionImagen: value === "si" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="si">Sí</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select></Field>
            <Field label="Fecha de alta"><Input type="date" value={form.fechaAlta || ""} onChange={(e) => setForm((v) => ({ ...v, fechaAlta: e.target.value }))} /></Field>
            <div className="md:col-span-2"><Field label="Observaciones"><Textarea value={form.observaciones || ""} onChange={(e) => setForm((v) => ({ ...v, observaciones: e.target.value }))} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving || !form.nombre || !form.apellido || !form.actividadId} className="bg-blue-700 hover:bg-blue-800">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RegistrarPagoActividadDialog
        open={pagoOpen}
        onOpenChange={setPagoOpen}
        alumno={alumno}
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

function Field({ label, children }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function Section({ title, children }) {
  return <div className="bg-white border border-slate-200 rounded-lg p-5"><h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3><div className="space-y-2">{children}</div></div>;
}

function Row({ k, v }) {
  return <div className="flex items-start justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0"><span className="text-xs uppercase tracking-wider text-slate-500 font-semibold pt-0.5">{k}</span><span className="text-sm text-slate-900 text-right">{v}</span></div>;
}

function EstadoBadge({ estado }) {
  const cls = estado === "activo" ? "bg-emerald-100 text-emerald-800" : estado === "inactivo" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${cls}`}>{estado}</span>;
}
