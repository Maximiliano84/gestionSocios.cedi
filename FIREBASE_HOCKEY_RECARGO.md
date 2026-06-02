# Regla especial: Hockey

La actividad Hockey puede configurarse con vencimiento y recargo por pago fuera de término.

Campos agregados a cada actividad en Firestore:

```js
{
  diaVencimiento: 10,
  recargoFueraTermino: 3000
}
```

Comportamiento:

- Si la actividad se llama `Hockey`, al crearla desde Configuración se completan por defecto:
  - vencimiento día 10
  - recargo $3000
- El recargo se calcula por cada mes seleccionado cuando la fecha de pago supera el vencimiento de ese mes.
- Ejemplo: si se paga mayo el día 11/05 o después, se suma $3000 por mayo.
- Si se paga junio antes del 10/06, no se suma recargo.
- La deuda de alumnos de Hockey también contempla el recargo cuando corresponde.

Esto se mantiene dentro del módulo Actividades, sin crear una página exclusiva para Hockey.

## Corrección aplicada

- Si un alumno se inscribe después del día de vencimiento, el primer mes de alta no genera recargo.
- El recargo se aplica desde los meses siguientes cuando corresponda.
- La lista y la ficha muestran una advertencia de cuota vencida cuando el mes adeudado ya superó el vencimiento.
