import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadCarnetPhoto, isCloudinaryReady } from "@/lib/cloudinary";

export default function PhotoUploadField({ value = "", publicId = "", folder = "cedi/carnets", onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const uploaded = await uploadCarnetPhoto(file, { folder });
      onChange?.({ fotoUrl: uploaded.url, fotoPublicId: uploaded.publicId });
    } catch (e) {
      setError(e?.message || "No se pudo subir la foto.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const removePhoto = () => {
    onChange?.({ fotoUrl: "", fotoPublicId: "" });
    setError("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-24 h-24 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center text-slate-400 shrink-0">
          {value ? (
            <img src={value} alt="Foto carnet" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-8 h-8" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <Input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
              {value ? "Cambiar foto" : "Subir foto"}
            </Button>
            {value && (
              <Button type="button" variant="outline" onClick={removePhoto} disabled={uploading} className="text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4 mr-2" /> Quitar
              </Button>
            )}
          </div>

          <p className="text-xs text-slate-500">
            La imagen se optimiza antes de subir. Se mostrará en el carnet solo si tiene autorización de imagen.
          </p>
          {!isCloudinaryReady() && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Falta configurar VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET.
            </p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          {publicId && <p className="text-[11px] text-slate-400 break-all">Cloudinary ID: {publicId}</p>}
        </div>
      </div>
    </div>
  );
}
