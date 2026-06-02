# Reglas de seguridad recomendadas para Firestore

Esta app ya usa Firebase Auth y lee los permisos desde la colección `usuarios`.
Cada documento debe tener como ID el UID de Firebase Authentication.

Ejemplo:

```txt
usuarios/{uid}
  nombre: "Maximiliano"
  email: "admin@cedilos15.com"
  rol: "admin" // admin | secretaria | comision | entrenador
  activo: true
  categoria: "2015" // opcional para entrenador
```

## Reglas sugeridas

Pegá esto en **Firestore Database > Rules**.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function profile() {
      return get(/databases/$(database)/documents/usuarios/$(request.auth.uid));
    }

    function hasProfile() {
      return signedIn() && exists(/databases/$(database)/documents/usuarios/$(request.auth.uid));
    }

    function isActive() {
      return hasProfile() && profile().data.activo == true;
    }

    function role() {
      return profile().data.rol;
    }

    function isAdmin() {
      return isActive() && (role() == 'admin' || role() == 'administrador');
    }

    function isSecretary() {
      return isActive() && role() == 'secretaria';
    }

    function isCommission() {
      return isActive() && (role() == 'comision' || role() == 'comisión');
    }

    function isTrainer() {
      return isActive() && role() == 'entrenador';
    }

    function canReadAdminData() {
      return isAdmin() || isSecretary() || isCommission() || isTrainer();
    }

    function canWriteAdminData() {
      return isAdmin() || isSecretary();
    }

    match /usuarios/{userId} {
      allow read: if isActive();
      allow create, update, delete: if isAdmin();
    }

    match /configuracion/{docId} {
      allow read: if isActive();
      allow create, update, delete: if isAdmin();
    }

    match /actividades/{docId} {
      allow read: if canReadAdminData();
      allow create, update, delete: if canWriteAdminData();
    }

    match /alumnosActividades/{docId} {
      allow read: if canReadAdminData();
      allow create, update: if canWriteAdminData();
      allow delete: if isAdmin() || isSecretary();
    }

    match /pagosActividades/{docId} {
      allow read: if canReadAdminData();
      allow create, update, delete: if canWriteAdminData();
    }

    match /socios/{docId} {
      allow read: if canReadAdminData();
      allow create, update: if canWriteAdminData();
      allow delete: if isAdmin();
    }

    match /pagosSocios/{docId} {
      allow read: if isAdmin() || isSecretary() || isCommission();
      allow create, update, delete: if canWriteAdminData();
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Nota importante sobre “Ver carnet público”

El enlace de carnet público actualmente necesita calcular estado de cuota usando datos reales.
Con reglas seguras, un usuario anónimo no debería leer `socios`, `alumnosActividades` ni pagos completos.

Para un carnet realmente público y seguro, el próximo paso recomendado es crear una colección separada:

```txt
carnetsPublicos/{id}
```

con datos mínimos y no sensibles:

```js
{
  tipo: "socio",
  nombre: "Juan",
  apellido: "Pérez",
  categoria: "2015",
  estado: "activo",
  estadoCuota: "al_dia",
  fotoUrl: "",
  autorizacionImagen: true,
  actualizadoEn: ...
}
```

Ahí sí se puede permitir lectura pública solo de `carnetsPublicos`, sin exponer DNI, teléfonos, direcciones, obra social ni pagos.
