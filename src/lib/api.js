import { mockConfig } from "@/data/mockData";
import { getTodayLocalDate, getCurrentLocalMonth, getLocalDateTimeString } from "@/utils/date";
import { db as firestoreDb } from "@/firebase/firebase";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

export const API = "firebase://cedi-los-15";
const DB_KEY = "cedi_mock_db_v1";

const clone = (v) => JSON.parse(JSON.stringify(v));
const ok = (data) => Promise.resolve({ data });

function normalizePlain(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isHockeyName(nombre = "") {
  return normalizePlain(nombre) === "hockey";
}

function normalizeDueDay(value, fallback = null) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(31, Math.max(1, Math.round(n)));
}

function normalizeMoney(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function capitalizeWords(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/(^|[\s'’.-])([a-záéíóúüñ])/g, (match, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

function normalizeActividad(a, index = 0) {
  const nombre = typeof a === "string" ? a : a?.nombre;
  const profesor = typeof a === "string" ? "A definir" : (a?.profesor || "A definir");
  const cuotaMensual = typeof a === "string" ? 0 : Number(a?.cuotaMensual || 0);
  const cleanNombre = String(nombre || "").trim();
  if (!cleanNombre || /^f[úu]tbol$/i.test(cleanNombre)) return null;

  const esHockey = isHockeyName(cleanNombre);
  const diaVencimiento = normalizeDueDay(
    typeof a === "object" ? (a?.diaVencimiento ?? a?.vencimientoDia) : null,
    esHockey ? 10 : null
  );
  const recargoFueraTermino = normalizeMoney(
    typeof a === "object" ? (a?.recargoFueraTermino ?? a?.recargo) : null,
    esHockey ? 3000 : 0
  );

  return {
    id: (typeof a === "object" && a?.id) ? a.id : `act_${cleanNombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || index}`,
    nombre: cleanNombre,
    profesor: String(profesor || "A definir").trim() || "A definir",
    cuotaMensual,
    diaVencimiento,
    recargoFueraTermino,
  };
}

function normalizeActividades(actividades = []) {
  const map = new Map();
  actividades.map(normalizeActividad).filter(Boolean).forEach((a) => {
    const key = a.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!map.has(key)) map.set(key, a);
  });
  return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function normalizeAlumnoActividad(alumno = {}, index = 0) {
  return {
    id: alumno.id || `aa_${String(index + 1).padStart(3, "0")}`,
    nombre: capitalizeWords(alumno.nombre || ""),
    apellido: capitalizeWords(alumno.apellido || ""),
    dni: alumno.dni || "",
    fechaNacimiento: alumno.fechaNacimiento || "",
    direccion: alumno.direccion || "",
    obraSocial: alumno.obraSocial || "",
    actividadId: alumno.actividadId || "",
    tutorNombre: capitalizeWords(alumno.tutorNombre || ""),
    tutorTelefono: alumno.tutorTelefono || "",
    fechaAlta: alumno.fechaAlta || today(),
    estado: alumno.estado || "activo",
    fotoUrl: alumno.fotoUrl || "",
    fotoPublicId: alumno.fotoPublicId || "",
    autorizacionImagen: !!alumno.autorizacionImagen,
    observaciones: alumno.observaciones || "",
  };
}

function actividadNames(db) {
  return normalizeActividades(db?.config?.actividades || []).map((a) => a.nombre);
}

function actividadProfesor(db, nombre) {
  return normalizeActividades(db?.config?.actividades || []).find((a) => a.nombre === nombre)?.profesor || "";
}

function normalizeMetodoPago(metodo) {
  return metodo === "transferencia" ? "mercadopago" : (metodo || "efectivo");
}

function normalizePago(pago = {}) {
  return { ...pago, metodo: normalizeMetodoPago(pago.metodo) };
}

function pagoSortValue(p = {}) {
  return `${p.fechaPago || ""}T${p.createdAt || ""}`;
}

function sortPagosDesc(a, b) {
  return pagoSortValue(b).localeCompare(pagoSortValue(a));
}

function initialDb() {
  return {
    config: { ...clone(mockConfig), actividades: [] },
    users: [],
    socios: [],
    pagos: [],
    alumnosActividades: [],
    pagosActividades: [],
  };
}

function loadLocalDb() {
  // Los datos administrativos ya viven en Firestore.
  // Eliminamos cualquier cache vieja de la etapa mock para evitar datos mezclados.
  localStorage.removeItem(DB_KEY);
  return initialDb();
}

function saveDb() {
  // No persistimos datos administrativos en localStorage.
  // La única persistencia local permitida queda en AuthContext para la sesión del usuario.
  localStorage.removeItem(DB_KEY);
}

function firestoreApiError(error, fallback = "No se pudo completar la operación en Firebase.") {
  const code = error?.code || "";
  const details = {
    "permission-denied": "No tenés permisos para realizar esta acción.",
    unauthenticated: "Tenés que iniciar sesión nuevamente.",
    unavailable: "Firebase no está disponible. Revisá la conexión e intentá de nuevo.",
    "not-found": "El registro no existe o fue eliminado.",
    "invalid-argument": "Los datos enviados no son válidos.",
  };
  return { response: { status: code === "permission-denied" ? 403 : 500, data: { detail: details[code] || error?.message || fallback } } };
}

const CONFIG_DOC_REF = () => doc(firestoreDb, "configuracion", "general");
const ACTIVIDADES_COLLECTION_REF = () => collection(firestoreDb, "actividades");
const ACTIVIDAD_DOC_REF = (id) => doc(firestoreDb, "actividades", id);
const ALUMNOS_ACTIVIDADES_COLLECTION_REF = () => collection(firestoreDb, "alumnosActividades");
const ALUMNO_ACTIVIDAD_DOC_REF = (id) => doc(firestoreDb, "alumnosActividades", id);
const PAGOS_ACTIVIDADES_COLLECTION_REF = () => collection(firestoreDb, "pagosActividades");
const PAGO_ACTIVIDAD_DOC_REF = (id) => doc(firestoreDb, "pagosActividades", id);
const SOCIOS_COLLECTION_REF = () => collection(firestoreDb, "socios");
const SOCIO_DOC_REF = (id) => doc(firestoreDb, "socios", id);
const PAGOS_SOCIOS_COLLECTION_REF = () => collection(firestoreDb, "pagosSocios");
const PAGO_SOCIO_DOC_REF = (id) => doc(firestoreDb, "pagosSocios", id);
const USUARIOS_COLLECTION_REF = () => collection(firestoreDb, "usuarios");
const USUARIO_DOC_REF = (id) => doc(firestoreDb, "usuarios", id);

function normalizeSocio(socio = {}, index = 0) {
  return {
    id: socio.id || `s_${String(index + 1).padStart(3, "0")}`,
    numeroSocio: Number(socio.numeroSocio || index + 1),
    nombre: capitalizeWords(socio.nombre || ""),
    apellido: capitalizeWords(socio.apellido || ""),
    dni: socio.dni || "",
    fechaNacimiento: socio.fechaNacimiento || "",
    categoria: socio.categoria || "",
    estado: socio.estado || "activo",
    fechaAlta: socio.fechaAlta || today(),
    fotoUrl: socio.fotoUrl || "",
    fotoPublicId: socio.fotoPublicId || "",
    tutorNombre: capitalizeWords(socio.tutorNombre || ""),
    tutorTelefono: socio.tutorTelefono || "",
    tutorEmail: socio.tutorEmail || "",
    direccion: socio.direccion || "",
    obraSocial: socio.obraSocial || "",
    aptoMedico: !!socio.aptoMedico,
    autorizacionImagen: !!socio.autorizacionImagen,
    observaciones: socio.observaciones || "",
    actividad: "",
    createdAt: socio.createdAt || firestoreDateToString(socio.creadoEn) || firestoreDateToString(socio.actualizadoEn) || "",
  };
}

function cleanSocioForFirestore(socio = {}) {
  const clean = normalizeSocio(socio);
  const { id, actividad, createdAt, ...data } = clean;
  return data;
}

async function getFirestoreSocios() {
  try {
    const snap = await getDocs(SOCIOS_COLLECTION_REF());
    if (snap.empty) return [];
    return snap.docs
      .map((d, index) => normalizeSocio({ id: d.id, ...d.data() }, index))
      .sort((a, b) => Number(b.numeroSocio || 0) - Number(a.numeroSocio || 0));
  } catch (error) {
    console.error("No se pudieron leer socios desde Firestore.", error);
    throw firestoreApiError(error, "No se pudieron leer socios desde Firebase.");
  }
}

async function nextNumeroSocioFirestore() {
  const snap = await getDocs(SOCIOS_COLLECTION_REF());
  const remoteMax = snap.docs.reduce((max, d) => Math.max(max, Number(d.data()?.numeroSocio || 0)), 0);
  return remoteMax + 1;
}

async function createFirestoreSocio(body = {}) {
  const numeroSocio = body.numeroSocio ? Number(body.numeroSocio) : await nextNumeroSocioFirestore();
  const socio = normalizeSocio({
    ...body,
    numeroSocio,
    estado: body.estado || "activo",
    fechaAlta: body.fechaAlta || today(),
  });
  const createdAt = getLocalDateTimeString();
  const ref = await addDoc(SOCIOS_COLLECTION_REF(), {
    ...cleanSocioForFirestore(socio),
    numeroSocio,
    createdAt,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });
  return { ...socio, id: ref.id, numeroSocio, createdAt };
}

async function updateFirestoreSocio(id, body = {}) {
  const data = cleanSocioForFirestore({ id, ...body });
  await updateDoc(SOCIO_DOC_REF(id), {
    ...data,
    actualizadoEn: serverTimestamp(),
  });
  return { id, ...data };
}

async function bajaFirestoreSocio(id) {
  await updateDoc(SOCIO_DOC_REF(id), {
    estado: "baja",
    actualizadoEn: serverTimestamp(),
  });
}

async function deleteFirestoreSocio(id) {
  await deleteDoc(SOCIO_DOC_REF(id));
}

function normalizePagoSocioFirestore(id, data = {}) {
  return normalizePago({
    id,
    socioId: data.socioId || "",
    meses: Array.isArray(data.meses) ? data.meses.filter(Boolean) : [data.mes].filter(Boolean),
    monto: Number(data.monto || 0),
    fechaPago: data.fechaPago || today(),
    metodo: data.metodo || "efectivo",
    comprobanteUrl: data.comprobanteUrl || "",
    observacion: data.observacion || "",
    esPagoAnual: !!data.esPagoAnual,
    anulado: !!data.anulado,
    createdAt: data.createdAt || firestoreDateToString(data.creadoEn) || firestoreDateToString(data.actualizadoEn) || "",
  });
}

function cleanPagoSocioForFirestore(pago = {}) {
  const meses = Array.isArray(pago.meses) ? pago.meses.filter(Boolean) : [pago.mes].filter(Boolean);
  return {
    socioId: pago.socioId || "",
    meses,
    monto: Number(pago.monto || 0),
    fechaPago: pago.fechaPago || today(),
    metodo: normalizeMetodoPago(pago.metodo),
    comprobanteUrl: pago.comprobanteUrl || "",
    observacion: pago.observacion || "",
    esPagoAnual: !!pago.esPagoAnual,
    anulado: !!pago.anulado,
  };
}

async function getFirestorePagosSocios() {
  try {
    const snap = await getDocs(PAGOS_SOCIOS_COLLECTION_REF());
    if (snap.empty) return [];

    return snap.docs
      .map((d) => normalizePagoSocioFirestore(d.id, d.data()))
      .filter((p) => !p.anulado)
      .sort(sortPagosDesc);
  } catch (error) {
    console.error("No se pudieron leer pagos de socios desde Firestore.", error);
    throw firestoreApiError(error, "No se pudieron leer pagos de socios desde Firebase.");
  }
}

async function createFirestorePagoSocio(pago = {}) {
  const data = cleanPagoSocioForFirestore(pago);
  if (!data.socioId || !data.meses.length) {
    throw { response: { status: 400, data: { detail: "Faltan datos para registrar el pago" } } };
  }
  if (!Number.isFinite(data.monto) || data.monto <= 0) {
    throw { response: { status: 400, data: { detail: "Ingresá un monto válido" } } };
  }
  const createdAt = getLocalDateTimeString();
  const ref = await addDoc(PAGOS_SOCIOS_COLLECTION_REF(), {
    ...data,
    createdAt,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });
  return normalizePagoSocioFirestore(ref.id, { ...data, createdAt });
}

async function deleteFirestorePagoSocio(id) {
  await deleteDoc(PAGO_SOCIO_DOC_REF(id));
}

async function deleteFirestorePagosSocioBySocio(socioId) {
  try {
    const snap = await getDocs(PAGOS_SOCIOS_COLLECTION_REF());
    const targets = snap.docs.filter((d) => d.data()?.socioId === socioId);
    await Promise.all(targets.map((d) => deleteDoc(PAGO_SOCIO_DOC_REF(d.id))));
  } catch (error) {
    console.warn("No se pudieron eliminar pagos del socio en Firestore.", error);
  }
}

function cleanActividadForFirestore(actividad = {}) {
  const a = normalizeActividad(actividad);
  if (!a) return null;
  const { id, ...data } = a;
  return data;
}

function normalizeConfig(config = {}) {
  return {
    ...clone(mockConfig),
    ...(config || {}),
    categorias: Array.isArray(config?.categorias) && config.categorias.length ? config.categorias : clone(mockConfig.categorias),
    actividades: normalizeActividades(config?.actividades || []),
    logoUrl: config?.logoUrl || mockConfig.logoUrl,
    cuotaMensual: Number(config?.cuotaMensual ?? mockConfig.cuotaMensual ?? 0),
  };
}

function publicConfig(config = {}) {
  const cfg = normalizeConfig(config);
  // Evitamos devolver timestamps de Firestore dentro de la UI porque no son necesarios para la app.
  const { actualizadoEn, creadoEn, ...clean } = cfg;
  return clean;
}

async function getFirestoreConfig(localConfig) {
  const fallback = publicConfig(localConfig || mockConfig);
  try {
    const snap = await getDoc(CONFIG_DOC_REF());
    if (!snap.exists()) {
      await setDoc(CONFIG_DOC_REF(), {
        ...fallback,
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp(),
      }, { merge: true });
      return fallback;
    }
    return publicConfig({ ...fallback, ...snap.data() });
  } catch (error) {
    console.warn("No se pudo leer configuración desde Firestore. Se usa configuración base temporal.", error);
    return fallback;
  }
}

async function saveFirestoreConfig(config) {
  const cfg = publicConfig(config);
  await setDoc(CONFIG_DOC_REF(), {
    ...cfg,
    actualizadoEn: serverTimestamp(),
  }, { merge: true });
  return cfg;
}

async function getFirestoreActivities(fallbackActivities = []) {
  const fallback = normalizeActividades(fallbackActivities || []);
  try {
    const snap = await getDocs(ACTIVIDADES_COLLECTION_REF());
    if (snap.empty) return [];
    const remote = snap.docs
      .map((d) => normalizeActividad({ id: d.id, ...d.data() }))
      .filter(Boolean);
    return normalizeActividades(remote);
  } catch (error) {
    console.warn("No se pudieron leer actividades desde Firestore. Se usa configuración general como respaldo temporal.", error);
    return fallback;
  }
}

async function syncFirestoreConfigActivities(actividades) {
  try {
    const current = await getFirestoreConfig(mockConfig);
    await saveFirestoreConfig({ ...current, actividades: normalizeActividades(actividades) });
  } catch (error) {
    console.warn("No se pudo sincronizar actividades dentro de configuracion/general.", error);
  }
}

async function createFirestoreActivity(body = {}) {
  const actividad = normalizeActividad({
    nombre: body.nombre,
    profesor: body.profesor || "A definir",
    cuotaMensual: Number(body.cuotaMensual || 0),
    diaVencimiento: body.diaVencimiento,
    recargoFueraTermino: body.recargoFueraTermino,
    estado: body.estado || "activa",
  });
  if (!actividad) throw { response: { status: 400, data: { detail: "El nombre de la actividad es obligatorio" } } };
  const ref = await addDoc(ACTIVIDADES_COLLECTION_REF(), {
    ...cleanActividadForFirestore(actividad),
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });
  return { ...actividad, id: ref.id };
}

async function updateFirestoreActivity(id, body = {}) {
  const data = cleanActividadForFirestore({ id, ...body });
  if (!data) throw { response: { status: 400, data: { detail: "El nombre de la actividad es obligatorio" } } };
  await updateDoc(ACTIVIDAD_DOC_REF(id), {
    ...data,
    actualizadoEn: serverTimestamp(),
  });
  return { id, ...data };
}

async function deleteFirestoreActivity(id) {
  await deleteDoc(ACTIVIDAD_DOC_REF(id));
}


function cleanAlumnoActividadForFirestore(alumno = {}) {
  const clean = normalizeAlumnoActividad(alumno);
  const { id, ...data } = clean;
  return data;
}

function alignAlumnoActividadToExistingActivities(alumno = {}, actividades = []) {
  const normalizedActivities = normalizeActividades(actividades);
  if (!normalizedActivities.length) return normalizeAlumnoActividad(alumno);

  const currentId = alumno.actividadId || "";
  if (normalizedActivities.some((a) => a.id === currentId)) return normalizeAlumnoActividad(alumno);

  const fallbackActividad = normalizeActividades(mockConfig.actividades).find((a) => a.id === currentId);
  const byName = fallbackActividad
    ? normalizedActivities.find((a) => String(a.nombre || "").toLowerCase() === String(fallbackActividad.nombre || "").toLowerCase())
    : null;

  return normalizeAlumnoActividad({
    ...alumno,
    actividadId: byName?.id || normalizedActivities[0]?.id || currentId,
  });
}

async function getFirestoreAlumnosActividades() {
  try {
    const snap = await getDocs(ALUMNOS_ACTIVIDADES_COLLECTION_REF());
    if (snap.empty) return [];

    return snap.docs
      .map((d, index) => normalizeAlumnoActividad({ id: d.id, ...d.data() }, index));
  } catch (error) {
    console.error("No se pudieron leer alumnos de actividades desde Firestore.", error);
    throw firestoreApiError(error, "No se pudieron leer alumnos de actividades desde Firebase.");
  }
}


async function createFirestoreAlumnoActividad(body = {}) {
  const hasExplicitId = !!body.id;
  const alumno = normalizeAlumnoActividad({
    ...body,
    id: hasExplicitId ? body.id : undefined,
    estado: body.estado || "activo",
    fechaAlta: body.fechaAlta || today(),
  });

  const data = {
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    dni: alumno.dni,
    fechaNacimiento: alumno.fechaNacimiento,
    direccion: alumno.direccion,
    obraSocial: alumno.obraSocial,
    actividadId: alumno.actividadId,
    tutorNombre: alumno.tutorNombre,
    tutorTelefono: alumno.tutorTelefono,
    fechaAlta: alumno.fechaAlta,
    estado: alumno.estado,
    fotoUrl: alumno.fotoUrl,
    fotoPublicId: alumno.fotoPublicId,
    autorizacionImagen: alumno.autorizacionImagen,
    observaciones: alumno.observaciones,
  };

  if (hasExplicitId) {
    const ref = ALUMNO_ACTIVIDAD_DOC_REF(alumno.id);
    await setDoc(ref, {
      ...data,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    }, { merge: true });
    return alumno;
  }

  const ref = await addDoc(ALUMNOS_ACTIVIDADES_COLLECTION_REF(), {
    ...data,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });

  return { ...alumno, id: ref.id };
}

async function updateFirestoreAlumnoActividad(id, body = {}) {
  const data = cleanAlumnoActividadForFirestore({ id, ...body });
  await updateDoc(ALUMNO_ACTIVIDAD_DOC_REF(id), {
    ...data,
    actualizadoEn: serverTimestamp(),
  });
  return { id, ...data };
}

async function bajaFirestoreAlumnoActividad(id) {
  await updateDoc(ALUMNO_ACTIVIDAD_DOC_REF(id), {
    estado: "baja",
    actualizadoEn: serverTimestamp(),
  });
}

async function deleteFirestoreAlumnoActividad(id) {
  await deleteDoc(ALUMNO_ACTIVIDAD_DOC_REF(id));
}

async function deleteFirestoreAlumnosByActividad(actividadId) {
  try {
    const snap = await getDocs(ALUMNOS_ACTIVIDADES_COLLECTION_REF());
    const targets = snap.docs.filter((d) => d.data()?.actividadId === actividadId);
    await Promise.all(targets.map((d) => deleteDoc(ALUMNO_ACTIVIDAD_DOC_REF(d.id))));
  } catch (error) {
    console.warn("No se pudieron eliminar alumnos de la actividad en Firestore.", error);
  }
}

function firestoreDateToString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000).toISOString();
  return String(value);
}

function normalizePagoActividadFirestore(id, data = {}) {
  return normalizePago({
    id,
    alumnoId: data.alumnoId || "",
    actividadId: data.actividadId || "",
    alumnoNombre: data.alumnoNombre || "",
    actividadNombre: data.actividadNombre || "",
    profesor: data.profesor || "",
    meses: Array.isArray(data.meses) ? data.meses.filter(Boolean) : [data.mes].filter(Boolean),
    monto: Number(data.monto || 0),
    fechaPago: data.fechaPago || today(),
    metodo: data.metodo || "efectivo",
    observacion: data.observacion || "",
    anulado: !!data.anulado,
    createdAt: data.createdAt || firestoreDateToString(data.creadoEn) || firestoreDateToString(data.actualizadoEn) || "",
  });
}

function cleanPagoActividadForFirestore(pago = {}) {
  const meses = Array.isArray(pago.meses) ? pago.meses.filter(Boolean) : [pago.mes].filter(Boolean);
  return {
    alumnoId: pago.alumnoId || "",
    actividadId: pago.actividadId || "",
    alumnoNombre: pago.alumnoNombre || "",
    actividadNombre: pago.actividadNombre || "",
    profesor: pago.profesor || "",
    meses,
    monto: Number(pago.monto || 0),
    montoBaseMensual: Number(pago.montoBaseMensual || 0),
    subtotalCuotas: Number(pago.subtotalCuotas || 0),
    recargoTotal: Number(pago.recargoTotal || 0),
    detalleRecargos: Array.isArray(pago.detalleRecargos) ? pago.detalleRecargos : [],
    diaVencimiento: pago.diaVencimiento || null,
    recargoFueraTermino: Number(pago.recargoFueraTermino || 0),
    fechaPago: pago.fechaPago || today(),
    metodo: normalizeMetodoPago(pago.metodo),
    observacion: pago.observacion || "",
    anulado: !!pago.anulado,
  };
}

async function getFirestorePagosActividades() {
  try {
    const snap = await getDocs(PAGOS_ACTIVIDADES_COLLECTION_REF());
    if (snap.empty) return [];

    return snap.docs
      .map((d) => normalizePagoActividadFirestore(d.id, d.data()))
      .filter((p) => !p.anulado)
      .sort(sortPagosDesc);
  } catch (error) {
    console.error("No se pudieron leer pagos de actividades desde Firestore.", error);
    throw firestoreApiError(error, "No se pudieron leer pagos de actividades desde Firebase.");
  }
}

async function createFirestorePagoActividad(pago = {}) {
  const data = cleanPagoActividadForFirestore(pago);
  if (!data.alumnoId || !data.actividadId || !data.meses.length) {
    throw { response: { status: 400, data: { detail: "Faltan datos para registrar el pago" } } };
  }
  const createdAt = getLocalDateTimeString();
  const ref = await addDoc(PAGOS_ACTIVIDADES_COLLECTION_REF(), {
    ...data,
    createdAt,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });
  return normalizePagoActividadFirestore(ref.id, { ...data, createdAt });
}

async function deleteFirestorePagoActividad(id) {
  await deleteDoc(PAGO_ACTIVIDAD_DOC_REF(id));
}

async function deleteFirestorePagosActividadByAlumno(alumnoId) {
  try {
    const snap = await getDocs(PAGOS_ACTIVIDADES_COLLECTION_REF());
    const targets = snap.docs.filter((d) => d.data()?.alumnoId === alumnoId);
    await Promise.all(targets.map((d) => deleteDoc(PAGO_ACTIVIDAD_DOC_REF(d.id))));
  } catch (error) {
    console.warn("No se pudieron eliminar pagos del alumno de actividad en Firestore.", error);
  }
}

async function snapshotFirestorePagosActividadByActividad(actividad = {}, alumnos = []) {
  try {
    const actividadId = actividad?.id;
    if (!actividadId) return;
    const snap = await getDocs(PAGOS_ACTIVIDADES_COLLECTION_REF());
    const alumnosById = new Map((alumnos || []).map((a) => [a.id, a]));
    const targets = snap.docs.filter((d) => d.data()?.actividadId === actividadId);

    await Promise.all(targets.map((d) => {
      const data = d.data() || {};
      const alumno = alumnosById.get(data.alumnoId) || {};
      const alumnoNombre = data.alumnoNombre || `${alumno.apellido || ""}, ${alumno.nombre || ""}`.replace(/^,\s*/, "") || "Alumno eliminado";
      return updateDoc(PAGO_ACTIVIDAD_DOC_REF(d.id), {
        alumnoNombre,
        actividadNombre: data.actividadNombre || actividad.nombre || "Actividad eliminada",
        profesor: data.profesor || actividad.profesor || "A definir",
        actualizadoEn: serverTimestamp(),
      });
    }));
  } catch (error) {
    console.warn("No se pudieron preservar los datos históricos de pagos de la actividad en Firestore.", error);
  }
}

function normalizeUserFirestore(id, data = {}) {
  const rawRole = String(data.rol || data.role || "consulta").trim().toLowerCase();
  const roleMap = {
    administrador: "admin",
    admin: "admin",
    secretaria: "secretaria",
    "secretaría": "secretaria",
    comision: "comision",
    "comisión": "comision",
    entrenador: "entrenador",
    profesor: "entrenador",
    consulta: "entrenador",
  };
  const role = roleMap[rawRole] || rawRole;
  return publicUser({
    id,
    uid: id,
    firebaseUid: id,
    name: data.nombre || data.name || data.email || "Usuario",
    nombre: data.nombre || data.name || data.email || "Usuario",
    email: String(data.email || "").toLowerCase(),
    role,
    rol: role,
    categoria: data.categoria || "",
    activo: data.activo !== false,
  });
}

async function getFirestoreUsers() {
  try {
    const snap = await getDocs(USUARIOS_COLLECTION_REF());
    return snap.docs
      .map((d) => normalizeUserFirestore(d.id, d.data()))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  } catch (error) {
    console.error("No se pudieron leer usuarios desde Firestore.", error);
    throw firestoreApiError(error, "No se pudieron leer usuarios desde Firebase.");
  }
}

async function createFirestoreUserProfile(body = {}) {
  const uid = String(body.uid || body.id || body.firebaseUid || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const nombre = String(body.nombre || body.name || "").trim();
  const rawRol = String(body.rol || body.role || "secretaria").trim().toLowerCase();
  const rolMap = { administrador: "admin", admin: "admin", secretaria: "secretaria", "secretaría": "secretaria", comision: "comision", "comisión": "comision", entrenador: "entrenador", profesor: "entrenador" };
  const rol = rolMap[rawRol] || rawRol;
  const allowedRoles = ["admin", "secretaria", "comision", "entrenador"];
  if (!uid) throw { response: { status: 400, data: { detail: "Pegá el UID del usuario creado en Firebase Authentication." } } };
  if (!email || !nombre) throw { response: { status: 400, data: { detail: "Nombre y email son obligatorios." } } };
  if (!allowedRoles.includes(rol)) throw { response: { status: 400, data: { detail: "Rol inválido." } } };
  if (rol === "entrenador" && !String(body.categoria || "").trim()) throw { response: { status: 400, data: { detail: "El entrenador debe tener una categoría asignada." } } };

  const data = {
    nombre,
    email,
    rol,
    categoria: rol === "entrenador" ? String(body.categoria || "").trim() : "",
    activo: body.activo !== false,
    actualizadoEn: serverTimestamp(),
  };
  await setDoc(USUARIO_DOC_REF(uid), data, { merge: true });
  return normalizeUserFirestore(uid, data);
}

async function deleteFirestoreUserProfile(id) {
  await deleteDoc(USUARIO_DOC_REF(id));
}

async function loadDb() {
  const db = loadLocalDb();
  const remoteConfig = await getFirestoreConfig(db.config);
  const remoteActivities = await getFirestoreActivities(remoteConfig.actividades || []);
  const remoteAlumnosActividades = await getFirestoreAlumnosActividades();
  const remotePagosActividades = await getFirestorePagosActividades();
  const remoteSocios = await getFirestoreSocios();
  const remotePagosSocios = await getFirestorePagosSocios();
  const remoteUsers = await getFirestoreUsers();
  db.config = { ...remoteConfig, actividades: remoteActivities };
  db.alumnosActividades = remoteAlumnosActividades;
  db.pagosActividades = remotePagosActividades;
  db.socios = remoteSocios;
  db.pagos = remotePagosSocios;
  db.users = remoteUsers;
  return db;
}


function getCurrentUser() {
  const raw = localStorage.getItem("cedi_user");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

function currentMonth() {
  return getCurrentLocalMonth();
}

function today() {
  return getTodayLocalDate();
}

const MONTH_LABELS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatMesApi(mesYm = "") {
  const [year, month] = String(mesYm).split("-");
  const index = Number(month) - 1;
  if (!year || index < 0 || index > 11) return String(mesYm || "-");
  return `${MONTH_LABELS_ES[index]} ${year}`;
}

function dueDateForMonth(mesYm, diaVencimiento) {
  const dia = normalizeDueDay(diaVencimiento, null);
  if (!mesYm || !dia) return null;
  return `${mesYm}-${String(dia).padStart(2, "0")}`;
}

function isLatePaymentMonth(mesYm, fechaPago, diaVencimiento) {
  const due = dueDateForMonth(mesYm, diaVencimiento);
  if (!due || !fechaPago) return false;
  return String(fechaPago) > due;
}

function isInitialMonthAfterDueExempt(mesYm, fechaAlta, diaVencimiento) {
  const due = dueDateForMonth(mesYm, diaVencimiento);
  if (!due || !fechaAlta) return false;
  const alta = String(fechaAlta).slice(0, 10);
  return alta.slice(0, 7) === mesYm && alta > due;
}

function recargoActividadPorMes(actividad = {}, mesYm, fechaPago, fechaAlta = null) {
  const recargo = Number(actividad?.recargoFueraTermino || 0);
  if (!recargo || !isLatePaymentMonth(mesYm, fechaPago, actividad?.diaVencimiento)) return 0;
  // Si el alumno se inscribe después del vencimiento, no se cobra recargo en su primer mes.
  if (isInitialMonthAfterDueExempt(mesYm, fechaAlta, actividad?.diaVencimiento)) return 0;
  return recargo;
}

function cuotaActividadVencida(actividad = {}, meses = [], fechaReferencia = today(), fechaAlta = null) {
  return (meses || []).some((mes) => (
    isLatePaymentMonth(mes, fechaReferencia, actividad?.diaVencimiento)
    && !isInitialMonthAfterDueExempt(mes, fechaAlta, actividad?.diaVencimiento)
  ));
}

function calcularTotalPagoActividad(actividad = {}, meses = [], fechaPago = today(), montoBaseMensual = null, fechaAlta = null) {
  const base = Number(montoBaseMensual ?? actividad?.cuotaMensual ?? 0);
  const detalleRecargos = (meses || []).map((mes) => ({
    mes,
    recargo: recargoActividadPorMes(actividad, mes, fechaPago, fechaAlta),
  })).filter((x) => x.recargo > 0);
  const recargoTotal = detalleRecargos.reduce((sum, item) => sum + item.recargo, 0);
  return {
    montoBaseMensual: base,
    subtotalCuotas: base * (meses || []).length,
    recargoTotal,
    total: base * (meses || []).length + recargoTotal,
    detalleRecargos,
  };
}

function monthsBetween(startYm, endYm) {
  let [y, m] = startYm.split("-").map(Number);
  const [ey, em] = endYm.split("-").map(Number);
  const out = [];
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { y += 1; m = 1; }
  }
  return out;
}

function paidMonthsFor(db, socioId) {
  const set = new Set();
  (db.pagos || [])
    .filter((p) => p.socioId === socioId && !p.anulado)
    .forEach((p) => (p.meses || []).forEach((m) => set.add(m)));
  return set;
}

function paidMonthsActividadFor(db, alumnoId) {
  const set = new Set();
  (db.pagosActividades || [])
    .filter((p) => p.alumnoId === alumnoId && !p.anulado)
    .forEach((p) => (p.meses || []).forEach((m) => set.add(m)));
  return set;
}

function duplicatedMonths(selectedMonths = [], paidMonthsSet = new Set()) {
  return [...new Set(selectedMonths.filter((m) => paidMonthsSet.has(m)))].sort();
}

function actividadById(db, id) {
  return normalizeActividades(db.config.actividades || []).find((a) => a.id === id) || null;
}

function enrichAlumnoActividad(db, alumno) {
  const a = actividadById(db, alumno.actividadId) || {};
  const paid = paidMonthsActividadFor(db, alumno.id);
  const start = (alumno.fechaAlta || today()).slice(0, 7);
  const now = currentMonth();
  const meses = alumno.estado === "baja" || start > now ? [] : monthsBetween(start, now).filter((m) => !paid.has(m));
  const cuota = Number(a.cuotaMensual || 0);
  const deudaCalculo = calcularTotalPagoActividad(a, meses, today(), cuota, alumno.fechaAlta);
  const cuotaVencida = cuotaActividadVencida(a, meses, today(), alumno.fechaAlta);
  return {
    ...clone(alumno),
    actividadNombre: a.nombre || "Sin actividad",
    profesor: a.profesor || "A definir",
    cuotaMensual: cuota,
    diaVencimiento: a.diaVencimiento || null,
    recargoFueraTermino: Number(a.recargoFueraTermino || 0),
    mesesAdeudados: meses,
    mesesPagados: Array.from(paid).sort(),
    deudaSubtotalCuotas: deudaCalculo.subtotalCuotas,
    deudaRecargoTotal: deudaCalculo.recargoTotal,
    deudaTotal: deudaCalculo.total,
    cuotaVencida,
    cuotaVencidaTexto: cuotaVencida ? `Vencida desde el día ${a.diaVencimiento}` : "",
    estadoCuota: meses.length ? "con_deuda" : "al_dia",
  };
}

function withAlumnoActividadInfo(db, pago) {
  const p = clone(pago);
  const alumno = (db.alumnosActividades || []).find((x) => x.id === p.alumnoId) || {};
  const act = actividadById(db, p.actividadId) || actividadById(db, alumno.actividadId) || {};
  const alumnoNombreActual = `${alumno.apellido || ""}, ${alumno.nombre || ""}`.replace(/^,\s*/, "");
  p.alumnoNombre = alumnoNombreActual || p.alumnoNombre || "Alumno eliminado";
  p.actividadNombre = act.nombre || p.actividadNombre || "Actividad eliminada";
  p.profesor = act.profesor || p.profesor || "A definir";
  p.diaVencimiento = act.diaVencimiento || p.diaVencimiento || null;
  p.recargoFueraTermino = Number(act.recargoFueraTermino || p.recargoFueraTermino || 0);
  return p;
}

function enrichSocio(db, socio, user = getCurrentUser()) {
  const s = clone(socio);
  const paid = paidMonthsFor(db, s.id);
  const start = (s.fechaAlta || today()).slice(0, 7);
  const now = currentMonth();
  const meses = s.estado === "baja" || start > now ? [] : monthsBetween(start, now).filter((m) => !paid.has(m));
  s.mesesAdeudados = meses;
  s.mesesPagados = Array.from(paid).sort();
  s.deudaTotal = meses.length * Number(db.config.cuotaMensual || 0);
  s.estadoCuota = meses.length ? "con_deuda" : "al_dia";
  s.actividad = "";
  if (user && !["admin", "secretaria"].includes(user.role)) {
    s.dni = "";
    s.direccion = "";
    s.obraSocial = "";
    s.observaciones = "";
    if (user.role === "entrenador") s.tutorEmail = "";
  }
  return s;
}

function parseQuery(path) {
  const [pathname, qs = ""] = path.split("?");
  const params = Object.fromEntries(new URLSearchParams(qs));
  return { pathname, params };
}

function withSocioInfo(db, pago) {
  const p = clone(pago);
  const s = db.socios.find((x) => x.id === p.socioId) || {};
  p.socioNombre = `${s.apellido || ""}, ${s.nombre || ""}`.replace(/^,\s*/, "");
  p.socioNumero = s.numeroSocio;
  p.socioCategoria = s.categoria;
  return p;
}

function requireLogin() {
  const user = getCurrentUser();
  if (!user) throw { response: { status: 401, data: { detail: "No autenticado" } } };
  return user;
}

function requireRole(user, roles) {
  if (!roles.includes(user.role)) throw { response: { status: 403, data: { detail: "Permiso denegado" } } };
}

const api = {
  async get(path, options = {}) {
    const db = await loadDb();
    const { pathname, params: queryParams } = parseQuery(path);
    const params = { ...queryParams, ...(options.params || {}) };
    const user = getCurrentUser();

    if (pathname === "/auth/me") return ok(publicUser(requireLogin()));
    if (pathname === "/config") return ok(clone(db.config));
    if (pathname === "/actividades") { requireLogin(); return ok(normalizeActividades(db.config.actividades)); }
    if (pathname.startsWith("/actividades/alumnos/")) {
      requireLogin();
      const id = pathname.split("/").pop();
      const alumno = (db.alumnosActividades || []).find((a) => a.id === id);
      if (!alumno) throw { response: { status: 404, data: { detail: "Alumno no encontrado" } } };
      const out = enrichAlumnoActividad(db, alumno);
      out.pagos = (db.pagosActividades || [])
        .filter((p) => p.alumnoId === id)
        .sort(sortPagosDesc)
        .map((p) => withAlumnoActividadInfo(db, p));
      return ok(out);
    }
    if (pathname === "/actividades/alumnos") {
      requireLogin();
      let alumnos = (db.alumnosActividades || []).map((a) => enrichAlumnoActividad(db, a));
      if (params.actividadId && params.actividadId !== "todas") alumnos = alumnos.filter((a) => a.actividadId === params.actividadId);
      if (params.estado && params.estado !== "todos") alumnos = alumnos.filter((a) => a.estado === params.estado);
      if (params.search) {
        const q = params.search.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        alumnos = alumnos.filter((a) => `${a.nombre} ${a.apellido} ${a.tutorNombre} ${a.actividadNombre}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q));
      }
      return ok(alumnos.sort((a, b) => (a.apellido || "").localeCompare(b.apellido || "")));
    }
    if (pathname === "/actividades/pagos") {
      requireLogin();
      let pagos = (db.pagosActividades || []).map((p) => withAlumnoActividadInfo(db, p));
      if (params.actividadId && params.actividadId !== "todas") pagos = pagos.filter((p) => p.actividadId === params.actividadId);
      if (params.alumnoId) pagos = pagos.filter((p) => p.alumnoId === params.alumnoId);
      return ok(pagos.sort(sortPagosDesc));
    }
    if (pathname === "/users") { requireRole(requireLogin(), ["admin"]); return ok(db.users.map(publicUser)); }

    if (pathname === "/dashboard") {
      requireLogin();
      const socios = db.socios.map((s) => enrichSocio(db, s, user));
      const activos = socios.filter((s) => s.estado === "activo");
      const actual = currentMonth();
      const pagosSociosMes = db.pagos.filter((p) => (p.fechaPago || "").startsWith(actual));
      const pagosActividadesMes = (db.pagosActividades || []).filter((p) => (p.fechaPago || "").startsWith(actual));
      const pagosMes = [...pagosSociosMes, ...pagosActividadesMes];
      const deudaPorCat = {};
      activos.forEach((s) => { if (s.deudaTotal > 0) deudaPorCat[s.categoria] = (deudaPorCat[s.categoria] || 0) + s.deudaTotal; });
      const ultimosPagos = [
        ...db.pagos.map((p) => ({ ...withSocioInfo(db, p), tipoLabel: "Socio" })),
        ...(db.pagosActividades || []).map((p) => ({ ...withAlumnoActividadInfo(db, p), socioNombre: withAlumnoActividadInfo(db, p).alumnoNombre, socioNumero: "Act.", tipoLabel: "Actividad" })),
      ].sort(sortPagosDesc).slice(0, 8);
      return ok({
        mesActual: actual,
        sociosActivos: activos.length,
        sociosInactivos: socios.filter((s) => s.estado === "inactivo").length,
        sociosBaja: socios.filter((s) => s.estado === "baja").length,
        sociosConDeuda: activos.filter((s) => s.estadoCuota === "con_deuda").length,
        recaudacionMes: pagosMes.reduce((a, p) => a + Number(p.monto || 0), 0),
        pagosMes: pagosMes.length,
        ultimosPagos,
        categoriasConDeuda: Object.entries(deudaPorCat).map(([categoria, deuda]) => ({ categoria, deuda })).sort((a, b) => b.deuda - a.deuda),
      });
    }

    if (pathname === "/socios") {
      const u = requireLogin();
      let socios = db.socios;
      if (u.role === "entrenador") socios = u.categoria ? socios.filter((s) => s.categoria === u.categoria) : [];
      if (params.categoria && params.categoria !== "todas") socios = socios.filter((s) => s.categoria === params.categoria);
      if (params.estado && params.estado !== "todos") socios = socios.filter((s) => s.estado === params.estado);
      if (params.search) {
        const q = params.search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        socios = socios.filter((s) => `${s.nombre} ${s.apellido} ${s.numeroSocio} ${s.dni}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q));
      }
      let out = socios.map((s) => enrichSocio(db, s, u)).sort((a, b) => Number(b.numeroSocio || 0) - Number(a.numeroSocio || 0));
      if (params.estadoCuota && params.estadoCuota !== "todos") out = out.filter((s) => s.estadoCuota === params.estadoCuota);
      return ok(out);
    }

    if (pathname.startsWith("/socios/")) {
      const u = requireLogin();
      const id = pathname.split("/").pop();
      const socio = db.socios.find((s) => s.id === id);
      if (!socio) throw { response: { status: 404, data: { detail: "Socio no encontrado" } } };
      if (u.role === "entrenador" && (!u.categoria || socio.categoria !== u.categoria)) {
        throw { response: { status: 403, data: { detail: "Solo podés ver carnets de tu categoría asignada." } } };
      }
      const out = enrichSocio(db, socio, u);
      out.pagos = u.role === "entrenador" ? [] : db.pagos.filter((p) => p.socioId === id).sort(sortPagosDesc).map((p) => withSocioInfo(db, p));
      return ok(out);
    }

    if (pathname === "/pagos") {
      requireLogin();
      let pagos = db.pagos.map((p) => withSocioInfo(db, p));
      if (params.socioId) pagos = pagos.filter((p) => p.socioId === params.socioId);
      if (params.metodo && params.metodo !== "todos") pagos = pagos.filter((p) => p.metodo === params.metodo);
      if (params.categoria && params.categoria !== "todas") pagos = pagos.filter((p) => p.socioCategoria === params.categoria);
      if (params.mes) pagos = pagos.filter((p) => (p.meses || []).includes(params.mes));
      if (params.desde) pagos = pagos.filter((p) => p.fechaPago >= params.desde);
      if (params.hasta) pagos = pagos.filter((p) => p.fechaPago <= params.hasta);
      return ok(pagos.sort(sortPagosDesc));
    }

    if (pathname === "/cuotas") {
      const u = requireLogin();
      const anio = Number(params.anio || new Date().getFullYear());
      let socios = db.socios.filter((s) => s.estado !== "baja");
      if (u.role === "entrenador") socios = u.categoria ? socios.filter((s) => s.categoria === u.categoria) : [];
      if (params.categoria && params.categoria !== "todas") socios = socios.filter((s) => s.categoria === params.categoria);
      const meses = Array.from({ length: 12 }, (_, i) => `${anio}-${String(i + 1).padStart(2, "0")}`);
      const actual = currentMonth();
      const rows = socios.map((s) => {
        const paid = paidMonthsFor(db, s.id);
        const fa = (s.fechaAlta || today()).slice(0, 7);
        const estados = {};
        meses.forEach((m) => {
          estados[m] = m < fa ? "na" : m > actual ? "futuro" : paid.has(m) ? "pagado" : "pendiente";
        });
        return { socioId: s.id, numeroSocio: s.numeroSocio, nombre: s.nombre, apellido: s.apellido, categoria: s.categoria, estado: s.estado, meses: estados };
      });
      return ok({ anio, meses, rows });
    }

    if (pathname === "/deudores") {
      requireLogin();
      let socios = db.socios.filter((s) => s.estado === "activo").map((s) => enrichSocio(db, s, user)).filter((s) => s.mesesAdeudados.length);
      if (params.categoria && params.categoria !== "todas") socios = socios.filter((s) => s.categoria === params.categoria);
      return ok(socios.map((s) => ({
        id: s.id, numeroSocio: s.numeroSocio, nombre: s.nombre, apellido: s.apellido, categoria: s.categoria,
        tutorNombre: s.tutorNombre, tutorTelefono: s.tutorTelefono, mesesAdeudados: s.mesesAdeudados,
        cantidadMeses: s.mesesAdeudados.length, deudaTotal: s.deudaTotal,
      })).sort((a, b) => b.cantidadMeses - a.cantidadMeses));
    }

    if (pathname.startsWith("/public/carnet/")) {
      const parts = pathname.split("/").filter(Boolean);
      const tipo = parts.length === 4 ? parts[2] : "socio";
      const id = parts.length === 4 ? parts[3] : parts[2];

      if (tipo === "actividad") {
        const alumno = (db.alumnosActividades || []).find((a) => a.id === id);
        if (!alumno) throw { response: { status: 404, data: { detail: "Alumno no encontrado" } } };
        const a = enrichAlumnoActividad(db, alumno);
        return ok({
          tipo: "actividad", nombre: a.nombre, apellido: a.apellido, actividadNombre: a.actividadNombre, profesor: a.profesor,
          estado: a.estado, estadoCuota: a.estadoCuota, cantidadMesesAdeudados: a.mesesAdeudados.length,
          fechaEmision: today(), nombreClub: db.config.nombreClub, logoUrl: db.config.logoUrl,
          linkPago: db.config.linkPago, aliasPago: db.config.aliasPago,
          fotoUrl: a.fotoUrl || "", fotoPublicId: a.fotoPublicId || "", autorizacionImagen: !!a.autorizacionImagen,
        });
      }

      const socio = db.socios.find((s) => s.id === id);
      if (!socio) throw { response: { status: 404, data: { detail: "Socio no encontrado" } } };
      const s = enrichSocio(db, socio, { role: "public" });
      return ok({
        tipo: "socio", numeroSocio: s.numeroSocio, nombre: s.nombre, apellido: s.apellido, categoria: s.categoria,
        estado: s.estado, estadoCuota: s.estadoCuota, cantidadMesesAdeudados: s.mesesAdeudados.length,
        fechaEmision: today(), nombreClub: db.config.nombreClub, logoUrl: db.config.logoUrl,
        linkPago: db.config.linkPago, aliasPago: db.config.aliasPago,
        fotoUrl: s.fotoUrl || "", fotoPublicId: s.fotoPublicId || "", autorizacionImagen: !!s.autorizacionImagen,
      });
    }

    throw { response: { status: 404, data: { detail: `Endpoint no implementado: ${pathname}` } } };
  },

  async post(path, body = {}) {
    const db = await loadDb();
    const { pathname, params } = parseQuery(path);

    if (pathname === "/auth/login" || pathname === "/auth/logout") {
      throw { response: { status: 410, data: { detail: "El login local fue deshabilitado. Usá Firebase Authentication." } } };
    }

    const u = requireLogin();
    if (pathname === "/users") {
      requireRole(u, ["admin"]);
      try {
        const newUser = await createFirestoreUserProfile(body);
        return ok(newUser);
      } catch (error) {
        if (error?.response) throw error;
        throw firestoreApiError(error, "No se pudo guardar el perfil de usuario.");
      }
    }
    if (pathname === "/actividades") {
      requireRole(u, ["admin", "secretaria"]);
      const nombre = String(body.nombre || "").trim();
      const profesor = String(body.profesor || "A definir").trim() || "A definir";
      const cuotaMensual = Number(body.cuotaMensual || 0);
      const esHockey = isHockeyName(nombre);
      const diaVencimiento = normalizeDueDay(body.diaVencimiento, esHockey ? 10 : null);
      const recargoFueraTermino = normalizeMoney(body.recargoFueraTermino, esHockey ? 3000 : 0);
      if (!nombre) throw { response: { status: 400, data: { detail: "El nombre de la actividad es obligatorio" } } };
      if (/^f[úu]tbol$/i.test(nombre)) throw { response: { status: 400, data: { detail: "Fútbol no se carga en este módulo de actividades" } } };
      const actuales = normalizeActividades(db.config.actividades);
      if (actuales.some((a) => a.nombre.toLowerCase() === nombre.toLowerCase())) throw { response: { status: 400, data: { detail: "La actividad ya existe" } } };
      let actividad;
      try {
        actividad = await createFirestoreActivity({ nombre, profesor, cuotaMensual, diaVencimiento, recargoFueraTermino, estado: body.estado || "activa" });
      } catch (error) {
        throw firestoreApiError(error, "No se pudo crear la actividad en Firebase.");
      }
      db.config.actividades = normalizeActividades([...actuales, actividad]);
      await syncFirestoreConfigActivities(db.config.actividades);
      saveDb(db); return ok(actividad);
    }
    if (pathname === "/actividades/alumnos") {
      requireRole(u, ["admin", "secretaria"]);
      const nombre = String(body.nombre || "").trim();
      const apellido = String(body.apellido || "").trim();
      const actividadId = String(body.actividadId || "");
      if (!nombre || !apellido) throw { response: { status: 400, data: { detail: "Nombre y apellido son obligatorios" } } };
      if (!actividadById(db, actividadId)) throw { response: { status: 400, data: { detail: "Elegí una actividad válida" } } };
      let alumno;
      try {
        alumno = await createFirestoreAlumnoActividad({ nombre, apellido, actividadId, ...body });
      } catch (error) {
        throw firestoreApiError(error, "No se pudo crear el alumno en Firebase.");
      }
      db.alumnosActividades = [...(db.alumnosActividades || []).filter((a) => a.id !== alumno.id), alumno];
      saveDb(db); return ok(enrichAlumnoActividad(db, alumno));
    }
    if (pathname === "/actividades/pagos") {
      requireRole(u, ["admin", "secretaria"]);
      const alumno = (db.alumnosActividades || []).find((a) => a.id === body.alumnoId);
      if (!alumno) throw { response: { status: 404, data: { detail: "Alumno no encontrado" } } };
      const actividad = actividadById(db, body.actividadId || alumno.actividadId);
      if (!actividad) throw { response: { status: 400, data: { detail: "Actividad inválida" } } };
      const meses = Array.isArray(body.meses) ? body.meses.filter(Boolean) : [body.mes].filter(Boolean);
      if (!meses.length) throw { response: { status: 400, data: { detail: "Seleccioná al menos un mes" } } };
      const mesesDuplicados = duplicatedMonths(meses, paidMonthsActividadFor(db, alumno.id));
      if (mesesDuplicados.length) {
        throw { response: { status: 400, data: { detail: `No se puede registrar el pago. Ya existe un pago para: ${mesesDuplicados.map(formatMesApi).join(", ")}. Para corregirlo, primero anulá el pago anterior desde el historial.` } } };
      }
      const montoPorMes = Number(body.monto || actividad.cuotaMensual || 0);
      if (!Number.isFinite(montoPorMes) || montoPorMes <= 0) throw { response: { status: 400, data: { detail: "Ingresá un monto válido" } } };
      const fechaPago = body.fechaPago || today();
      const calculoPago = calcularTotalPagoActividad(actividad, meses, fechaPago, montoPorMes, alumno.fechaAlta);
      let pago;
      try {
        pago = await createFirestorePagoActividad({
          alumnoId: alumno.id,
          actividadId: actividad.id,
          alumnoNombre: `${alumno.apellido || ""}, ${alumno.nombre || ""}`.replace(/^,\s*/, ""),
          actividadNombre: actividad.nombre || "Actividad",
          profesor: actividad.profesor || "A definir",
          meses,
          monto: calculoPago.total,
          montoBaseMensual: calculoPago.montoBaseMensual,
          subtotalCuotas: calculoPago.subtotalCuotas,
          recargoTotal: calculoPago.recargoTotal,
          detalleRecargos: calculoPago.detalleRecargos,
          diaVencimiento: actividad.diaVencimiento || null,
          recargoFueraTermino: Number(actividad.recargoFueraTermino || 0),
          fechaPago,
          metodo: normalizeMetodoPago(body.metodo),
          observacion: body.observacion || "",
        });
      } catch (error) {
        throw firestoreApiError(error, "No se pudo registrar el pago de actividad en Firebase.");
      }
      db.pagosActividades = [...(db.pagosActividades || []).filter((p) => p.id !== pago.id), pago];
      saveDb(db); return ok(withAlumnoActividadInfo(db, pago));
    }
    if (pathname === "/socios") {
      requireRole(u, ["admin", "secretaria"]);
      const nombre = String(body.nombre || "").trim();
      const apellido = String(body.apellido || "").trim();
      if (!nombre || !apellido) throw { response: { status: 400, data: { detail: "Nombre y apellido son obligatorios" } } };
      let socio;
      try {
        socio = await createFirestoreSocio({ ...body, nombre, apellido, actividad: "" });
      } catch (error) {
        throw firestoreApiError(error, "No se pudo crear el socio en Firebase.");
      }
      db.socios = [socio, ...db.socios.filter((s) => s.id !== socio.id)];
      saveDb(db); return ok(enrichSocio(db, socio, u));
    }
    if (pathname === "/pagos") {
      requireRole(u, ["admin", "secretaria"]);
      const socio = db.socios.find((s) => s.id === body.socioId);
      if (!socio) throw { response: { status: 404, data: { detail: "Socio no encontrado" } } };
      const meses = Array.isArray(body.meses) ? body.meses.filter(Boolean) : [body.mes].filter(Boolean);
      if (!meses.length) throw { response: { status: 400, data: { detail: "Seleccioná al menos un mes" } } };
      const mesesDuplicados = duplicatedMonths(meses, paidMonthsFor(db, socio.id));
      if (mesesDuplicados.length) {
        throw { response: { status: 400, data: { detail: `No se puede registrar el pago. Ya existe un pago para: ${mesesDuplicados.map(formatMesApi).join(", ")}. Para corregirlo, primero anulá el pago anterior desde el historial.` } } };
      }
      const montoTotal = Number(body.monto || db.config.cuotaMensual || 0);
      if (!Number.isFinite(montoTotal) || montoTotal <= 0) throw { response: { status: 400, data: { detail: "Ingresá un monto válido" } } };
      let pago;
      try {
        pago = await createFirestorePagoSocio({
          socioId: socio.id,
          meses,
          monto: montoTotal,
          fechaPago: body.fechaPago || today(),
          metodo: normalizeMetodoPago(body.metodo),
          comprobanteUrl: body.comprobanteUrl || "",
          observacion: body.observacion || "",
          esPagoAnual: !!body.esPagoAnual,
        });
      } catch (error) {
        throw firestoreApiError(error, "No se pudo registrar el pago de socio en Firebase.");
      }
      db.pagos = [pago, ...db.pagos.filter((p) => p.id !== pago.id)];
      saveDb(db); return ok(withSocioInfo(db, pago));
    }
    if (pathname === "/cuotas/marcar") {
      requireRole(u, ["admin", "secretaria"]);
      const { socioId, mes } = params;
      if (!db.socios.some((s) => s.id === socioId)) throw { response: { status: 404, data: { detail: "Socio no encontrado" } } };
      if (paidMonthsFor(db, socioId).has(mes)) throw { response: { status: 400, data: { detail: "Mes ya pagado" } } };
      let pago;
      try {
        pago = await createFirestorePagoSocio({ socioId, meses: [mes], monto: Number(db.config.cuotaMensual || 0), fechaPago: today(), metodo: "efectivo", observacion: `Marcado desde cuotas - ${mes}`, comprobanteUrl: "" });
      } catch (error) {
        throw firestoreApiError(error, "No se pudo marcar la cuota en Firebase.");
      }
      db.pagos = [pago, ...db.pagos.filter((p) => p.id !== pago.id)];
      saveDb(db); return ok(withSocioInfo(db, pago));
    }
    throw { response: { status: 404, data: { detail: `Endpoint no implementado: ${pathname}` } } };
  },

  async put(path, body = {}) {
    const db = await loadDb();
    const { pathname } = parseQuery(path);
    const u = requireLogin();
    if (pathname.startsWith("/users/")) {
      requireRole(u, ["admin"]);
      const id = pathname.split("/").pop();
      try {
        const updated = await createFirestoreUserProfile({ ...body, uid: id });
        return ok(updated);
      } catch (error) {
        if (error?.response) throw error;
        throw firestoreApiError(error, "No se pudo actualizar el perfil de usuario.");
      }
    }
    if (pathname === "/config") {
      requireRole(u, ["admin"]);
      db.config = publicConfig({ ...db.config, ...body, actividades: normalizeActividades(body.actividades || db.config.actividades) });
      await saveFirestoreConfig(db.config);
      saveDb(db);
      return ok(clone(db.config));
    }
    if (pathname.startsWith("/actividades/alumnos/")) {
      requireRole(u, ["admin", "secretaria"]);
      const id = pathname.split("/").pop();
      const idx = (db.alumnosActividades || []).findIndex((a) => a.id === id);
      if (idx < 0) throw { response: { status: 404, data: { detail: "Alumno no encontrado" } } };
      if (body.actividadId && !actividadById(db, body.actividadId)) throw { response: { status: 400, data: { detail: "Actividad inválida" } } };
      const updated = normalizeAlumnoActividad({ ...db.alumnosActividades[idx], ...body }, idx);
      try {
        await updateFirestoreAlumnoActividad(id, updated);
      } catch (error) {
        throw firestoreApiError(error, "No se pudo actualizar el alumno en Firebase.");
      }
      db.alumnosActividades[idx] = updated;
      saveDb(db); return ok(enrichAlumnoActividad(db, db.alumnosActividades[idx]));
    }
    if (pathname.startsWith("/actividades/")) {
      requireRole(u, ["admin", "secretaria"]);
      const id = pathname.split("/").pop();
      const actuales = normalizeActividades(db.config.actividades);
      const idx = actuales.findIndex((a) => a.id === id);
      if (idx < 0) throw { response: { status: 404, data: { detail: "Actividad no encontrada" } } };
      const anterior = actuales[idx];
      const nombre = String(body.nombre ?? anterior.nombre).trim();
      const profesor = String(body.profesor ?? anterior.profesor).trim() || "A definir";
      const cuotaMensual = Number(body.cuotaMensual ?? anterior.cuotaMensual ?? 0);
      const esHockey = isHockeyName(nombre);
      const diaVencimiento = normalizeDueDay(body.diaVencimiento ?? anterior.diaVencimiento, esHockey ? 10 : null);
      const recargoFueraTermino = normalizeMoney(body.recargoFueraTermino ?? anterior.recargoFueraTermino, esHockey ? 3000 : 0);
      const estado = String(body.estado ?? anterior.estado ?? "activa");
      if (!nombre) throw { response: { status: 400, data: { detail: "El nombre de la actividad es obligatorio" } } };
      if (/^f[úu]tbol$/i.test(nombre)) throw { response: { status: 400, data: { detail: "Fútbol no se carga en este módulo de actividades" } } };
      if (actuales.some((a) => a.id !== id && a.nombre.toLowerCase() === nombre.toLowerCase())) throw { response: { status: 400, data: { detail: "La actividad ya existe" } } };
      const updated = { ...anterior, nombre, profesor, cuotaMensual, diaVencimiento, recargoFueraTermino, estado };
      try {
        await updateFirestoreActivity(id, updated);
      } catch (error) {
        throw firestoreApiError(error, "No se pudo actualizar la actividad en Firebase.");
      }
      actuales[idx] = updated;
      db.config.actividades = normalizeActividades(actuales);
      await syncFirestoreConfigActivities(db.config.actividades);
      saveDb(db); return ok(updated);
    }
    if (pathname.startsWith("/socios/")) {
      requireRole(u, ["admin", "secretaria"]);
      const id = pathname.split("/").pop();
      const idx = db.socios.findIndex((s) => s.id === id);
      if (idx < 0) throw { response: { status: 404, data: { detail: "Socio no encontrado" } } };
      const updated = normalizeSocio({ ...db.socios[idx], ...body, actividad: "" }, idx);
      try {
        await updateFirestoreSocio(id, updated);
      } catch (error) {
        throw firestoreApiError(error, "No se pudo actualizar el socio en Firebase.");
      }
      db.socios[idx] = updated;
      saveDb(db); return ok(enrichSocio(db, db.socios[idx], u));
    }
    throw { response: { status: 404, data: { detail: `Endpoint no implementado: ${pathname}` } } };
  },

  async delete(path) {
    const db = await loadDb();
    const { pathname } = parseQuery(path);
    const u = requireLogin();
    if (pathname.startsWith("/users/")) {
      requireRole(u, ["admin"]);
      const id = pathname.split("/").pop();
      try {
        await deleteFirestoreUserProfile(id);
        return ok({ ok: true });
      } catch (error) {
        throw firestoreApiError(error, "No se pudo eliminar el perfil de usuario.");
      }
    }
    if (pathname.startsWith("/actividades/pagos/")) {
      requireRole(u, ["admin", "secretaria"]);
      const id = pathname.split("/").pop();
      const exists = (db.pagosActividades || []).some((p) => p.id === id);
      if (!exists) throw { response: { status: 404, data: { detail: "Pago de actividad no encontrado" } } };
      try {
        await deleteFirestorePagoActividad(id);
      } catch (error) {
        throw firestoreApiError(error, "No se pudo anular el pago de actividad en Firebase.");
      }
      db.pagosActividades = (db.pagosActividades || []).filter((p) => p.id !== id);
      saveDb(db); return ok({ ok: true });
    }
    if (pathname.startsWith("/actividades/alumnos/")) {
      requireRole(u, ["admin", "secretaria"]);
      const parts = pathname.split("/").filter(Boolean);
      const id = parts[2];
      const permanente = parts[3] === "permanente";
      const alumno = (db.alumnosActividades || []).find((a) => a.id === id);
      if (!alumno) throw { response: { status: 404, data: { detail: "Alumno no encontrado" } } };
      if (permanente) {
        if (alumno.estado !== "baja") throw { response: { status: 400, data: { detail: "Solo se puede eliminar definitivamente un alumno dado de baja" } } };
        try {
          await deleteFirestoreAlumnoActividad(id);
          await deleteFirestorePagosActividadByAlumno(id);
        } catch (error) {
          throw firestoreApiError(error, "No se pudo eliminar el alumno en Firebase.");
        }
        db.alumnosActividades = (db.alumnosActividades || []).filter((a) => a.id !== id);
        db.pagosActividades = (db.pagosActividades || []).filter((p) => p.alumnoId !== id);
      } else {
        try {
          await bajaFirestoreAlumnoActividad(id);
        } catch (error) {
          throw firestoreApiError(error, "No se pudo dar de baja el alumno en Firebase.");
        }
        db.alumnosActividades = (db.alumnosActividades || []).map((a) => a.id === id ? { ...a, estado: "baja" } : a);
      }
      saveDb(db); return ok({ ok: true });
    }
    if (pathname.startsWith("/actividades/")) {
      requireRole(u, ["admin", "secretaria"]);
      const id = pathname.split("/").pop();
      const actividad = normalizeActividades(db.config.actividades).find((a) => a.id === id);
      if (!actividad) throw { response: { status: 404, data: { detail: "Actividad no encontrada" } } };
      try {
        // Antes de eliminar la actividad y sus alumnos, guardamos una foto histórica
        // dentro de cada pago. Así la recaudación pasada no cambia ni desaparece.
        await snapshotFirestorePagosActividadByActividad(actividad, db.alumnosActividades || []);
        await deleteFirestoreActivity(id);
        await deleteFirestoreAlumnosByActividad(actividad.id);
        db.config.actividades = normalizeActividades(db.config.actividades).filter((a) => a.id !== id);
        await syncFirestoreConfigActivities(db.config.actividades);
      } catch (error) {
        throw firestoreApiError(error, "No se pudo eliminar la actividad en Firebase.");
      }
      db.alumnosActividades = (db.alumnosActividades || []).filter((a) => a.actividadId !== actividad.id);
      db.pagosActividades = (db.pagosActividades || []).map((p) => p.actividadId === actividad.id ? withAlumnoActividadInfo(db, p) : p);
      saveDb(db); return ok({ ok: true });
    }
    if (pathname.startsWith("/socios/")) {
      const parts = pathname.split("/").filter(Boolean);
      const id = parts[1];
      const permanente = parts[2] === "permanente";
      if (permanente) {
        requireRole(u, ["admin"]);
        const socio = db.socios.find((s) => s.id === id);
        if (!socio) throw { response: { status: 404, data: { detail: "Socio no encontrado" } } };
        if (socio.estado !== "baja") throw { response: { status: 400, data: { detail: "Solo se puede eliminar definitivamente un socio dado de baja" } } };
        try {
          await deleteFirestoreSocio(id);
          await deleteFirestorePagosSocioBySocio(id);
        } catch (error) {
          throw firestoreApiError(error, "No se pudo eliminar el socio en Firebase.");
        }
        db.socios = db.socios.filter((s) => s.id !== id);
        db.pagos = db.pagos.filter((p) => p.socioId !== id);
        saveDb(db); return ok({ ok: true });
      }
      requireRole(u, ["admin", "secretaria"]);
      const exists = db.socios.some((s) => s.id === id);
      if (!exists) throw { response: { status: 404, data: { detail: "Socio no encontrado" } } };
      try {
        await bajaFirestoreSocio(id);
      } catch (error) {
        throw firestoreApiError(error, "No se pudo dar de baja el socio en Firebase.");
      }
      db.socios = db.socios.map((s) => s.id === id ? { ...s, estado: "baja" } : s); saveDb(db); return ok({ ok: true });
    }
    if (pathname.startsWith("/pagos/")) {
      requireRole(u, ["admin", "secretaria"]);
      const id = pathname.split("/").pop();
      const exists = db.pagos.some((p) => p.id === id);
      if (!exists) throw { response: { status: 404, data: { detail: "Pago no encontrado" } } };
      try {
        await deleteFirestorePagoSocio(id);
      } catch (error) {
        throw firestoreApiError(error, "No se pudo anular el pago en Firebase.");
      }
      db.pagos = db.pagos.filter((p) => p.id !== id); saveDb(db); return ok({ ok: true });
    }
    throw { response: { status: 404, data: { detail: `Endpoint no implementado: ${pathname}` } } };
  },
};

export default api;

export function resetLocalCache() {
  localStorage.removeItem(DB_KEY);
  return initialDb();
}

export function formatApiError(detail) {
  if (detail == null) return "Ocurrió un error. Intente nuevamente.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
