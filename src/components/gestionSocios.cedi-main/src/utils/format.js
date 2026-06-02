export function formatMoney(n) {
  if (n == null || isNaN(n)) return "$0";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

export function formatDate(s) {
  if (!s) return "";
  const value = String(s);

  // Evita el desfase UTC cuando la fecha viene como YYYY-MM-DD.
  // new Date("2026-05-28") se interpreta en UTC y en Argentina puede verse como el día anterior.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return value; }
}

const MES_NAMES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
export function formatMesYM(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return `${MES_NAMES[parseInt(m,10)-1]} ${y}`;
}
export const MES_NAMES_FULL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];


export function formatMetodoPago(metodo) {
  const map = {
    efectivo: "Efectivo",
    mercadopago: "Mercado Pago",
    otro: "Otro",
  };
  return map[metodo] || metodo || "-";
}
