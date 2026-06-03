import { QRCodeCanvas } from "qrcode.react";
import { formatDate } from "@/utils/format";

const THEME = {
  socio: {
    outer: "from-blue-950 via-blue-900 to-slate-900",
    accent: "bg-blue-700",
    label: "text-blue-100",
  },
  actividad: {
    outer: "from-emerald-900 via-green-800 to-lime-800",
    accent: "bg-emerald-600",
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
  exportMode = false,
}) {
  const theme = THEME[tipo] || THEME.socio;
  const logoSrc = "/logo-cedi.png";

  const mainDetails = [
    ...detalles,
    { label: "Estado", value: estado },
    { label: "Emisión", value: formatDate(fechaEmision) },
  ].filter(Boolean);

  const cardClass = exportMode
    ? "h-[353px] w-[560px] rounded-[28px]"
    : "aspect-[560/353] w-[calc(100vw-48px)] max-w-[560px] rounded-[22px] sm:w-full sm:rounded-[28px]";

  const wrapperClass = exportMode
    ? "h-[353px] w-[560px] overflow-hidden"
    : "w-full max-w-full overflow-hidden";

  const paddingClass = exportMode ? "p-5" : "p-[clamp(10px,3.2vw,20px)]";

  const headerGridClass = exportMode
    ? "grid-cols-[92px_minmax(0,1fr)_104px] gap-4"
    : "grid-cols-[clamp(46px,15vw,92px)_minmax(0,1fr)_clamp(56px,18vw,104px)] gap-[clamp(8px,2.4vw,16px)]";

  const logoSizeClass = exportMode ? "w-[92px]" : "w-[clamp(46px,15vw,92px)]";
  const photoBoxClass = exportMode
    ? "w-[104px] rounded-2xl text-[11px]"
    : "w-[clamp(56px,18vw,104px)] rounded-[clamp(10px,3vw,16px)] text-[clamp(7px,2vw,11px)]";

  const clubTextClass = exportMode
    ? "text-[18px] tracking-[0.30em]"
    : "text-[clamp(8px,2.7vw,18px)] tracking-[0.20em] sm:tracking-[0.30em]";

  const titleTextClass = exportMode
    ? "mt-2 text-[24px]"
    : "mt-[clamp(3px,1.4vw,8px)] text-[clamp(13px,3.8vw,24px)]";

  const bodyGridClass = exportMode
    ? "grid-cols-[minmax(0,1fr)_88px] gap-4"
    : "grid-cols-[minmax(0,1fr)_clamp(54px,16vw,88px)] gap-[clamp(8px,2.4vw,16px)]";

  const dataPanelClass = exportMode ? "rounded-2xl p-3" : "rounded-[clamp(10px,3vw,16px)] p-[clamp(7px,2.1vw,12px)]";
  const labelTextClass = exportMode ? "text-[10px]" : "text-[clamp(6px,1.9vw,10px)]";
  const nameTextClass = exportMode ? "text-[20px]" : "text-[clamp(12px,3.5vw,20px)]";
  const detailsGridClass = exportMode ? "mt-3 gap-x-4 gap-y-2" : "mt-[clamp(5px,1.7vw,10px)] gap-x-[clamp(8px,2vw,16px)] gap-y-[clamp(3px,1vw,7px)]";
  const detailLabelClass = exportMode ? "text-[9px]" : "text-[clamp(6px,1.6vw,9px)]";
  const detailValueClass = exportMode ? "text-[13px]" : "text-[clamp(8px,2.25vw,13px)]";
  const qrBoxClass = exportMode ? "w-[88px] rounded-2xl p-2" : "w-[clamp(54px,16vw,88px)] rounded-[clamp(10px,2.6vw,14px)] p-[clamp(6px,1.8vw,10px)]";

  return (
    <div className={wrapperClass}>
      <div
        ref={refProp}
        data-testid={testId}
        className={`carnet-capture relative mx-auto ${cardClass} overflow-hidden bg-gradient-to-br ${theme.outer} text-white shadow-xl isolate`}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-[10%] -top-[18%] h-[56%] w-[36%] rounded-full bg-white opacity-[0.14]" />
          <div
            className={
              exportMode
                ? "absolute -left-[16%] -bottom-[30%] h-[68%] w-[52%] rounded-full bg-white opacity-[0.035]"
                : "absolute -left-[12%] -bottom-[28%] h-[68%] w-[52%] rounded-full bg-white opacity-[0.10]"
            }
          />
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <img
            src={logoSrc || logoUrl}
            alt=""
            className={exportMode ? "h-[62%] w-[62%] object-contain opacity-[0.05]" : "h-[72%] w-[72%] object-contain opacity-[0.06]"}
            crossOrigin="anonymous"
          />
        </div>

        <div className="pointer-events-none absolute inset-0 rounded-[22px] border border-white/20 sm:rounded-[28px]" />

        <div className={`relative z-10 flex h-full flex-col ${paddingClass}`}>
          <div className={`grid ${headerGridClass} items-start`}>
            <div className={`flex aspect-square ${logoSizeClass} items-center justify-center overflow-hidden`}>
              <img src={logoSrc || logoUrl} alt="Logo del club" className="h-full w-full object-contain" crossOrigin="anonymous" />
            </div>

            <div className="min-w-0 px-1 pt-0.5 text-center">
              <div className={`truncate ${clubTextClass} font-semibold uppercase leading-none text-white/75`}>
                {nombreClub}
              </div>
              <div className={`${titleTextClass} font-black leading-tight text-white`} style={{ fontFamily: "Outfit, sans-serif" }}>
                {titulo}
              </div>
            </div>

            <div className="justify-self-end">
              <div className={`flex aspect-square ${photoBoxClass} items-center justify-center overflow-hidden bg-white/95 p-1 text-center text-slate-400 shadow-md`}>
                {mostrarFoto && fotoUrl ? (
                  <img src={fotoUrl} alt="Foto carnet" className="h-full w-full rounded-[10px] object-cover" crossOrigin="anonymous" />
                ) : (
                  <span className="px-1 leading-tight">Sin foto</span>
                )}
              </div>
            </div>
          </div>

          <div className={`mt-auto grid min-h-0 ${bodyGridClass} items-end`}>
            <div className={`min-w-0 ${dataPanelClass} border border-white/15 bg-white/12`}>
              <div className={`${labelTextClass} font-semibold uppercase leading-none tracking-[0.18em] ${theme.label}`}>
                {etiquetaPersona}
              </div>
              <div className={`mt-1 truncate ${nameTextClass} font-black leading-[1.08]`} style={{ fontFamily: "Outfit, sans-serif" }}>
                {safeText(nombre)} {safeText(apellido)}
              </div>
              <div className={`grid grid-cols-2 ${detailsGridClass}`}>
                {mainDetails.slice(0, 4).map((d) => (
                  <div key={d.label} className="min-w-0">
                    <div className={`truncate ${detailLabelClass} font-semibold uppercase leading-none tracking-wider text-white/60`}>
                      {d.label}
                    </div>
                    <div className={`mt-1 truncate ${detailValueClass} font-bold leading-tight text-white`}>
                      {safeText(d.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`flex aspect-square ${qrBoxClass} shrink-0 items-center justify-center overflow-hidden bg-white shadow-md`}>
              <QRCodeCanvas value={qrValue || ""} size={72} includeMargin={false} className="block h-full w-full max-h-full max-w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
