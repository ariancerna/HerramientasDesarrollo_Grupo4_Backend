/**
 * Rutas del front a las que apuntan las notificaciones generadas por el
 * servidor (campo `href`). Ajustarlas aquí al integrar con el front.
 */
export const RUTAS_FRONT = {
  asistenciaAlumno: '/dashboard/alumno/historial',
  pagosAlumno: '/dashboard/alumno/pagos',
  // Los anuncios del alumno se muestran en su panel de inicio.
  anunciosAlumno: '/dashboard/alumno',
} as const;
