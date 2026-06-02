import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Image as ImageIcon, Link as LinkIcon, MessageCircle } from "lucide-react";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";

export default function CarnetActions({ linkPago, onDownloadImage, onSendPaymentLink, publicUrl, showPaymentActions = true }) {
  const [confirmDownload, setConfirmDownload] = useState(false);
  const [confirmPublic, setConfirmPublic] = useState(false);
  const actionClass =
    "w-full h-10 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors";

  return (
    <div className="mt-4 grid w-full grid-cols-1 gap-2">
      {showPaymentActions && linkPago && (
        <a
          href={linkPago}
          target="_blank"
          rel="noreferrer"
          data-testid="carnet-link-pago"
          className={`${actionClass} bg-blue-700 text-white shadow-sm hover:bg-blue-800`}
        >
          <CreditCard className="h-4 w-4" />
          Pagar cuota online
        </a>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => setConfirmDownload(true)}
        data-testid="download-carnet-png"
        className={`${actionClass} border-slate-200 text-slate-700 hover:bg-slate-50`}
      >
        <ImageIcon className="h-4 w-4" />
        Descargar imagen
      </Button>

      {showPaymentActions && (
        <Button
          type="button"
          variant="outline"
          onClick={onSendPaymentLink}
          data-testid="share-link-pago"
          className={`${actionClass} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
        >
          <MessageCircle className="h-4 w-4" />
          Enviar link de pago
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => setConfirmPublic(true)}
        data-testid="open-public-carnet"
        className={`${actionClass} border-slate-200 text-slate-700 hover:bg-slate-50`}
      >
        <LinkIcon className="h-4 w-4" />
        Ver carnet público
      </Button>

      <ConfirmActionDialog
        open={confirmDownload}
        onOpenChange={setConfirmDownload}
        title="Descargar imagen del carnet"
        description="¿Querés descargar la imagen del carnet para compartirla o guardarla?"
        confirmText="Descargar"
        onConfirm={() => {
          setConfirmDownload(false);
          onDownloadImage?.();
        }}
      />

      <ConfirmActionDialog
        open={confirmPublic}
        onOpenChange={setConfirmPublic}
        title="Abrir carnet público"
        description="¿Querés abrir el carnet público en una nueva pestaña?"
        confirmText="Abrir carnet"
        onConfirm={() => {
          setConfirmPublic(false);
          if (publicUrl) window.open(publicUrl, "_blank", "noopener,noreferrer");
        }}
      />
    </div>
  );
}
