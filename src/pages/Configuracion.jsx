import { useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Trash2,
  Plus,
  Copy,
  Download,
  FileText,
  ShieldCheck,
  Activity,
  Check,
  Pencil,
  X,
  Settings,
  CreditCard,
  Users,
  Tags,
  MessageCircle,
  Save,
  Phone,
  Image,
  Link as LinkIcon,
  DollarSign,
  UserCog,
  FileDown,
} from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadCsv } from "@/utils/exportCsv";
import ActionMenu from "@/components/ActionMenu";
import { ConfirmActionDialog, FeedbackDialog } from "@/components/ConfirmActionDialog";
import { formatMoney } from "@/utils/format";

function Card({ icon: Icon, title, description, children, accent = "blue", className = "" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
  };
  const top = {
    blue: "before:bg-blue-600",
    emerald: "before:bg-emerald-600",
    amber: "before:bg-amber-500",
    slate: "before:bg-slate-600",
  };
  return (
    <section className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 ${top[accent] || top.blue} ${className}`}>
      <div className="mb-5 flex items-start gap-3 pt-1">
        {Icon && (
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${colors[accent] || colors.blue}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-slate-950">{title}</h3>
          {description && <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function Configuracion() {
  const [cfg, setCfg] = useState(null);
  const [users, setUsers] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savingActividad, setSavingActividad] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [newActividad, setNewActividad] = useState({ nombre: "", profesor: "", cuotaMensual: "", diaVencimiento: "", recargoFueraTermino: "" });
  const [editActividadId, setEditActividadId] = useState(null);
  const [editActividad, setEditActividad] = useState({ nombre: "", profesor: "", cuotaMensual: "", diaVencimiento: "", recargoFueraTermino: "" });
  const [openUser, setOpenUser] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const load = async () => {
    const [c, u, a] = await Promise.all([api.get("/config"), api.get("/users"), api.get("/actividades")]);
    setCfg(c.data);
    setUsers(u.data);
    setActividades(a.data || []);
  };

  useEffect(() => { load(); }, []);

  const aplicarReglaHockey = (actividad) => {
    const esHockey = String(actividad.nombre || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === "hockey";
    if (!esHockey) return actividad;
    return {
      ...actividad,
      diaVencimiento: actividad.diaVencimiento || "10",
      recargoFueraTermino: actividad.recargoFueraTermino || "3000",
    };
  };

  const safeRun = async (run, okTitle, okDescription) => {
    try {
      await run();
      if (okTitle) setFeedback({ title: okTitle, description: okDescription });
    } catch (e) {
      setFeedback({ variant: "error", title: "No se pudo completar", description: formatApiError(e?.response?.data?.detail) });
    }
  };

  const request = ({ title, description, confirmText = "Confirmar", variant = "default", run, okTitle, okDescription }) => {
    setConfirmAction({ title, description, confirmText, variant, run, okTitle, okDescription });
  };

  const save = () => {
    request({
      title: "Guardar configuración",
      description: "¿Querés guardar los cambios generales del club, pagos, categorías y mensajes?",
      confirmText: "Guardar",
      run: async () => {
        setSaving(true);
        try { await api.put("/config", cfg); }
        finally { setSaving(false); }
      },
      okTitle: "Configuración guardada",
      okDescription: "Los cambios quedaron aplicados correctamente.",
    });
  };

  const removeCat = (categoria) => {
    request({
      title: "Quitar categoría",
      description: `¿Querés quitar la categoría ${categoria}? No elimina socios ya cargados, solo la saca de la configuración.`,
      confirmText: "Quitar",
      variant: "danger",
      run: async () => setCfg((p) => ({ ...p, categorias: p.categorias.filter((x) => x !== categoria) })),
      okTitle: "Categoría quitada",
      okDescription: "Recordá guardar cambios para conservar esta configuración.",
    });
  };

  const addCat = () => {
    const value = newCat.trim();
    if (!value) return;
    request({
      title: "Agregar categoría",
      description: `¿Querés agregar la categoría ${value}?`,
      confirmText: "Agregar",
      run: async () => {
        setCfg((p) => ({ ...p, categorias: Array.from(new Set([...p.categorias, value])).sort() }));
        setNewCat("");
      },
      okTitle: "Categoría agregada",
      okDescription: "Recordá guardar cambios para conservar esta configuración.",
    });
  };

  const addActividad = () => {
    if (!newActividad.nombre.trim()) return;
    request({
      title: "Agregar actividad",
      description: `¿Querés agregar ${newActividad.nombre.trim()} con cuota ${formatMoney(Number(newActividad.cuotaMensual || 0))}?`,
      confirmText: "Agregar",
      run: async () => {
        setSavingActividad(true);
        try {
          await api.post("/actividades", {
            nombre: newActividad.nombre.trim(),
            profesor: newActividad.profesor?.trim() || "A definir",
            cuotaMensual: Number(newActividad.cuotaMensual || 0),
            diaVencimiento: newActividad.diaVencimiento ? Number(newActividad.diaVencimiento) : null,
            recargoFueraTermino: Number(newActividad.recargoFueraTermino || 0),
          });
          setNewActividad({ nombre: "", profesor: "", cuotaMensual: "", diaVencimiento: "", recargoFueraTermino: "" });
          await load();
        } finally { setSavingActividad(false); }
      },
      okTitle: "Actividad agregada",
      okDescription: "La actividad quedó disponible para cargar alumnos y pagos.",
    });
  };

  const startEditActividad = (actividad) => {
    setEditActividadId(actividad.id);
    setEditActividad({
      nombre: actividad.nombre || "",
      profesor: actividad.profesor || "",
      cuotaMensual: String(actividad.cuotaMensual || ""),
      diaVencimiento: actividad.diaVencimiento ? String(actividad.diaVencimiento) : "",
      recargoFueraTermino: actividad.recargoFueraTermino ? String(actividad.recargoFueraTermino) : "",
    });
  };

  const cancelEditActividad = () => {
    setEditActividadId(null);
    setEditActividad({ nombre: "", profesor: "", cuotaMensual: "", diaVencimiento: "", recargoFueraTermino: "" });
  };

  const saveActividad = (id) => {
    if (!editActividad.nombre.trim()) return;
    request({
      title: "Guardar actividad",
      description: `¿Querés guardar los cambios de ${editActividad.nombre.trim()}?`,
      confirmText: "Guardar",
      run: async () => {
        setSavingActividad(true);
        try {
          await api.put(`/actividades/${id}`, {
            nombre: editActividad.nombre.trim(),
            profesor: editActividad.profesor?.trim() || "A definir",
            cuotaMensual: Number(editActividad.cuotaMensual || 0),
            diaVencimiento: editActividad.diaVencimiento ? Number(editActividad.diaVencimiento) : null,
            recargoFueraTermino: Number(editActividad.recargoFueraTermino || 0),
          });
          cancelEditActividad();
          await load();
        } finally { setSavingActividad(false); }
      },
      okTitle: "Actividad actualizada",
      okDescription: "Los cambios quedaron guardados correctamente.",
    });
  };

  const removeActividad = (actividad) => {
    request({
      title: "Eliminar actividad",
      description: `¿Querés eliminar ${actividad.nombre}? También se quitarán sus alumnos y pagos de actividad.`,
      confirmText: "Eliminar",
      variant: "danger",
      run: async () => { await api.delete(`/actividades/${actividad.id}`); await load(); },
      okTitle: "Actividad eliminada",
      okDescription: "La actividad, sus alumnos y pagos asociados fueron eliminados.",
    });
  };

  const deleteUser = (user) => {
    request({
      title: "Eliminar usuario",
      description: `¿Querés eliminar el acceso de ${user.email}?`,
      confirmText: "Eliminar",
      variant: "danger",
      run: async () => { await api.delete(`/users/${user.id}`); await load(); },
      okTitle: "Usuario eliminado",
      okDescription: "El usuario ya no aparece en la lista de accesos.",
    });
  };

  const toggleUser = (user) => {
    const nextActive = user.activo === false;
    request({
      title: nextActive ? "Activar usuario" : "Desactivar usuario",
      description: nextActive
        ? `¿Querés volver a activar el acceso de ${user.email}?`
        : `¿Querés desactivar el acceso de ${user.email}? No se elimina de Firebase Auth, solo se bloquea en la app.`,
      confirmText: nextActive ? "Activar" : "Desactivar",
      variant: nextActive ? "default" : "warning",
      run: async () => { await api.put(`/users/${user.id}`, { ...user, activo: nextActive }); await load(); },
      okTitle: nextActive ? "Usuario activado" : "Usuario desactivado",
      okDescription: "El estado del perfil quedó actualizado.",
    });
  };

  const copy = (txt, label) => {
    request({
      title: `Copiar ${label}`,
      description: `¿Querés copiar ${label} al portapapeles?`,
      confirmText: "Copiar",
      run: async () => navigator.clipboard.writeText(txt || ""),
      okTitle: "Copiado",
      okDescription: `${label} fue copiado correctamente.`,
    });
  };

  const resumen = useMemo(() => ({
    actividades: actividades.length,
    usuarios: users.length,
    categorias: cfg?.categorias?.length || 0,
  }), [actividades.length, users.length, cfg?.categorias?.length]);

  const estadoConfiguracion = useMemo(() => ([
    { label: "Nombre del club", ok: !!cfg?.nombreClub?.trim() },
    { label: "Cuota fútbol", ok: Number(cfg?.cuotaMensual || 0) > 0 },
    { label: "Link de pago", ok: !!cfg?.linkPago?.trim() },
    { label: "Alias / CVU", ok: !!cfg?.aliasPago?.trim() },
    { label: "Mensaje WhatsApp", ok: !!cfg?.mensajeWhatsapp?.trim() },
    { label: "Categorías", ok: (cfg?.categorias || []).length > 0 },
    { label: "Actividades", ok: actividades.length > 0 },
    { label: "Usuarios", ok: users.length > 0 },
  ]), [cfg, actividades.length, users.length]);

  const mensajeEjemplo = useMemo(() => (cfg?.mensajeWhatsapp || "")
    .replaceAll("{nombre}", "Juan Pérez")
    .replaceAll("{meses}", "mayo y junio")
    .replaceAll("{link}", cfg?.linkPago || "link de pago"), [cfg?.mensajeWhatsapp, cfg?.linkPago]);

  if (!cfg) return <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" />Cargando...</div>;

  return (
    <div className="space-y-6 max-w-6xl" data-testid="config-page">
      <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 p-6 text-white shadow-sm">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-100">
              <Settings className="h-3.5 w-3.5" /> Panel administrativo
            </div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>Configuración</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-blue-100">Datos del club, valores de cuota, actividades, usuarios y reportes. Esta sección prepara la base para cuando conectemos Firebase.</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Categorías" value={resumen.categorias} />
              <MiniStat label="Actividades" value={resumen.actividades} />
              <MiniStat label="Usuarios" value={resumen.usuarios} />
            </div>
            <Button onClick={save} disabled={saving} className="bg-white text-blue-800 hover:bg-blue-50" data-testid="save-config-top">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" />Guardar cambios</>}
            </Button>
          </div>
        </div>
      </div>

      <Card icon={ShieldCheck} title="Estado de configuración" description="Chequeo rápido de los datos mínimos para que la app funcione bien." accent="slate">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {estadoConfiguracion.map((item) => (
            <div key={item.label} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${item.ok ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
              {item.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              {item.label}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card icon={Settings} title="Datos del club" description="Información general que se usa en carnets, mensajes y pantallas principales." accent="blue">
          <div className="grid gap-4 md:grid-cols-2">
            <Lbl k="Nombre del club"><Input value={cfg.nombreClub} onChange={(e) => setCfg({ ...cfg, nombreClub: e.target.value })} data-testid="config-nombre" /></Lbl>
            <Lbl k="Cuota mensual fútbol"><Input type="number" value={cfg.cuotaMensual} onChange={(e) => setCfg({ ...cfg, cuotaMensual: parseFloat(e.target.value || 0) })} data-testid="config-cuota" /></Lbl>
            <Lbl k="Teléfono de contacto"><Input value={cfg.telefonoContacto} onChange={(e) => setCfg({ ...cfg, telefonoContacto: e.target.value })} placeholder="Ej: 221..." /></Lbl>
            <Lbl k="URL logo"><Input value={cfg.logoUrl || ""} onChange={(e) => setCfg({ ...cfg, logoUrl: e.target.value })} placeholder="/logo-cedi.png o https://..." /></Lbl>
          </div>
          <div className="mt-4 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-900 sm:grid-cols-3">
            <QuickInfo icon={DollarSign} label="Cuota fútbol" value={formatMoney(cfg.cuotaMensual || 0)} />
            <QuickInfo icon={Phone} label="Contacto" value={cfg.telefonoContacto || "Sin cargar"} />
            <QuickInfo icon={Image} label="Logo" value={cfg.logoUrl ? "Cargado" : "Sin cargar"} />
          </div>
        </Card>

        <Card icon={CreditCard} title="Link y alias de pago" description="Se usa en carnets digitales y mensajes de WhatsApp." accent="emerald">
          <div className="grid gap-4">
            <Lbl k="Link de pago">
              <div className="flex gap-2">
                <Input value={cfg.linkPago} onChange={(e) => setCfg({ ...cfg, linkPago: e.target.value })} data-testid="config-link" />
                <Button variant="outline" size="icon" onClick={() => copy(cfg.linkPago, "link de pago")}><Copy className="w-4 h-4" /></Button>
              </div>
            </Lbl>
            <Lbl k="Alias / CVU">
              <div className="flex gap-2">
                <Input value={cfg.aliasPago} onChange={(e) => setCfg({ ...cfg, aliasPago: e.target.value })} data-testid="config-alias" />
                <Button variant="outline" size="icon" onClick={() => copy(cfg.aliasPago, "alias / CVU")}><Copy className="w-4 h-4" /></Button>
              </div>
            </Lbl>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-700">Vista rápida de pago</div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <QuickInfo icon={LinkIcon} label="Link" value={cfg.linkPago || "Sin cargar"} compact />
                <QuickInfo icon={CreditCard} label="Alias / CVU" value={cfg.aliasPago || "Sin cargar"} compact />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card icon={MessageCircle} title="Mensaje de WhatsApp" description="Plantilla para reclamos de deuda. Variables disponibles: {nombre}, {meses}, {link}." accent="amber">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Textarea rows={5} value={cfg.mensajeWhatsapp || ""} onChange={(e) => setCfg({ ...cfg, mensajeWhatsapp: e.target.value })} data-testid="config-msg" />
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-sm text-amber-950">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-700">Ejemplo de mensaje</div>
            <p className="whitespace-pre-line leading-6">{mensajeEjemplo || "Cargá una plantilla para ver un ejemplo."}</p>
          </div>
        </div>
      </Card>

      <Card icon={Tags} title="Categorías de fútbol" description="Se usan para filtrar socios, deudores y usuarios entrenadores." accent="blue">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-700">{cfg.categorias.length} categorías cargadas</div>
          <div className="text-xs text-slate-500">Fútbol se maneja por categoría, no como actividad.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {cfg.categorias.map((c) => (
            <div key={c} className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">
              {c}
              <button type="button" onClick={() => removeCat(c)} className="text-blue-500 focus:outline-none" aria-label={`Quitar ${c}`}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex max-w-xs gap-2">
          <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Ej: 2019" data-testid="config-new-cat" />
          <Button onClick={addCat} variant="outline"><Plus className="w-4 h-4" /></Button>
        </div>
      </Card>

      <Card icon={Activity} title="Configurar actividades" description="Alta, edición y baja de actividades independientes del fútbol." accent="emerald">
        <div className="grid items-end gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 md:grid-cols-[1fr_1fr_150px_120px_150px_auto]">
          <Lbl k="Actividad"><Input value={newActividad.nombre} onChange={(e) => setNewActividad((v) => aplicarReglaHockey({ ...v, nombre: e.target.value }))} placeholder="Ej: Hockey" /></Lbl>
          <Lbl k="Profesor/a"><Input value={newActividad.profesor} onChange={(e) => setNewActividad((v) => ({ ...v, profesor: e.target.value }))} placeholder="Ej: Profe Laura" /></Lbl>
          <Lbl k="Cuota mensual"><Input type="number" value={newActividad.cuotaMensual} onChange={(e) => setNewActividad((v) => ({ ...v, cuotaMensual: e.target.value }))} placeholder="12000" /></Lbl>
          <Lbl k="Vence día"><Input type="number" min="1" max="31" value={newActividad.diaVencimiento} onChange={(e) => setNewActividad((v) => ({ ...v, diaVencimiento: e.target.value }))} placeholder="10" /></Lbl>
          <Lbl k="Recargo"><Input type="number" value={newActividad.recargoFueraTermino} onChange={(e) => setNewActividad((v) => ({ ...v, recargoFueraTermino: e.target.value }))} placeholder="3000" /></Lbl>
          <Button type="button" size="icon" onClick={addActividad} disabled={savingActividad || !newActividad.nombre.trim()} title="Agregar actividad" aria-label="Agregar actividad" className="bg-emerald-600 hover:bg-emerald-700">
            {savingActividad ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          {actividades.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">Todavía no hay actividades cargadas.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {actividades.map((actividad) => (
                <div key={actividad.id} className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_140px_170px_auto] md:items-center">
                  {editActividadId === actividad.id ? (
                    <>
                      <Input value={editActividad.nombre} onChange={(e) => setEditActividad((v) => aplicarReglaHockey({ ...v, nombre: e.target.value }))} />
                      <Input value={editActividad.profesor} onChange={(e) => setEditActividad((v) => ({ ...v, profesor: e.target.value }))} placeholder="Profesor/a" />
                      <Input type="number" value={editActividad.cuotaMensual} onChange={(e) => setEditActividad((v) => ({ ...v, cuotaMensual: e.target.value }))} placeholder="Cuota" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" min="1" max="31" value={editActividad.diaVencimiento} onChange={(e) => setEditActividad((v) => ({ ...v, diaVencimiento: e.target.value }))} placeholder="Día venc." />
                        <Input type="number" value={editActividad.recargoFueraTermino} onChange={(e) => setEditActividad((v) => ({ ...v, recargoFueraTermino: e.target.value }))} placeholder="Recargo" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="icon" onClick={() => saveActividad(actividad.id)} disabled={savingActividad || !editActividad.nombre.trim()} className="bg-emerald-600 hover:bg-emerald-700">
                          {savingActividad ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </Button>
                        <Button type="button" size="icon" variant="outline" onClick={cancelEditActividad}><X className="w-4 h-4" /></Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <InfoBlock title={actividad.nombre} subtitle="Actividad" />
                      <InfoBlock title={actividad.profesor || "A definir"} subtitle="Profesor/a" />
                      <InfoBlock title={formatMoney(actividad.cuotaMensual || 0)} subtitle="Cuota mensual" strong />
                      <InfoBlock
                        title={actividad.diaVencimiento ? `Día ${actividad.diaVencimiento} · ${formatMoney(actividad.recargoFueraTermino || 0)}` : "Sin recargo"}
                        subtitle="Vencimiento / recargo"
                      />
                      <div className="text-right">
                        <ActionMenu
                          testId={`config-actividad-actions-${actividad.id}`}
                          options={[
                            { label: "Editar", icon: Pencil, color: "info", onClick: () => startEditActividad(actividad) },
                            { label: "Eliminar", icon: Trash2, color: "danger", onClick: () => removeActividad(actividad) },
                          ]}
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-blue-700 hover:bg-blue-800" data-testid="save-config">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" />Guardar cambios</>}
        </Button>
      </div>

      <Card icon={Users} title="Usuarios y permisos" description="Perfiles autorizados cargados en Firestore. Primero creá el usuario en Firebase Authentication y después pegá su UID acá." accent="slate">
        <div className="mb-4 flex justify-end">
          <Dialog open={openUser} onOpenChange={setOpenUser}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="add-user-button"><Plus className="w-4 h-4 mr-2" />Nuevo usuario</Button>
            </DialogTrigger>
            <UserProfileDialog onSaved={() => { setOpenUser(false); load(); setFeedback({ title: "Perfil guardado", description: "El perfil de usuario quedó guardado en Firestore." }); }} categorias={cfg.categorias} setFeedback={setFeedback} />
          </Dialog>
          {editUser && (
            <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
              <UserProfileDialog
                initial={editUser}
                isEdit
                categorias={cfg.categorias}
                setFeedback={setFeedback}
                onSaved={() => { setEditUser(null); load(); setFeedback({ title: "Perfil actualizado", description: "Los permisos quedaron guardados." }); }}
              />
            </Dialog>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <div className="font-semibold text-slate-900">{u.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{u.email}</span>
                    <RolePill role={u.role} />
                    {u.categoria ? <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">Cat. {u.categoria}</span> : null}
                    {u.activo === false ? <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700">Inactivo</span> : <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">Activo</span>}
                  </div>
                </div>
                <ActionMenu
                  testId={`actions-user-${u.email}`}
                  options={[
                    { label: "Editar permisos", icon: Pencil, color: "info", onClick: () => setEditUser(u) },
                    { label: u.activo === false ? "Activar" : "Desactivar", icon: u.activo === false ? Check : X, color: u.activo === false ? "success" : "warning", onClick: () => toggleUser(u) },
                    { label: "Eliminar perfil", icon: Trash2, color: "danger", onClick: () => deleteUser(u) },
                  ]}
                />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <PermisosPanel />
      <ReportesPanel setConfirmAction={setConfirmAction} setFeedback={setFeedback} />

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
          await safeRun(action?.run, action?.okTitle, action?.okDescription);
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

function QuickInfo({ icon: Icon, label, value, compact = false }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {Icon && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/80"><Icon className="h-4 w-4" /></div>}
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</div>
        <div className={`truncate font-semibold ${compact ? "text-xs" : "text-sm"}`} title={String(value)}>{value}</div>
      </div>
    </div>
  );
}

function RolePill({ role }) {
  const styles = {
    admin: "bg-blue-50 text-blue-700",
    secretaria: "bg-emerald-50 text-emerald-700",
    comision: "bg-slate-100 text-slate-700",
    entrenador: "bg-amber-50 text-amber-700",
  };
  const labels = { admin: "Administrador", secretaria: "Secretaria", comision: "Comisión", entrenador: "Entrenador" };
  return <span className={`rounded-full px-2 py-0.5 font-semibold ${styles[role] || styles.comision}`}>{labels[role] || role}</span>;
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-100">{label}</div>
    </div>
  );
}

function InfoBlock({ title, subtitle, strong }) {
  return (
    <div>
      <div className={`text-slate-900 ${strong ? "font-bold" : "font-semibold"}`}>{title}</div>
      <div className="text-xs text-slate-500">{subtitle}</div>
    </div>
  );
}

function PermisosPanel() {
  const rows = [
    { fn: "Ver Inicio", admin: true, secretaria: true, comision: true, entrenador: true },
    { fn: "Ver Socios", admin: true, secretaria: true, comision: true, entrenador: "Solo su categoría" },
    { fn: "Crear / Editar Socios", admin: true, secretaria: true, comision: false, entrenador: false },
    { fn: "Dar de baja Socios", admin: true, secretaria: true, comision: false, entrenador: false },
    { fn: "Ver datos sensibles", admin: true, secretaria: true, comision: false, entrenador: false },
    { fn: "Registrar pagos", admin: true, secretaria: true, comision: false, entrenador: false },
    { fn: "Ver Deudores", admin: true, secretaria: true, comision: true, entrenador: false },
    { fn: "CSV", admin: true, secretaria: true, comision: true, entrenador: false },
    { fn: "Generar / Descargar Carnet", admin: true, secretaria: true, comision: true, entrenador: "Solo lectura" },
    { fn: "Configurar club / link de pago", admin: true, secretaria: false, comision: false, entrenador: false },
    { fn: "Gestionar Usuarios", admin: true, secretaria: false, comision: false, entrenador: false },
  ];
  const cell = (v) => {
    if (v === true) return <span className="font-bold text-emerald-600">✓</span>;
    if (v === false) return <span className="text-slate-300">—</span>;
    return <span className="text-xs font-semibold text-amber-600">{v}</span>;
  };
  return (
    <Card icon={ShieldCheck} title="Permisos por rol" description="Los permisos están fijos por seguridad. Los datos sensibles de menores solo se ven con rol Administrador o Secretaria." accent="blue">
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs uppercase font-semibold text-slate-500">Función</th>
              <th className="px-3 py-3 text-center text-xs uppercase font-semibold text-slate-500">Admin</th>
              <th className="px-3 py-3 text-center text-xs uppercase font-semibold text-slate-500">Secretaria</th>
              <th className="px-3 py-3 text-center text-xs uppercase font-semibold text-slate-500">Comisión</th>
              <th className="px-3 py-3 text-center text-xs uppercase font-semibold text-slate-500">Entrenador</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.fn} className="border-t border-slate-200">
                <td className="px-3 py-2.5 text-slate-700">{r.fn}</td>
                <td className="px-3 py-2.5 text-center">{cell(r.admin)}</td>
                <td className="px-3 py-2.5 text-center">{cell(r.secretaria)}</td>
                <td className="px-3 py-2.5 text-center">{cell(r.comision)}</td>
                <td className="px-3 py-2.5 text-center">{cell(r.entrenador)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ReportesPanel({ setConfirmAction, setFeedback }) {
  const exportar = (tipo) => {
    const labels = { socios: "socios", deudores: "deudores", pagos: "historial de pagos" };
    setConfirmAction({
      title: "Descargar CSV",
      description: `¿Querés descargar el reporte de ${labels[tipo]}?`,
      confirmText: "Descargar",
      run: async () => {
        const hoy = new Date().toISOString().slice(0, 10);
        if (tipo === "socios") {
          const { data } = await api.get("/socios");
          downloadCsv(`socios-${hoy}.csv`, [["N°", "Apellido", "Nombre", "Categoría", "Estado", "Estado cuota"], ...data.map((s) => [s.numeroSocio, s.apellido, s.nombre, s.categoria, s.estado, s.estadoCuota])]);
        }
        if (tipo === "deudores") {
          const { data } = await api.get("/deudores");
          downloadCsv(`deudores-${hoy}.csv`, [["N°", "Apellido", "Nombre", "Categoría", "Cantidad meses", "Deuda"], ...data.map((d) => [d.numeroSocio, d.apellido, d.nombre, d.categoria, d.cantidadMeses, d.deudaTotal])]);
        }
        if (tipo === "pagos") {
          const { data } = await api.get("/pagos");
          downloadCsv(`pagos-${hoy}.csv`, [["Fecha", "Socio", "Categoría", "Meses", "Monto", "Método"], ...data.map((p) => [p.fechaPago, p.socioNombre, p.socioCategoria, p.esPagoAnual ? "PAGO ANUAL" : (p.meses || []).join(", "), p.monto, p.metodo])]);
        }
        setFeedback({ title: "CSV descargado", description: "El reporte se descargó correctamente." });
      },
    });
  };
  return (
    <Card icon={Download} title="Reportes y exportaciones" description="Exportaciones CSV generadas desde los datos actuales de Firebase." accent="amber">
      <div className="grid gap-3 md:grid-cols-3">
        <Button variant="outline" onClick={() => exportar("socios")} data-testid="rep-todos-socios"><FileText className="w-4 h-4 mr-2" /> Todos los socios</Button>
        <Button variant="outline" onClick={() => exportar("deudores")} data-testid="rep-deudores"><FileText className="w-4 h-4 mr-2" /> Deudores</Button>
        <Button variant="outline" onClick={() => exportar("pagos")} data-testid="rep-pagos-historial"><FileText className="w-4 h-4 mr-2" /> Historial de pagos</Button>
      </div>
    </Card>
  );
}

function Lbl({ k, children }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider font-semibold text-slate-500">{k}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function UserProfileDialog({ initial = null, isEdit = false, onSaved, categorias, setFeedback }) {
  const [data, setData] = useState(() => ({
    uid: initial?.id || initial?.uid || "",
    email: initial?.email || "",
    name: initial?.name || initial?.nombre || "",
    role: initial?.role || initial?.rol || "secretaria",
    categoria: initial?.categoria || "",
    activo: initial?.activo !== false,
  }));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      if (isEdit) await api.put(`/users/${data.uid}`, data);
      else await api.post("/users", data);
      onSaved();
    } catch (e) {
      setFeedback({ variant: "error", title: "No se pudo crear", description: formatApiError(e?.response?.data?.detail) });
    } finally { setSaving(false); }
  };
  return (
    <DialogContent className="max-w-md rounded-2xl">
      <DialogHeader><DialogTitle>{isEdit ? "Editar perfil de usuario" : "Nuevo perfil de usuario"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        {!isEdit && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            Primero creá el usuario en Firebase Authentication. Después copiá su UID y cargá acá el perfil con su rol.
          </p>
        )}
        <Lbl k="UID de Firebase Auth"><Input value={data.uid} onChange={(e) => setData({ ...data, uid: e.target.value })} placeholder="Ej: 7Yx..." data-testid="newuser-uid" disabled={isEdit} /></Lbl>
        <Lbl k="Nombre"><Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} data-testid="newuser-name" /></Lbl>
        <Lbl k="Email"><Input type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} data-testid="newuser-email" /></Lbl>
        <Lbl k="Estado">
          <Select value={data.activo ? "activo" : "inactivo"} onValueChange={(v) => setData({ ...data, activo: v === "activo" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="inactivo">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </Lbl>
        <Lbl k="Rol">
          <Select value={data.role} onValueChange={(v) => setData({ ...data, role: v })}>
            <SelectTrigger data-testid="newuser-role"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="secretaria">Secretaria</SelectItem>
              <SelectItem value="comision">Comisión</SelectItem>
              <SelectItem value="entrenador">Entrenador</SelectItem>
            </SelectContent>
          </Select>
        </Lbl>
        {data.role === "entrenador" && (
          <Lbl k="Categoría a cargo">
            <Select value={data.categoria || ""} onValueChange={(v) => setData({ ...data, categoria: v })}>
              <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Lbl>
        )}
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !data.uid || !data.email || !data.name} className="bg-blue-700 hover:bg-blue-800" data-testid="save-newuser">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEdit ? "Guardar cambios" : "Guardar perfil")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
