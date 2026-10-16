import { Router } from 'express';

// =======================================================
// Importación de todas las rutas de los módulos
// =======================================================
import authRoutes from '../modules/auth/auth.routes';
import usuariosRoutes, { alumnoCuentaRoutes } from '../modules/usuarios/usuarios.routes';
import sedesRoutes from '../modules/sedes/sedes.routes';
import categoriasRoutes from '../modules/categorias/categorias.routes';
import { meHorariosRoutes } from '../modules/horarios/horarios.routes';
import profesoresRoutes, { meCategoriasRoutes } from '../modules/profesores/profesores.routes';
import alumnosRoutes, { mePerfilRoutes } from '../modules/alumnos/alumnos.routes';
import asistenciasRoutes, { meAsistenciasRoutes } from '../modules/asistencias/asistencias.routes';
import pagosRoutes, { mePagosRoutes } from '../modules/pagos/pagos.routes';
import calendarioRoutes, { eventosRoutes } from '../modules/calendario/calendario.routes';
import evaluacionesRoutes from '../modules/evaluaciones/evaluaciones.routes';
import anunciosRoutes, { meAnunciosRoutes } from '../modules/anuncios/anuncios.routes';
import notificacionesRoutes from '../modules/notificaciones/notificaciones.routes';
import reportesRoutes from '../modules/reportes/reportes.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import configuracionRoutes from '../modules/configuracion/configuracion.routes';

const router = Router();

// =======================================================
// Registro de Endpoints (Rutas base)
// =======================================================

// Épica: AUTH — Autenticación
router.use('/auth', authRoutes);

// Épica: USR — Cuentas de acceso
router.use('/usuarios', usuariosRoutes);
router.use('/alumnos', alumnoCuentaRoutes);

// Épica: SED — Sedes
router.use('/sedes', sedesRoutes);

// Épica: CAT — Categorías (HOR-01..04 cuelgan de /categorias/:id/horarios)
router.use('/categorias', categoriasRoutes);
// HOR-05 — Mi horario (PROF)
router.use('/me/horarios', meHorariosRoutes);

// Épica: PRF — Profesores
router.use('/profesores', profesoresRoutes);
// PRF-06 — Mis categorías (PROF)
router.use('/me/categorias', meCategoriasRoutes);

// Épica: ALU — Alumnos y perfil
router.use('/alumnos', alumnosRoutes);
// ALU-08..11 — Mi perfil (ALU)
router.use('/me/perfil', mePerfilRoutes);

// Épica: ASI — Asistencia
router.use('/asistencias', asistenciasRoutes);
router.use('/me/asistencias', meAsistenciasRoutes);

// Épica: PAG — Pagos / mensualidades
router.use('/pagos', pagosRoutes);
router.use('/me/pagos', mePagosRoutes);

// Épica: CAL — Calendario y eventos
router.use('/eventos', eventosRoutes);
router.use('/calendario', calendarioRoutes);

// Épica: EVA — Evaluaciones
router.use('/evaluaciones', evaluacionesRoutes);

// Épica: ANU — Anuncios
router.use('/anuncios', anunciosRoutes);
router.use('/me/anuncios', meAnunciosRoutes);

// Épica: NOT — Notificaciones
router.use('/', notificacionesRoutes);

// Épica: REP — Reportes
router.use('/reportes', reportesRoutes);

// Épica: DSH — Resúmenes de inicio
router.use('/dashboard', dashboardRoutes);

// Épica: CFG — Configuración
// El router declara /me/configuracion y /configuracion/club: no repetir el prefijo.
router.use('/', configuracionRoutes);

export default router;
