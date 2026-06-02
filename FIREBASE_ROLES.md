# Roles y permisos - CEDI LOS 15

La app usa Firebase Authentication para iniciar sesión y Firestore para guardar permisos.

## Colección de permisos

Cada usuario autorizado debe tener un documento en:

```txt
usuarios/{UID_DE_FIREBASE_AUTH}
```

Campos recomendados:

```js
email: "usuario@email.com"
nombre: "Nombre Apellido"
rol: "admin" | "secretaria" | "comision" | "entrenador"
activo: true
categoria: "2013" // solo obligatorio para rol entrenador
```

## Roles

### admin
Puede acceder a todo: configuración, usuarios, socios, actividades, pagos, deudores, comprobantes y carnets.

### secretaria
Puede operar socios, actividades, pagos, comprobantes y carnets. No gestiona usuarios ni configuración sensible.

### comision
Puede consultar información general, deudores/reportes y carnets, sin registrar pagos ni editar datos sensibles.

### entrenador
Solo ve la sección Socios / Carnets. La app filtra automáticamente por la categoría cargada en su perfil de Firestore.

El entrenador no ve:

- Inicio / dashboard administrativo.
- Pagos.
- Deudores.
- Actividades.
- Configuración.
- Datos administrativos del socio.
- Historial de pagos.
- Link de pago.

El entrenador sí puede:

- Ver jugadores de su categoría.
- Abrir el carnet.
- Descargar el carnet.
- Abrir el carnet público.

## Gestión desde la app

En `Configuración → Usuarios y permisos`, el administrador puede:

- Crear perfil de permisos para un usuario ya creado en Firebase Auth.
- Editar nombre, email, rol, estado y categoría.
- Activar/desactivar acceso.
- Eliminar el perfil de permisos.

Importante: esto no crea ni elimina cuentas de Firebase Authentication. Primero se crea el usuario en Firebase Auth y luego se carga su UID en la app.
