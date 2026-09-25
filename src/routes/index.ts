import { Router } from 'express';

import authRoutes from '../modules/auth/auth.routes';
import usuariosRoutes from '../modules/usuarios/usuarios.routes';
import sedesRoutes from '../modules/sedes/sedes.routes';
import categoriasRoutes from '../modules/categorias/categorias.routes';
import profesoresRoutes from '../modules/profesores/profesores.routes';
import alumnosRoutes from '../modules/alumnos/alumnos.routes';
import asistenciasRoutes from '../modules/asistencias/asistencias.routes';
import pagosRoutes from '../modules/pagos/pagos.routes';
import calendarioRoutes from '../modules/calendario/calendario.routes';
import evaluacionesRoutes from '../modules/evaluaciones/evaluaciones.routes';
import anunciosRoutes from '../modules/anuncios/anuncios.routes';
import notificacionesRoutes from '../modules/notificaciones/notificaciones.routes';
import reportesRoutes from '../modules/reportes/reportes.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import configuracionRoutes from '../modules/configuracion/configuracion.routes';

const router = Router();

// Cada módulo trae sus propios roles/middlewares ya aplicados en su *.routes.ts.
// Ver docs/ENDPOINTS.md para la tabla completa (91 endpoints).
router.use('/auth', authRoutes);
router.use('/', usuariosRoutes);          // expone /alumnos/:id/cuenta, /usuarios/:id/estado, /usuarios/:id/reset-password
router.use('/sedes', sedesRoutes);
router.use('/categorias', categoriasRoutes); // incluye /categorias/:id/horarios (agregar dentro del módulo)
router.use('/profesores', profesoresRoutes);
router.use('/alumnos', alumnosRoutes);       // incluye /me/perfil* (agregar dentro del módulo)
router.use('/asistencias', asistenciasRoutes); // incluye /me/asistencias (agregar dentro del módulo)
router.use('/pagos', pagosRoutes);             // incluye /me/pagos* (agregar dentro del módulo)
router.use('/eventos', calendarioRoutes);
router.use('/', calendarioRoutes);             // expone /calendario/actividades (agregar ruta dentro del módulo)
router.use('/evaluaciones', evaluacionesRoutes);
router.use('/anuncios', anunciosRoutes);       // incluye /me/anuncios (agregar dentro del módulo)
router.use('/', notificacionesRoutes);         // expone /me/notificaciones (agregar dentro del módulo)
router.use('/reportes', reportesRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/', configuracionRoutes);          // expone /me/configuracion y /configuracion/club

export default router;
