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

    function userProfilePath() {
      return /databases/$(database)/documents/usuarios/$(request.auth.uid);
    }

    function hasProfile() {
      return signedIn() && exists(userProfilePath());
    }

    function profile() {
      return get(userProfilePath());
    }

    function isActive() {
      return hasProfile() && profile().data.activo == true;
    }

    function role() {
      return profile().data.rol;
    }

    function userCategoria() {
      return profile().data.categoria;
    }

    function isAdmin() {
      return isActive() && (role() == "admin" || role() == "administrador");
    }

    function isSecretary() {
      return isActive() && role() == "secretaria";
    }

    function isCommission() {
      return isActive() && (role() == "comision" || role() == "comisión");
    }

    function isTrainer() {
      return isActive() && role() == "entrenador";
    }

    function canReadAdminData() {
      return isAdmin() || isSecretary() || isCommission();
    }

    function canWriteAdminData() {
      return isAdmin() || isSecretary();
    }

    function trainerCanReadSocio() {
      return isTrainer()
        && userCategoria() != null
        && resource.data.categoria == userCategoria();
    }

    match /usuarios/{userId} {
      allow read: if isAdmin() || request.auth.uid == userId;
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
      allow read: if canReadAdminData() || trainerCanReadSocio();
      allow create, update: if canWriteAdminData();
      allow delete: if isAdmin();
    }

    match /pagosSocios/{docId} {
      allow read: if canReadAdminData();
      allow create, update, delete: if canWriteAdminData();
    }

    match /carnetsPublicos/{docId} {
      allow read: if true;
      allow create, update, delete: if canWriteAdminData();
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}