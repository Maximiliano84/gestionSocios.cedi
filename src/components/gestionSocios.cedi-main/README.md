# CEDI LOS 15 - Gestión de Socios

Base inicial limpia para continuar el desarrollo de la app administrativa del club.

## Stack actual

- React
- Vite
- Tailwind CSS
- React Router
- Datos administrativos conectados a Firebase/Firestore
- QR, PDF/imagen de carnet y exportaciones CSV/Excel

## Cómo correr el proyecto

```bash
npm install
npm run dev
```

Para compilar:

```bash
npm run build
```

## Usuarios demo

- Admin: `admin@cedilos15.com` / `admin123`
- Secretaria: `secretaria@cedilos15.com` / `secre123`
- Comisión: `comision@cedilos15.com` / `comi123`
- Entrenador: `entrenador@cedilos15.com` / `entre123`

## Qué se limpió

- Se quitó el backend de Emergent/Mongo porque la base real la vamos a armar nosotros.
- Se migró la base de CRA/CRACO a Vite.
- Se quitaron componentes UI no usados.
- Se quitaron dependencias innecesarias.
- `src/lib/api.js` funciona como capa de servicios sobre Firebase/Firestore.
- `src/data/mockData.js` conserva solo configuración base de respaldo.

## Próximo paso recomendado

Antes de conectar Firebase, conviene revisar módulo por módulo:

1. Socios
2. Pagos
3. Cuotas
4. Deudores
5. Carnet/QR
6. Roles y permisos
7. Firebase Auth + Firestore + Storage
