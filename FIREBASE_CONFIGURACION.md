# Configuración conectada a Firestore

Esta versión ya conecta la configuración general de la app con Firestore.

## Colección usada

Crear o dejar que la app cree este documento:

```txt
configuracion/general
```

Campos esperados:

```js
{
  nombreClub: "CEDI LOS 15",
  cuotaMensual: 10000,
  linkPago: "https://...",
  aliasPago: "CEDILOS15.MP",
  telefonoContacto: "+54 ...",
  logoUrl: "/logo-cedi.png",
  mensajeWhatsapp: "Hola, familia...",
  categorias: ["2012", "2013", "2014"],
  actividades: [
    { id: "act_patin", nombre: "Patín", profesor: "A definir", cuotaMensual: 12000 }
  ],
  actualizadoEn: serverTimestamp()
}
```

## Qué ya se guarda en Firestore

- Datos del club.
- Cuota mensual de fútbol.
- Link/alias de pago.
- Teléfono de contacto.
- Mensaje de WhatsApp.
- Categorías de fútbol.
- Actividades, profesor/a y cuota mensual.

## Estado actual

- Socios.
- Pagos de socios.
- Alumnos de actividades.
- Pagos de actividades.

Esto es intencional. Primero migramos Configuración porque es el módulo menos riesgoso.

## Reglas sugeridas para esta etapa

Estas reglas permiten que usuarios logueados lean configuración y solo administradores la modifiquen.
Requieren que cada usuario tenga un documento en `usuarios/{uid}` con campo `rol` o `role`.

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

    function isActive() {
      return signedIn() && userDoc().data.activo != false;
    }

    function role() {
      return userDoc().data.rol != null ? userDoc().data.rol : userDoc().data.role;
    }

    function isAdmin() {
      return isActive() && (role() == 'administrador' || role() == 'admin');
    }

    match /usuarios/{userId} {
      allow read: if signedIn() && request.auth.uid == userId;
      allow write: if isAdmin();
    }

    match /configuracion/{docId} {
      allow read: if isActive();
      allow write: if isAdmin();
    }
  }
}
```

Cuando migremos socios, pagos y actividades a Firestore, habrá que ampliar estas reglas.
