import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, AlertCircle, CreditCard, Eye, Loader2, Pencil, Search, Trash2, UserPlus, Users, UserX } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAuth, hasRole } from "@/context/AuthContext";
import { formatMoney, formatMesYM } from "@/utils/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ActionMenu from "@/components/ActionMenu";
import RegistrarPagoActividadDialog from "@/components/RegistrarPagoActividadDialog";
import { ConfirmActionDialog, FeedbackDialog } from "@/components/ConfirmActionDialog";
import PhotoUploadField from "@/components/PhotoUploadField";

const emptyAlumno = {
  nombre: "",
  apellido: "",
  dni: "",
  fechaNacimiento: "",
  direccion: "",
  obraSocial: "",
  actividadId: "",
  tutorNombre: "",
  tutorTelefono: "",
  fotoUrl: "",
  fotoPublicId: "",
  autorizacionImagen: false,
  fechaAlta: new Date().toISOString().slice(0, 10),
  estado: "activo",
  observaciones: "",
};

const currentYm = () => new Date().toISOString().slice(0, 7);

function capitalizeWords(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/(^|[\s'’.-])([a-záéíóúüñ])/g, (match, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

export default function Actividades() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = hasRole(user, "admin", "secretaria");

  const [actividades, setActividades] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [actividadId, setActividadId] = useState("todas");
  const [estadoPago, setEstadoPago] = useState("todos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


  const [alumnoOpen, setAlumnoOpen] = useState(false);
  const [alumnoEditId, setAlumnoEditId] = useState(null);
  const [alumnoForm, setAlumnoForm] = useState(emptyAlumno);

  const [pagoOpen, setPagoOpen] = useState(false);
  const [pagoAlumno, setPagoAlumno] = useState(null);
  const [pagoForm, setPagoForm] = useState({ mes: currentYm(), monto: "", fechaPago: new Date().toISOString().slice(0, 10), metodo: "efectivo", observacion: "" });
  const [confirmAction, setConfirmAction] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [actsRes, alumnosRes, pagosRes] = await Promise.all([
        api.get("/actividades"),
        api.get("/actividades/alumnos"),
        api.get("/actividades/pagos"),
      ]);
      setActividades(actsRes.data || []);
      setAlumnos(alumnosRes.data || []);
      setPagos(pagosRes.data || []);
    } catch (e) {
      setFeedback({ variant: "error", title: "No se pudo cargar", description: formatApiError(e?.response?.data?.detail) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const actividadSeleccionada = useMemo(
    () => actividades.find((a) => a.id === actividadId),
    [actividades, actividadId]
  );

  const alumnosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return alumnos
      .filter((a) => actividadId === "todas" || a.actividadId === actividadId)
      .filter((a) => actividadId === "todas" || estadoPago === "todos" || a.estadoCuota === estadoPago)
      .filter((a) => {
        if (!q) return true;
        const text = `${a.nombre} ${a.apellido} ${a.tutorNombre} ${a.tutorTelefono} ${a.actividadNombre}`
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return text.includes(q);
      })
      .sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));
  }, [alumnos, actividadId, estadoPago, search]);

  const resumen = useMemo(() => {
    const activos = alumnosFiltrados.filter((a) => a.estado === "activo");
    const deudores = activos.filter((a) => a.estadoCuota === "con_deuda");
    const deudaTotal = deudores.reduce((acc, a) => acc + Number(a.deudaTotal || 0), 0);
    const pagosMes = pagos
      .filter((p) => actividadId === "todas" || p.actividadId === actividadId)
      .filter((p) => (p.fechaPago || "").startsWith(currentYm()));
    const recaudacion = pagosMes.reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const efectivo = pagosMes.filter((p) => p.metodo === "efectivo").reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const mercadoPago = pagosMes.filter((p) => p.metodo === "mercadopago").reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const otros = pagosMes.filter((p) => !["efectivo", "mercadopago"].includes(p.metodo)).reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const paraActividad = recaudacion * 0.7;
    const paraClub = recaudacion * 0.3;
    return { activos: activos.length, deudores: deudores.length, deudaTotal, recaudacion, efectivo, mercadoPago, otros, paraActividad, paraClub };
  }, [alumnosFiltrados, pagos, actividadId]);

  const resumenProfesores = useMemo(() => {
    const actividadesBase = actividades
      .filter((a) => actividadId === "todas" || a.id === actividadId);

    const map = new Map(
      actividadesBase.map((a) => [
        a.id,
        {
          actividadId: a.id,
          actividad: a.nombre || "Sin actividad",
          profesor: a.profesor || "A definir",
          recaudado: 0,
          efectivo: 0,
          mercadoPago: 0,
        },
      ])
    );

    pagos
      .filter((p) => actividadId === "todas" || p.actividadId === actividadId)
      .filter((p) => (p.fechaPago || "").startsWith(currentYm()))
      .forEach((p) => {
        const key = p.actividadId || `sin_actividad_${p.actividadNombre || p.profesor || ""}`;
        const row = map.get(key) || {
          actividadId: p.actividadId || key,
          actividad: p.actividadNombre || "Sin actividad",
          profesor: p.profesor || "A definir",
          recaudado: 0,
          efectivo: 0,
          mercadoPago: 0,
        };
        const monto = Number(p.monto || 0);
        row.recaudado += monto;
        if (p.metodo === "efectivo") row.efectivo += monto;
        if (p.metodo === "mercadopago") row.mercadoPago += monto;
        map.set(key, row);
      });

    return Array.from(map.values())
      .map((r) => ({ ...r, paraActividad: r.recaudado * 0.7, paraClub: r.recaudado * 0.3 }))
      .sort((a, b) => {
        if (b.recaudado !== a.recaudado) return b.recaudado - a.recaudado;
        return String(a.actividad).localeCompare(String(b.actividad));
      });
  }, [actividades, pagos, actividadId]);

  const handleActividadFilterChange = (value) => {
    setActividadId(value);
    if (value === "todas") setEstadoPago("todos");
  };

  const openNewAlumno = () => {
    setAlumnoEditId(null);
    setAlumnoForm({ ...emptyAlumno, actividadId: actividadSeleccionada?.id || actividades[0]?.id || "" });
    setAlumnoOpen(true);
  };

  const openEditAlumno = (alumno) => {
    setAlumnoEditId(alumno.id);
    setAlumnoForm({
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
      fechaAlta: alumno.fechaAlta || new Date().toISOString().slice(0, 10),
      estado: alumno.estado || "activo",
      observaciones: alumno.observaciones || "",
    });
    setAlumnoOpen(true);
  };

  const saveAlumno = async () => {
    setSaving(true);
    try {
      if (alumnoEditId) await api.put(`/actividades/alumnos/${alumnoEditId}`, alumnoForm);
      else await api.post("/actividades/alumnos", alumnoForm);
      setFeedback({ title: alumnoEditId ? "Alumno actualizado" : "Alumno agregado", description: alumnoEditId ? "Los datos del alumno fueron actualizados correctamente." : "El alumno fue agregado correctamente." });
      setAlumnoOpen(false);
      load();
    } catch (e) {
      setFeedback({ variant: "error", title: "No se pudo guardar", description: formatApiError(e?.response?.data?.detail) });
    } finally {
      setSaving(false);
    }
  };

  const bajaAlumno = (alumno) => {
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

  const eliminarAlumno = (alumno) => {
    setConfirmAction({
      title: "Eliminar alumno definitivamente",
      description: `¿Querés eliminar definitivamente a ${alumno.nombre} ${alumno.apellido}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      variant: "danger",
      run: async () => {
        await api.delete(`/actividades/alumnos/${alumno.id}/permanente`);
        setFeedback({ title: "Alumno eliminado", description: "El alumno fue eliminado definitivamente." });
        load();
      },
    });
  };

  const openPago = (alumno) => {
    setPagoAlumno(alumno);
    setPagoForm({
      mes: currentYm(),
      monto: String(alumno.cuotaMensual || ""),
      fechaPago: new Date().toISOString().slice(0, 10),
      metodo: "efectivo",
      observacion: "",
    });
    setPagoOpen(true);
  };


  const handleAlumnoAction = (value, alumno) => {
    if (!value) return;
    if (value === "ficha") navigate(`/actividades/alumnos/${alumno.id}`);
    if (value === "pago") openPago(alumno);
    if (value === "editar") openEditAlumno(alumno);
    if (value === "baja") bajaAlumno(alumno);
    if (value === "eliminar") eliminarAlumno(alumno);
  };

  const savePago = async () => {
    if (!pagoAlumno) return;
    setSaving(true);
    try {
      await api.post("/actividades/pagos", {
        alumnoId: pagoAlumno.id,
        actividadId: pagoAlumno.actividadId,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm mb-1">
            <Activity className="w-4 h-4" /> Módulo independiente
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>Actividades</h2>
          <p className="text-slate-500 mt-1">
            Gestión separada de alumnos, cuotas y pagos de Patín, Taekwondo, Telas, Zumba y otras actividades. No se mezcla con socios de fútbol.
          </p>
        </div>
        {canManage && (
          <Button onClick={openNewAlumno} className="bg-blue-700 hover:bg-blue-800">
            <UserPlus className="w-4 h-4 mr-2" /> Agregar alumno
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Users} label="Alumnos activos" value={resumen.activos} tone="blue" />
        <StatCard icon={AlertCircle} label="Con deuda" value={resumen.deudores} tone="amber" />
        <StatCard icon={CreditCard} label="Deuda total" value={formatMoney(resumen.deudaTotal)} tone="red" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Recaudación del mes</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{formatMoney(resumen.recaudacion)}</p>
              <p className="mt-1 text-xs text-slate-500">Según fecha de pago registrada durante el mes actual.</p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-600 p-4 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-50">Transferencia / Mercado Pago</p>
              <p className="mt-2 text-2xl font-bold">{formatMoney(resumen.mercadoPago)}</p>
            </div>
            <div className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Efectivo</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{formatMoney(resumen.efectivo)}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Otros</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{formatMoney(resumen.otros)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-700">Distribución del mes</p>
              <p className="mt-1 text-xs text-slate-500">Sobre el total recaudado del mes.</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 text-blue-700">
              <Activity className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl bg-blue-700 p-4 text-white shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">70% actividad / profesor/a</p>
                  <p className="mt-2 text-2xl font-bold">{formatMoney(resumen.paraActividad)}</p>
                </div>
                <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">70%</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">30% club</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">{formatMoney(resumen.paraClub)}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">30%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">Distribución por actividad</p>
            <p className="text-sm text-slate-500">Resumen mensual claro: primero lo recaudado, después cuánto corresponde a la actividad y cuánto queda para el club.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">70% actividad</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">30% club</span>
          </div>
        </div>

        {resumenProfesores.length === 0 ? (
          <p className="text-sm text-slate-400 mt-3">Todavía no hay actividades configuradas.</p>
        ) : (
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
            <div className="hidden bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-4">
              <span>Actividad / profesor</span>
              <span className="text-right">Recaudado</span>
              <span className="text-right">70% actividad</span>
              <span className="text-right">30% club</span>
            </div>

            <div className="divide-y divide-slate-100">
              {resumenProfesores.map((r) => {
                const porcentaje = resumen.recaudacion > 0 ? Math.min(100, Math.round((r.recaudado / resumen.recaudacion) * 100)) : 0;
                return (
                  <div key={r.actividadId || `${r.actividad}-${r.profesor}`} className="bg-white px-4 py-4">
                    <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:items-center md:gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          <p className="truncate font-semibold text-slate-950">{r.actividad}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Prof. {r.profesor}</p>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 md:block md:bg-transparent md:px-0 md:py-0 md:text-right">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:hidden">Recaudado</span>
                        <span className="font-bold text-slate-950">{formatMoney(r.recaudado)}</span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 md:block md:bg-transparent md:px-0 md:py-0 md:text-right">
                        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 md:hidden">70% actividad</span>
                        <span className="font-bold text-emerald-700">{formatMoney(r.paraActividad)}</span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 md:block md:bg-transparent md:px-0 md:py-0 md:text-right">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:hidden">30% club</span>
                        <span className="font-bold text-slate-700">{formatMoney(r.paraClub)}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${porcentaje}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs font-semibold text-slate-500">{porcentaje}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 md:p-6 space-y-4">
        <div className="grid md:grid-cols-[260px_220px_1fr] gap-4">
          <div className="space-y-2">
            <Label>Actividad</Label>
            <Select value={actividadId} onValueChange={handleActividadFilterChange}>
              <SelectTrigger><SelectValue placeholder="Elegir actividad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las actividades</SelectItem>
                {actividades.map((a) => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            {actividadSeleccionada && <p className="text-xs text-slate-500">{actividadSeleccionada.profesor || "A definir"} · {formatMoney(actividadSeleccionada.cuotaMensual || 0)} mensuales</p>}
          </div>
          <div className="space-y-2">
            <Label>Estado de pago</Label>
            <Select value={estadoPago} onValueChange={setEstadoPago} disabled={actividadId === "todas"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="al_dia">Al día</SelectItem>
                <SelectItem value="con_deuda">Con deuda</SelectItem>
              </SelectContent>
            </Select>
            {actividadId === "todas" && <p className="text-xs text-slate-500">Elegí una actividad para filtrar por pago.</p>}
          </div>
          <div className="space-y-2">
            <Label>Buscar alumno</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, apellido, tutor, teléfono..." className="pl-9" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Alumnos de actividades</h3>
            <p className="text-sm text-slate-500">{actividadId === "todas" ? "Todas las actividades" : actividadSeleccionada?.nombre} · {alumnosFiltrados.length} resultado(s)</p>
          </div>
          {canManage && <Button size="icon" onClick={openNewAlumno} title="Agregar alumno" aria-label="Agregar alumno" className="bg-blue-700 text-white hover:bg-blue-800"><UserPlus className="w-4 h-4" /></Button>}
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500"><Loader2 className="w-4 h-4 inline animate-spin mr-2" />Cargando actividades...</div>
        ) : alumnosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay alumnos para esta búsqueda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Alumno</th>
                  <th className="px-4 py-3 text-left font-semibold">Actividad</th>
                  <th className="px-4 py-3 text-left font-semibold">Madre, padre o tutor</th>
                  <th className="px-4 py-3 text-left font-semibold">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold">Cuota</th>
                  <th className="px-4 py-3 text-left font-semibold">Deuda</th>
                  <th className="px-4 py-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alumnosFiltrados.map((a) => (
                  <tr key={a.id} className="cursor-pointer" onClick={() => navigate(`/actividades/alumnos/${a.id}`)}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-blue-700">{a.apellido}, {a.nombre}</div>
                      <div className="text-xs text-slate-500">Alta: {a.fechaAlta}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{a.actividadNombre}</div>
                      <div className="text-xs text-slate-500">{a.profesor} · {formatMoney(a.cuotaMensual)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{a.tutorNombre || "-"}</div>
                      <div className="text-xs text-slate-500">{a.tutorTelefono || "Sin teléfono"}</div>
                    </td>
                    <td className="px-4 py-3"><EstadoBadge estado={a.estado} /></td>
                    <td className="px-4 py-3"><CuotaBadge estado={a.estadoCuota} vencida={a.cuotaVencida} textoVencida={a.cuotaVencidaTexto} /></td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900 font-medium">{formatMoney(a.deudaTotal || 0)}</div>
                      {a.mesesAdeudados?.length > 0 && <div className="text-xs text-slate-500">{a.mesesAdeudados.map(formatMesYM).join(", ")}</div>}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        testId={`actions-alumno-${a.id}`}
                        options={[
                          { label: "Ver ficha", icon: Eye, color: "info", onClick: () => handleAlumnoAction("ficha", a) },
                          canManage && { label: "Registrar pago", icon: CreditCard, color: "payment", onClick: () => handleAlumnoAction("pago", a) },
                          canManage && { label: "Editar", icon: Pencil, color: "default", onClick: () => handleAlumnoAction("editar", a) },
                          canManage && a.estado !== "baja" && { label: "Dar de baja", icon: UserX, color: "warning", onClick: () => handleAlumnoAction("baja", a) },
                          hasRole(user, "admin") && a.estado === "baja" && { label: "Eliminar definitivo", icon: Trash2, color: "danger", onClick: () => handleAlumnoAction("eliminar", a) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={alumnoOpen} onOpenChange={setAlumnoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{alumnoEditId ? "Editar alumno" : "Agregar alumno"}</DialogTitle>
            <DialogDescription>Alumno exclusivo del módulo de actividades. No se carga como socio del fútbol.</DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Nombre"><Input value={alumnoForm.nombre} onChange={(e) => setAlumnoForm((v) => ({ ...v, nombre: capitalizeWords(e.target.value) }))} /></Field>
            <Field label="Apellido"><Input value={alumnoForm.apellido} onChange={(e) => setAlumnoForm((v) => ({ ...v, apellido: capitalizeWords(e.target.value) }))} /></Field>
            <Field label="Actividad">
              <Select value={alumnoForm.actividadId} onValueChange={(value) => setAlumnoForm((v) => ({ ...v, actividadId: value }))}>
                <SelectTrigger><SelectValue placeholder="Elegir actividad" /></SelectTrigger>
                <SelectContent>{actividades.map((a) => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Estado">
              <Select value={alumnoForm.estado} onValueChange={(value) => setAlumnoForm((v) => ({ ...v, estado: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="activo">Activo</SelectItem><SelectItem value="inactivo">Inactivo</SelectItem><SelectItem value="baja">Baja</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="DNI"><Input value={alumnoForm.dni} onChange={(e) => setAlumnoForm((v) => ({ ...v, dni: e.target.value }))} /></Field>
            <Field label="Fecha de nacimiento"><Input type="date" value={alumnoForm.fechaNacimiento} onChange={(e) => setAlumnoForm((v) => ({ ...v, fechaNacimiento: e.target.value }))} /></Field>
            <Field label="Dirección"><Input value={alumnoForm.direccion} onChange={(e) => setAlumnoForm((v) => ({ ...v, direccion: e.target.value }))} /></Field>
            <Field label="Obra social"><Input value={alumnoForm.obraSocial} onChange={(e) => setAlumnoForm((v) => ({ ...v, obraSocial: e.target.value }))} /></Field>
            <Field label="Madre, padre o tutor"><Input value={alumnoForm.tutorNombre} onChange={(e) => setAlumnoForm((v) => ({ ...v, tutorNombre: capitalizeWords(e.target.value) }))} /></Field>
            <Field label="Teléfono"><Input value={alumnoForm.tutorTelefono} onChange={(e) => setAlumnoForm((v) => ({ ...v, tutorTelefono: e.target.value }))} /></Field>
            <Field label="Foto para carnet" colSpan>
              <PhotoUploadField
                value={alumnoForm.fotoUrl || ""}
                publicId={alumnoForm.fotoPublicId || ""}
                folder="cedi/actividades"
                onChange={({ fotoUrl, fotoPublicId }) => setAlumnoForm((v) => ({ ...v, fotoUrl, fotoPublicId }))}
              />
            </Field>
            <Field label="Autorización imagen">
              <Select value={alumnoForm.autorizacionImagen ? "si" : "no"} onValueChange={(value) => setAlumnoForm((v) => ({ ...v, autorizacionImagen: value === "si" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="si">Sí</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Fecha de alta"><Input type="date" value={alumnoForm.fechaAlta} onChange={(e) => setAlumnoForm((v) => ({ ...v, fechaAlta: e.target.value }))} /></Field>
            <div className="md:col-span-2"><Field label="Observaciones"><Textarea value={alumnoForm.observaciones} onChange={(e) => setAlumnoForm((v) => ({ ...v, observaciones: e.target.value }))} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlumnoOpen(false)}>Cancelar</Button>
            <Button onClick={saveAlumno} disabled={saving || !alumnoForm.nombre.trim() || !alumnoForm.apellido.trim() || !alumnoForm.actividadId} className="bg-blue-700 hover:bg-blue-800">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RegistrarPagoActividadDialog
        open={pagoOpen}
        onOpenChange={setPagoOpen}
        alumno={pagoAlumno}
        onSaved={() => { setPagoOpen(false); setPagoAlumno(null); load(); }}
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

function StatCard({ icon: Icon, label, value, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    red: "bg-red-50 text-red-700 border-red-100",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-full border ${tones[tone] || tones.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const cls = estado === "activo" ? "bg-emerald-50 text-emerald-700" : estado === "inactivo" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{estado}</span>;
}

function CuotaBadge({ estado, vencida = false, textoVencida = "" }) {
  const alDia = estado === "al_dia";
  if (alDia) {
    return <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">Al día</span>;
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700">Con deuda</span>
      {vencida && (
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          {textoVencida || "Cuota vencida"}
        </span>
      )}
    </div>
  );
}
