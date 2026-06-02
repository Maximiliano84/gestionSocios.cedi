# Cloudinary para fotos carnet

Esta versión reemplaza el uso de Firebase Storage para fotos por Cloudinary.
Firebase Auth y Firestore siguen igual.

## 1. Crear cuenta en Cloudinary

Crear una cuenta gratuita en Cloudinary y copiar el `Cloud name` del dashboard.

## 2. Crear Upload Preset

En Cloudinary:

1. Ir a Settings.
2. Ir a Upload.
3. Crear un Upload Preset.
4. Configurarlo como `Unsigned`.
5. Restringirlo a imágenes.
6. Si Cloudinary lo permite en tu panel, limitar carpeta a `cedi` o usar una carpeta por defecto.

## 3. Variables de entorno

Agregar en `.env.local`:

```env
VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=tu_upload_preset_unsigned
```

Ya no hace falta `VITE_FIREBASE_STORAGE_BUCKET` porque no se usa Firebase Storage.

## 4. Dónde se usa

Se agregó carga de foto en:

- Socios
- Alumnos de actividades
- Edición de alumnos de actividades desde la ficha

La app guarda en Firestore:

```js
fotoUrl: "https://res.cloudinary.com/..."
fotoPublicId: "cedi/socios/..."
```

El carnet digital ya usaba `fotoUrl`, así que no hubo que rehacer el carnet.

## 5. Recomendación

Para evitar abuso del preset público, no usar un nombre obvio como `default` o `test`.
Usar algo específico, por ejemplo:

```txt
cedi_fotos_carnet_unsigned
```

Además, mantener el preset restringido a imágenes y revisar periódicamente el uso desde el dashboard de Cloudinary.
