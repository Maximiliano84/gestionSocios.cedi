# Pagos de actividades en Firestore

Esta versión conecta los pagos de alumnos de actividades con la colección `pagosActividades`.

## Colección

```txt
pagosActividades/{pagoId}
```

## Campos

```js
{
  alumnoId: "id_del_alumno",
  actividadId: "id_de_la_actividad",
  meses: ["2026-05", "2026-06"],
  monto: 24000,
  metodo: "efectivo" | "mercadopago" | "otro",
  fechaPago: "2026-05-22",
  observacion: "",
  anulado: false,
  createdAt: "2026-05-22T...",
  creadoEn: serverTimestamp(),
  actualizadoEn: serverTimestamp()
}
```

## Funcionalidades conectadas

- Registrar pago de alumno de actividad.
- Pagar uno o varios meses.
- Pagar meses adelantados.
- Ver historial de pagos en la ficha del alumno.
- Calcular deuda del alumno según pagos reales.
- Mostrar recaudación mensual de actividades.
- Calcular distribución 70% actividad / 30% club.
- Mostrar pagos de actividades en Inicio y en la página Pagos.
- Anular pago de actividad eliminándolo de Firestore.

## Reglas sugeridas

Ajustar las reglas a los roles reales del proyecto. Como base:

```js
match /pagosActividades/{pagoId} {
  allow read: if request.auth != null;
  allow create, update, delete: if request.auth != null;
}
```

Luego conviene restringir `create/update/delete` a `administrador` y `secretaria` cuando las reglas ya consulten roles desde `usuarios/{uid}`.
