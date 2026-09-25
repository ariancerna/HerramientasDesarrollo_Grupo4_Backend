/**
 * Este archivo es la ÚNICA lista de módulos que se muestran en /api/v1/docs.
 *
 * Cuando programes tu módulo:
 *   1. Copia cualquiera de estos archivos como plantilla (ej. sedes.docs.ts)
 *      y ponle el nombre de tu módulo, ej. alumnos.docs.ts
 *   2. Llena el array `endpoints` con los IDs de docs/ENDPOINTS.md que te tocan
 *      (implementado: false hasta que de verdad funcione, luego lo cambias a true)
 *   3. Agrega UNA línea aquí abajo: import './alumnos.docs';
 *
 * No hace falta tocar nada más — el registro y el HTML se arman solos.
 */
import './sys.docs';
import './auth.docs';
import './usuarios.docs';
import './sedes.docs';

// TODO equipo — agregar aquí cuando cada quien programe su módulo:
// import './categorias.docs';
// import './profesores.docs';
// import './alumnos.docs';
// import './asistencias.docs';
// import './pagos.docs';
// import './calendario.docs';
// import './evaluaciones.docs';
// import './anuncios.docs';
// import './notificaciones.docs';
// import './reportes.docs';
// import './dashboard.docs';
// import './configuracion.docs';