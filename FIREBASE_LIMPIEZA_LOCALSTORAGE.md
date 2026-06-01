# Limpieza de localStorage / datos mock

En esta versión los datos administrativos se leen y escriben en Firestore.

Ya no se persisten en `localStorage`:

- socios
- pagos de socios
- actividades
- alumnos de actividades
- pagos de actividades
- usuarios/perfiles

La app elimina automáticamente la clave vieja:

```js
cedi_mock_db_v1
```

Solo se conserva localmente la sesión mínima del usuario:

```js
cedi_token
cedi_user
```

Esos datos se usan para compatibilidad interna de la app, pero los permisos reales salen desde Firestore.
