/**
 * Rutas del front a las que apuntan las notificaciones generadas por el
 * servidor (campo `href`). Ajustarlas aquí al integrar con el front.
 */
export const RUTAS_FRONT = {
  asistenciaAlumno: '/alumno/asistencia',
  pagosAlumno: '/alumno/pagos',
  anunciosAlumno: '/alumno/anuncios',
} as const;
