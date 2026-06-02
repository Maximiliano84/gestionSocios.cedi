// Configuración base usada únicamente como respaldo inicial si Firestore todavía no tiene configuracion/general.
export const mockConfig = {
  id: "club",
  nombreClub: "CEDI LOS 15",
  cuotaMensual: 10000,
  linkPago: "https://link.mercadopago.com.ar/cedilos15",
  aliasPago: "CEDILOS15.MP",
  telefonoContacto: "+54 221 555 5555",
  categorias: ["2012", "2013", "2014", "2015", "2016", "2017", "2018"],
  actividades: [
    { id: "act_patin", nombre: "Patín", profesor: "A definir", cuotaMensual: 12000 },
    { id: "act_taekwondo", nombre: "Taekwondo", profesor: "A definir", cuotaMensual: 15000 },
    { id: "act_telas", nombre: "Telas", profesor: "A definir", cuotaMensual: 14000 },
    { id: "act_zumba", nombre: "Zumba", profesor: "A definir", cuotaMensual: 10000 },
  ],
  logoUrl: "/logo-cedi.png",
  mensajeWhatsapp:
    "Hola, familia. Les recordamos que se encuentra pendiente la cuota social de {meses} de {nombre}. Pueden abonarla desde este link: {link}. Muchas gracias. Comisión CEDI LOS 15.",
};
