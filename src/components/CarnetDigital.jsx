import { QRCodeCanvas } from "qrcode.react";
import { formatDate } from "@/utils/format";

const THEME = {
  socio: {
    outer: "from-blue-950 via-blue-900 to-slate-900",
    accent: "bg-blue-700",
    chipOk: "bg-emerald-100 text-emerald-800 border-emerald-200",
    chipWarn: "bg-amber-100 text-amber-900 border-amber-200",
    label: "text-blue-100",
  },
  actividad: {
    outer: "from-emerald-900 via-green-800 to-lime-800",
    accent: "bg-emerald-600",
    chipOk: "bg-emerald-100 text-emerald-800 border-emerald-200",
    chipWarn: "bg-amber-100 text-amber-900 border-amber-200",
    label: "text-emerald-100",
  },
};

function safeText(value) {
  return value === undefined || value === null || value === "" ? "-" : String(value);
}

export default function CarnetDigital({
  refProp,
  tipo = "socio",
  nombreClub = "CEDI LOS 15",
  logoUrl = "",
  titulo = "Carnet Digital",
  etiquetaPersona = "Persona",
  nombre = "",
  apellido = "",
  fotoUrl = "",
  mostrarFoto = false,
  estado = "activo",
  fechaEmision,
  qrValue = "",
  detalles = [],
  testId = "carnet-digital",
}) {
  const theme = THEME[tipo] || THEME.socio;
  const logoSrc = logoUrl || "/logo-cedi.png";
  
  

  const mainDetails = [
    ...detalles,
    { label: "Estado", value: estado },
    { label: "Emisión", value: formatDate(fechaEmision) },
  ];

  return (
    <div
      ref={refProp}
      data-testid={testId}
      className={`relative w-full aspect-[560/353] rounded-[28px] bg-gradient-to-br ${theme.outer} text-white shadow-xl overflow-hidden isolate carnet-capture`}
    >
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-white" />
        <div className="absolute -left-16 -bottom-24 w-72 h-72 rounded-full bg-white" />
      </div>
      <div className="absolute inset-0 border border-white/20 rounded-[28px] pointer-events-none" />

      <div className="relative z-10 h-full px-5 pt-5 pb-5 flex flex-col gap-4">
        <div className="grid grid-cols-[110px_1fr_110px] items-start gap-4">
          <div>
            {logoSrc ? (
              <img src={logoSrc} alt="Logo del club" className="w-full h-full object-contain" crossOrigin="anonymous" />
            ) : (
              <div className={`w-full h-full ${theme.accent} rounded-xl grid place-items-center text-white font-black text-xl`}>15</div>
            )}
          </div>

          <div className="text-center px-1 min-w-0 pt-1">
            <div className="text-[20px] uppercase tracking-[0.30em] text-white/75 font-semibold leading-none">
              {nombreClub}
            </div>
            <div className="mt-2 text-[22px] font-black leading-tight text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
              {titulo}
            </div>
          </div>

          <div className="justify-self-end w-[120px] h-[120px] rounded-2xl bg-white/95 p-1.5 shadow-md overflow-hidden flex items-center justify-center text-slate-400 text-[11px] text-center">
            {mostrarFoto && fotoUrl ? (
              <img src={fotoUrl} alt="Foto carnet" className="w-full h-full object-cover rounded-xl" crossOrigin="anonymous" />
            ) : (
              <span>Sin foto</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_104px] gap-4 flex-1 min-h-0 items-end">
          <div className="rounded-2xl bg-white/12 border border-white/15 p-3 min-w-0 backdrop-blur-sm mb-2">
            <div className={`text-[10px] uppercase tracking-[0.22em] ${theme.label} font-semibold`}>
              {etiquetaPersona}
            </div>
            <div className="mt-1 text-[20px] font-black leading-[1.05] break-words" style={{ fontFamily: "Outfit, sans-serif" }}>
              {safeText(nombre)} {safeText(apellido)}
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
              {mainDetails.map((d) => (
                <div key={d.label} className="min-w-0">
                  <div className="text-[9px] uppercase tracking-wider text-white/60 font-semibold leading-none">
                    {d.label}
                  </div>
                  <div className="mt-1 text-[13px] font-bold leading-tight text-white break-words">
                    {safeText(d.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-[100px] h-[100px] rounded-2xl bg-white shadow-md self-end mb-2 flex items-center justify-center shrink-0">
            <QRCodeCanvas value={qrValue || ""} size={82} includeMargin={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
