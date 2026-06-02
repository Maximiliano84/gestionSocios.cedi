# Firebase - Pagos de socios

Esta versión conecta los pagos de fútbol/socios a Firestore.

## Colección

```txt
pagosSocios
```

## Documento sugerido

```js
{
  socioId: "id_del_socio",
  meses: ["2026-05", "2026-06"],
  monto: 20000,
  fechaPago: "2026-05-22",
  metodo: "efectivo", // efectivo | mercadopago | otro
  comprobanteUrl: "",
  observacion: "",
  esPagoAnual: false,
  anulado: false,
  createdAt: "2026-05-22T...",
  creadoEn: serverTimestamp(),
  actualizadoEn: serverTimestamp()
}
```

## Qué queda conectado

- Registrar pago de socio.
- Registrar varios meses.
- Registrar pago anual.
- Registrar pagos adelantados.
- Historial de pagos en la ficha del socio.
- Deuda del socio.
- Deudores de fútbol.
- Recaudación del mes en Inicio.
- Página Pagos con socios + actividades.
- Anular pago de socio.
- Eliminar pagos asociados al eliminar definitivamente un socio.

## Reglas sugeridas

Ajustar según el esquema de roles que ya está en `usuarios/{uid}`.

```js
match /pagosSocios/{pagoId} {
  allow read: if request.auth != null &&
    exists(/databases/$(database)/documents/usuarios/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.activo == true;

  allow create, update, delete: if request.auth != null &&
    exists(/databases/$(database)/documents/usuarios/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.activo == true &&
    get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol in ["administrador", "admin", "secretaria"];
}
```
