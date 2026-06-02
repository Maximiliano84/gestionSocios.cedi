# Firebase - Actividades

Esta versión deja las actividades independientes conectadas a Firestore.

## Colección usada

```txt
actividades
  {actividadId}
    nombre: "Patín"
    profesor: "Mariana Gómez"
    cuotaMensual: 12000
    estado: "activa"
    creadoEn
    actualizadoEn
```

## Qué se migró

- Alta de actividades.
- Edición de actividad.
- Eliminación de actividad.
- Lectura de actividades desde Firestore.
- Configuración y página Actividades usan la misma fuente.

## Estado actual

- Alumnos de actividades.
- Pagos de actividades.
- Socios de fútbol.
- Pagos de socios.

## Reglas sugeridas para desarrollo controlado

Estas reglas asumen que cada usuario tiene documento en `usuarios/{uid}` con `rol` y `activo`.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function userDoc() {
      return get(/databases/$(database)/documents/usuarios/$(request.auth.uid));
    }

    function activeUser() {
      return signedIn() && userDoc().data.activo == true;
    }

    function hasRole(roles) {
      return activeUser() && userDoc().data.rol in roles;
    }

    match /usuarios/{userId} {
      allow read: if activeUser();
      allow write: if hasRole(['administrador', 'admin']);
    }

    match /configuracion/{docId} {
      allow read: if activeUser();
      allow write: if hasRole(['administrador', 'admin']);
    }

    match /actividades/{actividadId} {
      allow read: if activeUser();
      allow create, update, delete: if hasRole(['administrador', 'admin', 'secretaria']);
    }
  }
}
```

No cargues datos reales de alumnos o socios hasta que también migremos esas colecciones y revisemos reglas específicas.
