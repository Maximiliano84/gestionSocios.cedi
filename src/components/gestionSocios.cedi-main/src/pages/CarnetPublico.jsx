import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Image as ImageIcon,
  CreditCard,
  Share2,
  AlertTriangle,
} from "lucide-react";
import html2canvas from "html2canvas";
import CarnetDigital from "@/components/CarnetDigital";
import {
  ConfirmActionDialog,
  FeedbackDialog,
} from "@/components/ConfirmActionDialog";

export default function CarnetPublico() {
  const { id, tipo } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const carnetRef = useRef(null);
  const [confirmDownload, setConfirmDownload] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const tipoCarnet = tipo || "socio";

  useEffect(() => {
    const endpoint = tipo
      ? `/public/carnet/${tipo}/${id}`
      : `/public/carnet/${id}`;

    api
      .get(endpoint)
      .then(({ data }) => setData(data))
      .catch((e) =>
        setError(e?.response?.data?.detail || "Carnet no encontrado")
      );
  }, [id, tipo]);

  const carnetUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${
          tipo ? `/carnet/${tipo}/${id}` : `/carnet/${id}`
        }`
      : "";

  const downloadPNG = async () => {
    if (!carnetRef.current || !data) return;

    const element = carnetRef.current;

    const previousWidth = element.style.width;
    const previousHeight = element.style.height;
    const previousMaxWidth = element.style.maxWidth;
    const previousMinWidth = element.style.minWidth;
    const previousTransform = element.style.transform;

    try {
      element.style.width = "560px";
      element.style.height = "353px";
      element.style.maxWidth = "560px";
      element.style.minWidth = "560px";
      element.style.transform = "none";

      const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        logging: false,
        width: 560,
        height: 353,
        windowWidth: 900,
      });

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");

      const apellido = data.apellido || "cedi";
      const nombre = data.nombre || "carnet";
      const fileName = `carnet-${apellido}-${nombre}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      a.href = url;
      a.download = `${fileName}.png`;
      a.click();

      setFeedback({
        title: "Imagen descargada",
        description: "El carnet se descargó correctamente.",
        variant: "success",
      });
    } catch (err) {
      setFeedback({
        title: "No se pudo descargar",
        description: "Ocurrió un problema al generar la imagen del carnet.",
        variant: "error",
      });
    } finally {
      element.style.width = previousWidth;
      element.style.height = previousHeight;
      element.style.maxWidth = previousMaxWidth;
      element.style.minWidth = previousMinWidth;
      element.style.transform = previousTransform;
    }
  };

  const shareLink = async () => {
    if (!data) return;

    const text = `${
      data?.tipo === "actividad" ? "Carnet de alumno" : "Carnet de socio"
    } ${data.nombre} ${data.apellido} - ${data.nombreClub}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: text,
          url: carnetUrl,
        });
        return;
      } catch {
        // Si el usuario cancela compartir, no mostramos error.
      }
    }

    try {
      await navigator.clipboard.writeText(carnetUrl);
      setFeedback({
        title: "Link copiado",
        description: "El link del carnet se copió al portapapeles.",
        variant: "success",
      });
    } catch {
      setFeedback({
        title: "No se pudo copiar",
        description: "Copiá el link manualmente desde la barra del navegador.",
        variant: "error",
      });
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center p-6">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-slate-900">
            Carnet no disponible
          </h2>
          <p className="text-slate-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center text-slate-500">
        <div className="inline-flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Cargando carnet...</span>
        </div>
      </div>
    );
  }

  const esActividad = data.tipo === "actividad" || tipoCarnet === "actividad";
  const mostrarFoto = Boolean(data.autorizacionImagen && data.fotoUrl);

  const detalles = esActividad
    ? [
        { label: "Actividad", value: data.actividadNombre },
        { label: "Profesor/a", value: data.profesor },
      ]
    : [
        { label: "N° Socio", value: `#${data.numeroSocio}` },
        { label: "Categoría", value: data.categoria },
      ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto w-full max-w-[720px]">
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Carnet Digital
          </p>
          <h1
            className="text-2xl font-bold text-slate-900 mt-1"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {data.nombreClub}
          </h1>
        </div>

        <div className="w-full overflow-x-auto pb-2">
          <div className="mx-auto w-full max-w-[560px] min-w-[320px]">
            <CarnetDigital
              refProp={carnetRef}
              tipo={esActividad ? "actividad" : "socio"}
              nombreClub={data.nombreClub}
              logoUrl={data.logoUrl}
              titulo={esActividad ? "Carnet de Alumno" : "Carnet de Socio"}
              etiquetaPersona={esActividad ? "Alumno/a" : "Socio"}
              nombre={data.nombre}
              apellido={data.apellido}
              fotoUrl={data.fotoUrl}
              mostrarFoto={mostrarFoto}
              estado={data.estado}
              estadoCuota={data.estadoCuota}
              fechaEmision={data.fechaEmision}
              qrValue={carnetUrl}
              detalles={detalles}
              testId="carnet-public-card"
            />
          </div>
        </div>

        <div className="mt-6 mx-auto w-full max-w-[560px] grid gap-2">
          {data.linkPago && (
            <a
              href={data.linkPago}
              target="_blank"
              rel="noreferrer"
              data-testid="carnet-link-pago"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-blue-700 text-white text-sm font-semibold"
            >
              <CreditCard className="w-4 h-4" />
              Pagar cuota online
            </a>
          )}

          <Button
            variant="outline"
            onClick={() => setConfirmDownload(true)}
            data-testid="public-download-png"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Descargar imagen
          </Button>

          <Button
            variant="outline"
            onClick={shareLink}
            data-testid="share-link"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartir link del carnet
          </Button>

          {data.aliasPago && (
            <div className="bg-white border border-slate-200 rounded-md p-3 text-sm">
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                Alias / CVU
              </div>
              <div className="font-mono font-semibold text-slate-900 mt-0.5">
                {data.aliasPago}
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Carnet digital oficial · {data.nombreClub}
        </p>
      </div>

      <ConfirmActionDialog
        open={confirmDownload}
        onOpenChange={setConfirmDownload}
        title="Descargar imagen del carnet"
        description="¿Querés descargar la imagen del carnet público?"
        confirmText="Descargar"
        onConfirm={() => {
          setConfirmDownload(false);
          downloadPNG();
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