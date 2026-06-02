# Firebase - Alumnos de actividades

Esta versión conecta los alumnos de actividades con Firestore.

## Colección

`alumnosActividades`

Cada documento representa un alumno de una actividad.

Campos principales:

```js
{
  nombre: "Martina",
  apellido: "López",
  dni: "50111222",
  fechaNacimiento: "2015-04-12",
  direccion: "Calle 41 N° 120",
  obraSocial: "IOMA",
  actividadId: "id_de_la_actividad",
  tutorNombre: "Laura López",
  tutorTelefono: "+54 9 221...",
  fechaAlta: "2026-03-05",
  estado: "activo", // activo | baja
  fotoUrl: "",
  autorizacionImagen: true,
  observaciones: "",
  creadoEn: serverTimestamp(),
  actualizadoEn: serverTimestamp()
}
```

## Qué quedó conectado

- Listado de alumnos de actividades.
- Agregar alumno.
- Editar alumno.
- Dar de baja alumno.
- Eliminar definitivamente un alumno dado de baja.
- Ficha y carnet de alumno leen estos datos.

## Estado actual

Por ahora siguen en localStorage:

- Pagos de actividades.
- Pagos de socios.
- Socios de fútbol.

La próxima migración recomendada es `pagosActividades`, porque depende de los alumnos que ahora ya están en Firestore.
