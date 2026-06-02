# Firebase - Socios de fútbol

Esta versión conecta el módulo de socios de fútbol con Firestore.

## Colección

```txt
socios
```

Cada documento representa un socio del club/fútbol.

## Estructura sugerida

```js
{
  numeroSocio: 25,
  nombre: "Juan",
  apellido: "Pérez",
  dni: "12345678",
  fechaNacimiento: "2015-04-20",
  categoria: "2015",
  estado: "activo", // activo | inactivo | baja
  fechaAlta: "2026-05-22",
  fotoUrl: "",
  tutorNombre: "María Pérez",
  tutorTelefono: "+54 9 221...",
  tutorEmail: "",
  direccion: "",
  obraSocial: "",
  aptoMedico: true,
  autorizacionImagen: true,
  observaciones: "",
  createdAt: "2026-05-22T...",
  creadoEn: serverTimestamp(),
  actualizadoEn: serverTimestamp()
}
```

## Funciones conectadas

- Listar socios.
- Ver ficha de socio.
- Crear socio.
- Editar socio.
- Dar de baja socio.
- Eliminar definitivamente un socio dado de baja.
- Carnet público de socio.
- Cálculo de deuda usando pagos de socios actuales.

## Pendiente

Los pagos de socios ya están migrados a Firestore en la colección `pagosSocios`.

La próxima colección recomendada es:

```txt
pagosSocios
```

## Reglas sugeridas

Mientras se termina la migración completa, las reglas deberían permitir leer socios a usuarios activos y escribir solo a `administrador` y `secretaria`.

Ejemplo conceptual:

```js
match /socios/{socioId} {
  allow read: if request.auth != null && isActiveUser();
  allow create, update: if request.auth != null && hasRole(["administrador", "admin", "secretaria"]);
  allow delete: if request.auth != null && hasRole(["administrador", "admin"]);
}
```

Adaptar estas reglas a las funciones auxiliares reales que uses en Firestore Rules.
