export function sanitizeFileName(value) {
  return String(value || "carnet")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function waitForCarnetImages(node) {
  if (!node) return Promise.resolve();
  const images = Array.from(node.querySelectorAll("img"));
  return Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );
}

function loadCanvasImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawImageContain(ctx, img, x, y, w, h) {
  if (!img) return;
  const ratio = Math.min(w / img.width, h / img.height);
  const nw = img.width * ratio;
  const nh = img.height * ratio;
  ctx.drawImage(img, x + (w - nw) / 2, y + (h - nh) / 2, nw, nh);
}

function drawImageCover(ctx, img, x, y, w, h, r = 0) {
  if (!img) return;
  const ratio = Math.max(w / img.width, h / img.height);
  const nw = img.width * ratio;
  const nh = img.height * ratio;
  const sx = (w - nw) / 2;
  const sy = (h - nh) / 2;
  ctx.save();
  if (r) {
    roundedRect(ctx, x, y, w, h, r);
    ctx.clip();
  }
  ctx.drawImage(img, x + sx, y + sy, nw, nh);
  ctx.restore();
}

function drawTextFit(ctx, text, x, y, maxWidth, font, color, align = "left") {
  const value = String(text || "-");
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";

  let output = value;
  if (ctx.measureText(output).width > maxWidth) {
    while (output.length > 1 && ctx.measureText(`${output}…`).width > maxWidth) {
      output = output.slice(0, -1);
    }
    output = `${output}…`;
  }

  ctx.fillText(output, x, y);
  ctx.restore();
}

function drawLetterSpacedText(ctx, text, centerX, y, spacing, font, color, maxWidth) {
  const value = String(text || "").toUpperCase();
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";

  let total = 0;
  for (let i = 0; i < value.length; i += 1) {
    total += ctx.measureText(value[i]).width;
    if (i < value.length - 1) total += spacing;
  }

  if (total > maxWidth) {
    ctx.textAlign = "center";
    ctx.fillText(value, centerX, y, maxWidth);
    ctx.restore();
    return;
  }

  let x = centerX - total / 2;
  for (let i = 0; i < value.length; i += 1) {
    ctx.fillText(value[i], x, y);
    x += ctx.measureText(value[i]).width + spacing;
  }
  ctx.restore();
}

export async function createCarnetPngCanvas({
  tipo,
  nombreClub,
  titulo,
  etiquetaPersona,
  nombre,
  apellido,
  fotoUrl,
  mostrarFoto,
  detalles,
  estado,
  fechaEmision,
  qrCanvas,
}) {
  const W = 560;
  const H = 353;
  const SCALE = 3;
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  const isActividad = tipo === "actividad";
  const colors = isActividad
    ? ["#064e3b", "#166534", "#365314"]
    : ["#172554", "#1e3a8a", "#0f172a"];
  const labelColor = isActividad ? "#d1fae5" : "#dbeafe";

  roundedRect(ctx, 0, 0, W, H, 28);
  ctx.clip();

  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.55, colors[1]);
  gradient.addColorStop(1, colors[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.arc(W - 60, -15, 110, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.035)";
  ctx.beginPath();
  ctx.arc(-35, H + 35, 145, 0, Math.PI * 2);
  ctx.fill();

  const logo = await loadCanvasImage("/logo-cedi.png");
  ctx.save();
  ctx.globalAlpha = 0.055;
  drawImageContain(ctx, logo, 150, 56, 260, 260);
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  roundedRect(ctx, 0.5, 0.5, W - 1, H - 1, 28);
  ctx.stroke();

  drawImageContain(ctx, logo, 20, 20, 110, 110);

  const photo = mostrarFoto ? await loadCanvasImage(fotoUrl) : null;

  ctx.save();
  roundedRect(ctx, 416, 18, 124, 124, 18);
  ctx.fillStyle = "#f8fafc";
  ctx.fill();
  ctx.restore();

  if (photo) {
    drawImageCover(ctx, photo, 418, 20, 120, 120, 16);
  } else {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sin foto", 478, 80);
  }

  drawLetterSpacedText(
    ctx,
    nombreClub || "CEDI LOS 15",
    280,
    56,
    5,
    "700 17px Arial, Helvetica, sans-serif",
    "rgba(255,255,255,0.72)",
    310
  );

  drawTextFit(
    ctx,
    titulo,
    280,
    92,
    310,
    "900 25px Arial, Helvetica, sans-serif",
    "#ffffff",
    "center"
  );

  roundedRect(ctx, 22, 198, 390, 130, 18);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = labelColor;
  ctx.font = "700 10px Arial, Helvetica, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  drawLetterSpacedText(ctx, etiquetaPersona, 70, 211, 3.4, "700 10px Arial, Helvetica, sans-serif", labelColor, 120);

  drawTextFit(
    ctx,
    `${nombre || ""} ${apellido || ""}`.trim(),
    38,
    239,
    345,
    "900 20px Arial, Helvetica, sans-serif",
    "#ffffff",
    "left"
  );

  const allDetails = [
    ...(detalles || []),
    { label: "Estado", value: estado },
    { label: "Emisión", value: fechaEmision },
  ].slice(0, 4);

  const positions = [
    [38, 269],
    [216, 269],
    [38, 303],
    [216, 303],
  ];

  allDetails.forEach((d, index) => {
    const [x, y] = positions[index];
    drawTextFit(ctx, d.label, x, y, 150, "700 8px Arial, Helvetica, sans-serif", "rgba(255,255,255,0.58)", "left");
    drawTextFit(ctx, d.value, x, y + 17, 150, "800 12px Arial, Helvetica, sans-serif", "#ffffff", "left");
  });

  roundedRect(ctx, 436, 224, 104, 104, 16);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  if (qrCanvas) {
    ctx.drawImage(qrCanvas, 442, 230, 92, 92);
  }

  return canvas;
}
