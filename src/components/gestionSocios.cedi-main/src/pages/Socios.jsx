import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth, hasRole } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Loader2, Download, Eye, CreditCard, Pencil, UserX, Trash2 } from "lucide-react";
import { downloadCsv } from "@/utils/exportCsv";
import RegistrarPagoDialog from "@/components/RegistrarPagoDialog";
import ActionMenu from "@/components/ActionMenu";
import { ConfirmActionDialog, FeedbackDialog } from "@/components/ConfirmActionDialog";
import PhotoUploadField from "@/components/PhotoUploadField";

const EMPTY_SOCIO = {
  nombre: "", apellido: "", dni: "", fechaNacimiento: "",
  categoria: "2015", estado: "activo",
  tutorNombre: "", tutorTelefono: "", tutorEmail: "",
  direccion: "", obraSocial: "",
  aptoMedico: false, autorizacionImagen: false,
  fotoUrl: "",
  fotoPublicId: "",
  observaciones: "",
};

function capitalizeWords(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/(^|[\s'’.-])([a-záéíóúüñ])/g, (match, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

export default function Socios() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [estado, setEstado] = useState("todos");
  const [estadoCuota, setEstadoCuota] = useState("todos");
  const [categorias, setCategorias] = useState([]);
  const [cfg, setCfg] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [openNew, setOpenNew] = useState(searchParams.get("nuevo") === "1");
  const [editSocio, setEditSocio] = useState(null);
  const [pagoOpen, setPagoOpen] = useState(false);
  const [pagoSocio, setPagoSocio] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/socios", { params: { search, categoria, estado, estadoCuota } });
      setList(data);
    } catch (e) {
      setFeedback({ variant: "error", title: "No se pudo cargar", description: formatApiError(e?.response?.data?.detail) });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    api.get("/config").then(({ data }) => {
      setCategorias(data.categorias || []);
      setCfg(data);
    });
  }, []);
  useEffect(() => { fetchList(); }, [search, categoria, estado, estadoCuota]);

  const canEdit = hasRole(user, "admin", "secretaria");
  const canExport = hasRole(user, "admin", "secretaria", "comision");
  const canDeletePermanente = hasRole(user, "admin");

  const bajaSocio = (socio) => {
    if (socio.estado === "baja") return;
    setConfirmAction({
      title: "Dar de baja socio",
      description: `¿Querés dar de baja a ${socio.nombre} ${socio.apellido}? El socio seguirá registrado para conservar su historial.`,
      confirmText: "Dar de baja",
      variant: "danger",
      run: async () => {
        await api.delete(`/socios/${socio.id}`);
        setFeedback({ title: "Socio dado de baja", description: "La baja se realizó correctamente." });
        fetchList();
      },
    });
  };

  const eliminarDefinitivo = (socio) => {
    if (socio.estado !== "baja") {
      setFeedback({ variant: "error", title: "No se puede eliminar", description: "Solo se puede eliminar definitivamente un socio dado de baja." });
      return;
    }
    setConfirmAction({
      title: "Eliminar socio definitivamente",
      description: `¿Querés eliminar definitivamente a ${socio.nombre} ${socio.apellido}? También se eliminarán sus pagos asociados. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      variant: "danger",
      run: async () => {
        await api.delete(`/socios/${socio.id}/permanente`);
        setFeedback({ title: "Socio eliminado", description: "El socio fue eliminado definitivamente." });
        fetchList();
      },
    });
  };

  const handleAction = (value, socio) => {
    if (!value) return;
    if (value === "ficha") navigate(`/socios/${socio.id}`);
    if (value === "pago") { setPagoSocio(socio); setPagoOpen(true); }
    if (value === "editar") setEditSocio(socio);
    if (value === "baja") bajaSocio(socio);
    if (value === "eliminar") eliminarDefinitivo(socio);
  };

  const doExportCSV = () => {
    const rows = [
      ["N° Socio", "Apellido", "Nombre", "DNI", "Fecha Nac.", "Categoría", "Estado", "Fecha Alta", "Madre, padre o tutor", "Teléfono", "Email", "Obra social", "Apto médico", "Autoriz. imagen", "Meses adeudados", "Deuda total"],
      ...list.map((s) => [
        s.numeroSocio, s.apellido, s.nombre, s.dni, s.fechaNacimiento, s.categoria, s.estado, s.fechaAlta,
        s.tutorNombre, s.tutorTelefono, s.tutorEmail, s.obraSocial, s.aptoMedico ? "Sí" : "No",
        s.autorizacionImagen ? "Sí" : "No", s.mesesAdeudados?.length || 0, s.deudaTotal || 0,
      ]),
    ];
    downloadCsv(`socios-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    setFeedback({ title: "CSV descargado", description: "El listado de socios se descargó correctamente." });
  };

  const exportCSV = () => {
    setConfirmAction({
      title: "Descargar CSV",
      description: "¿Querés descargar el listado de socios según los filtros actuales?",
      confirmText: "Descargar",
      run: doExportCSV,
    });
  };

  return (
    <div className="space-y-6" data-testid="socios-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>Socios</h1>
          <p className="text-slate-500 mt-1">{list.length} socios de fútbol encontrados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canEdit && (
            <Dialog open={openNew} onOpenChange={(o) => { setOpenNew(o); if (!o) setSearchParams({}); }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-700 hover:bg-blue-800" data-testid="add-socio-button">
                  <Plus className="w-4 h-4 mr-2" /> Agregar socio
                </Button>
              </DialogTrigger>
              
              <SocioFormDialog
                key={`nuevo-socio-${openNew ? "open" : "closed"}`}
                categorias={categorias}
                onSaved={() => { setOpenNew(false); setSearchParams({}); fetchList(); }}
                initial={{ ...EMPTY_SOCIO }}
              />
            </Dialog>
          )}
          {canExport && (
            <>
              <Button variant="outline" onClick={exportCSV} data-testid="socios-export-csv"><Download className="w-4 h-4 mr-2" />CSV</Button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 grid md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            data-testid="socios-search"
            placeholder="Buscar por nombre, apellido o N°..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger data-testid="filter-categoria"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {categorias.map((c) => <SelectItem key={c} value={c}>Categoría {c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger data-testid="filter-estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="inactivo">Inactivo</SelectItem>
            <SelectItem value="baja">Baja</SelectItem>
          </SelectContent>
        </Select>
        <Select value={estadoCuota} onValueChange={setEstadoCuota}>
          <SelectTrigger data-testid="filter-cuota"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Cuota: Todos</SelectItem>
            <SelectItem value="al_dia">Al día</SelectItem>
            <SelectItem value="con_deuda">Con deuda</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {["N°", "Apellido y nombre", "Categoría", "Estado", "Cuota", "Madre, padre o tutor", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500"><Loader2 className="inline w-4 h-4 animate-spin mr-2" />Cargando...</td></tr>
              )}
              {!loading && list.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500 text-sm">Sin resultados.</td></tr>
              )}
              {!loading && list.map((s) => (
                <tr key={s.id} data-testid={`socio-row-${s.numeroSocio}`} className="border-t border-slate-200 cursor-pointer" onClick={() => navigate(`/socios/${s.id}`)}>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">#{s.numeroSocio}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    <Link to={`/socios/${s.id}`} className="font-medium text-blue-700 underline-offset-2">
                      {s.apellido}, {s.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{s.categoria}</td>
                  <td className="px-4 py-3"><BadgeEstado v={s.estado} /></td>
                  <td className="px-4 py-3"><BadgeCuota v={s.estadoCuota} meses={s.mesesAdeudados?.length} /></td>
                  <td className="px-4 py-3 text-sm text-slate-600">{s.tutorNombre || "-"}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <ActionMenu
                      testId={`actions-socio-${s.numeroSocio}`}
                      options={[
                        { label: "Ver ficha", icon: Eye, color: "info", onClick: () => handleAction("ficha", s) },
                        canEdit && { label: "Registrar pago", icon: CreditCard, color: "payment", onClick: () => handleAction("pago", s) },
                        canEdit && { label: "Editar", icon: Pencil, color: "default", onClick: () => handleAction("editar", s) },
                        canEdit && s.estado !== "baja" && { label: "Dar de baja", icon: UserX, color: "warning", onClick: () => handleAction("baja", s) },
                        canDeletePermanente && s.estado === "baja" && { label: "Eliminar definitivo", icon: Trash2, color: "danger", onClick: () => handleAction("eliminar", s) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editSocio && (
        <Dialog open={!!editSocio} onOpenChange={(open) => !open && setEditSocio(null)}>
          <SocioFormDialog
            initial={editSocio}
            isEdit
            socioId={editSocio.id}
            categorias={categorias}
            onSaved={() => { setEditSocio(null); fetchList(); }}
          />
        </Dialog>
      )}

      <RegistrarPagoDialog
        open={pagoOpen}
        onOpenChange={setPagoOpen}
        socio={pagoSocio}
        cfg={cfg}
        onSaved={() => { setPagoOpen(false); setPagoSocio(null); fetchList(); }}
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

function BadgeEstado({ v }) {
  const map = {
    activo: "bg-emerald-100 text-emerald-800",
    inactivo: "bg-slate-100 text-slate-700",
    baja: "bg-red-100 text-red-800",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[v] || "bg-slate-100 text-slate-700"}`}>{v}</span>;
}
function BadgeCuota({ v, meses }) {
  if (v === "al_dia") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Al día</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Debe {meses}</span>;
}

export function SocioFormDialog({ initial, categorias, onSaved, isEdit, socioId }) {
  const [data, setData] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => { setData({ ...initial, actividad: "" }); }, [initial]);

  const set = (k, v) => setData((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...data, actividad: "" };
      if (isEdit && socioId) {
        await api.put(`/socios/${socioId}`, payload);
        setFeedback({ title: "Socio actualizado", description: "Los cambios se guardaron correctamente." });
      } else {
        await api.post("/socios", payload);
        setData({ ...EMPTY_SOCIO });
        setFeedback({ title: "Socio creado", description: "El nuevo socio se agregó correctamente." });
      }
    } catch (e) {
      setFeedback({ variant: "error", title: "No se pudo guardar", description: formatApiError(e?.response?.data?.detail) });
    } finally { setSaving(false); }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar socio" : "Nuevo socio"}</DialogTitle>
      </DialogHeader>
      <div className="grid md:grid-cols-2 gap-4 py-2">
        <Field label="Nombre"><Input data-testid="form-nombre" value={data.nombre} onChange={(e) => set("nombre", capitalizeWords(e.target.value))} /></Field>
        <Field label="Apellido"><Input data-testid="form-apellido" value={data.apellido} onChange={(e) => set("apellido", capitalizeWords(e.target.value))} /></Field>
        <Field label="DNI"><Input data-testid="form-dni" value={data.dni} onChange={(e) => set("dni", e.target.value)} /></Field>
        <Field label="Fecha de nacimiento"><Input type="date" value={data.fechaNacimiento} onChange={(e) => set("fechaNacimiento", e.target.value)} /></Field>
        <Field label="Categoría">
          <Select value={data.categoria} onValueChange={(v) => set("categoria", v)}>
            <SelectTrigger data-testid="form-categoria"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Estado">
          <Select value={data.estado} onValueChange={(v) => set("estado", v)}>
            <SelectTrigger data-testid="form-estado"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="inactivo">Inactivo</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Madre, padre o tutor"><Input value={data.tutorNombre} onChange={(e) => set("tutorNombre", capitalizeWords(e.target.value))} /></Field>
        <Field label="Teléfono madre, padre o tutor"><Input value={data.tutorTelefono} onChange={(e) => set("tutorTelefono", e.target.value)} /></Field>
        <Field label="Email madre, padre o tutor"><Input type="email" value={data.tutorEmail} onChange={(e) => set("tutorEmail", e.target.value)} /></Field>
        <Field label="Dirección"><Input value={data.direccion} onChange={(e) => set("direccion", e.target.value)} /></Field>
        <Field label="Obra social"><Input value={data.obraSocial} onChange={(e) => set("obraSocial", e.target.value)} /></Field>
        <Field label="Foto para carnet" colSpan>
          <PhotoUploadField
            value={data.fotoUrl || ""}
            publicId={data.fotoPublicId || ""}
            folder="cedi/socios"
            onChange={({ fotoUrl, fotoPublicId }) => setData((p) => ({ ...p, fotoUrl, fotoPublicId }))}
          />
        </Field>
        <div className="flex items-center gap-3 mt-6">
          <Checkbox id="apto" checked={data.aptoMedico} onCheckedChange={(v) => set("aptoMedico", !!v)} />
          <Label htmlFor="apto" className="cursor-pointer">Apto médico</Label>
        </div>
        <div className="flex items-center gap-3 mt-6">
          <Checkbox id="autoImg" checked={data.autorizacionImagen} onCheckedChange={(v) => set("autorizacionImagen", !!v)} />
          <Label htmlFor="autoImg" className="cursor-pointer">Autorización de imagen</Label>
        </div>
        <Field label="Observaciones" colSpan>
          <Input value={data.observaciones} onChange={(e) => set("observaciones", e.target.value)} />
        </Field>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !data.nombre || !data.apellido} className="bg-blue-700 hover:bg-blue-800" data-testid="save-socio-button">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEdit ? "Guardar cambios" : "Crear socio")}
        </Button>
      </DialogFooter>
      <FeedbackDialog
        open={!!feedback}
        onOpenChange={(open) => {
          if (!open) {
            setFeedback(null);
            if (feedback?.variant !== "error") onSaved?.();
          }
        }}
        title={feedback?.title}
        description={feedback?.description}
        variant={feedback?.variant}
      />
    </DialogContent>
  );
}

function Field({ label, children, colSpan }) {
  return (
    <div className={colSpan ? "md:col-span-2" : ""}>
      <Label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
