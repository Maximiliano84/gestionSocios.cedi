# Estado actual de Firebase

La app quedó trabajando con Firebase/Firestore para los módulos administrativos principales:

- Firebase Auth: login real.
- `usuarios`: roles y permisos.
- `configuracion/general`: datos del club, cuotas, categorías, link de pago y mensaje de WhatsApp.
- `actividades`: actividades, profesor/a, cuota mensual.
- `alumnosActividades`: alumnos de actividades.
- `pagosActividades`: pagos de actividades.
- `socios`: socios de fútbol.
- `pagosSocios`: pagos de socios.

`localStorage` ya no se usa como base administrativa. Solo se conserva para sesión mínima del usuario.
