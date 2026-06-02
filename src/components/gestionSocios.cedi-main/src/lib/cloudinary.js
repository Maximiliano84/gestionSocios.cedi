const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const MAX_IMAGE_SIZE = 800;
const JPEG_QUALITY = 0.85;

function cloudinaryConfigured() {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
}

function getFileExtension(fileName = "") {
  return String(fileName).split(".").pop()?.toLowerCase() || "jpg";
}

function canvasToBlob(canvas, type = "image/jpeg", quality = JPEG_QUALITY) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo preparar la imagen."));
    }, type, quality);
  });
}

async function resizeImageForUpload(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Seleccioná un archivo de imagen válido.");
  }

  const imageUrl = URL.createObjectURL(file);
  const image = new Image();

  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("No se pudo leer la imagen."));
      image.src = imageUrl;
    });

    const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(image.width, image.height));
    const width = Math.round(image.width * scale);
    const height = Math.round(image.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas);
    const baseName = file.name.replace(/\.[^.]+$/, "") || "foto-carnet";

    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export async function uploadCarnetPhoto(file, { folder = "cedi/carnets" } = {}) {
  if (!cloudinaryConfigured()) {
    throw new Error("Falta configurar Cloudinary en el archivo .env.local.");
  }

  const optimizedFile = await resizeImageForUpload(file);
  const formData = new FormData();
  formData.append("file", optimizedFile);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error?.message || "No se pudo subir la foto a Cloudinary.");
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
    originalFileName: file.name,
    extension: getFileExtension(file.name),
  };
}

export function isCloudinaryReady() {
  return cloudinaryConfigured();
}
