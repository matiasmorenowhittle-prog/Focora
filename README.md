# Focora

Organizador de tareas con priorizacion asistida, modo enfoque, plan diario, sistema de recompensas, analisis IA estructurado y sincronizacion opcional con Supabase.

Focora nace de la idea "foco + ahora": una app para estudiantes que no solo lista pendientes, sino que ayuda a decidir por donde empezar y recompensa el avance real.

## Objetivo

Crear una app web para registrar tareas, clasificarlas, recibir recomendaciones, reforzar el habito de completar pendientes mediante recompensas y guardar progreso con login/base de datos cuando Supabase este configurado.

## Funciones

- Agregar tareas con categoria, nota, tiempo estimado y fecha limite.
- Marcar tareas como pendientes, en progreso o completadas.
- Eliminar tareas.
- Filtrar por todas, pendientes, en progreso y completadas.
- Guardar datos en el navegador con `localStorage`.
- Generar una recomendacion automatica de enfoque.
- Mostrar dashboard con progreso y tiempo pendiente.
- Clasificar tareas en una matriz prioridad/esfuerzo.
- Generar un plan del dia con bloques horarios sugeridos.
- Crear etiquetas automaticas segun palabras clave.
- Sumar XP al completar tareas.
- Subir de nivel segun progreso acumulado.
- Mantener racha diaria de productividad.
- Desbloquear logros por constancia y tareas importantes.
- Mostrar una celebracion breve al completar una tarea.
- Generar un analisis IA local con diagnostico, subtareas y estrategia anti-procrastinacion.
- Mostrar datos tecnicos preparados para conectar luego con un backend/API en modo discreto.
- Usar login opcional con Supabase Auth.
- Sincronizar tareas, XP, racha y logros en una tabla protegida por RLS.
- Mostrar una experiencia de cuenta con modos de ingreso/registro, validacion y estados de carga.

## Diferenciacion

- Menos decision: recomienda una siguiente mejor accion.
- Mas motivacion: convierte tareas completadas en XP, niveles, rachas y logros.
- Enfoque academico: prioriza entregables, tiempo estimado y fechas limite.
- Continuidad: puede recuperar progreso con login y base de datos.

## Como abrir

Abre `index.html` en el navegador.

## Aprendizaje

Este proyecto practica HTML, CSS, JavaScript, manipulacion del DOM, persistencia local, priorizacion por reglas, gamificacion, autenticacion, sincronizacion de estado y preparacion de contratos de datos para IA.

## Configurar Supabase

1. Crea un proyecto en Supabase.
2. En SQL Editor, ejecuta el contenido de `supabase-schema.sql`.
3. Copia Project URL y anon public key.
4. Pegalos en `supabase-config.js`.
5. Sube a GitHub Pages estos archivos junto con el resto del proyecto.

La app funciona sin Supabase usando `localStorage`. Supabase solo se activa cuando `supabase-config.js` tiene URL y anon key.

## Proxima version

Agregar recompensas editables por el usuario y crear un backend seguro para conectar la app a una API real de IA sin exponer claves privadas en el frontend.
