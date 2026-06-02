# Roles reales con Firebase Auth + Firestore

La app ahora usa Firebase Authentication para iniciar sesión y Firestore para leer el rol del usuario.

## Colección requerida

Crear una colección en Firestore:

```txt
usuarios
```

Cada documento debe tener como ID el `uid` del usuario creado en Firebase Authentication.

Ejemplo de documento:

```js
{
  nombre: "Maximiliano",
  email: "admin@cedilos15.com",
  rol: "administrador",
  activo: true,
  categoria: ""
}
```

## Roles aceptados

La app acepta estos valores:

```txt
administrador  -> se normaliza internamente como admin
admin          -> admin
secretaria
comision
comisión       -> comision
entrenador
consulta       -> entrenador
```

## Reglas sugeridas para etapa de desarrollo controlada

Estas reglas permiten que un usuario logueado lea su propio perfil. Para datos reales de socios y pagos todavía hay que endurecerlas antes de producción.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /usuarios/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }
  }
}
```

## Importante

Si el usuario existe en Authentication pero no tiene documento en `usuarios/{uid}`, la app no lo deja entrar.

Si `activo` está en `false`, la app cierra la sesión y muestra un mensaje.
