import { Router } from "express";

// =======================================================
// Importación de todas las rutas de los módulos
// =======================================================
import authRoutes from "../modules/auth/auth.routes";
import usuariosRoutes from "../modules/usuarios/usuarios.routes";
import sedesRoutes from "../modules/sedes/sedes.routes";
import categoriasRoutes from "../modules/categorias/categorias.routes";
import profesoresRoutes from "../modules/profesores/profesores.routes";
import alumnosRoutes from "../modules/alumnos/alumnos.routes";
import asistenciasRoutes from "../modules/asistencias/asistencias.routes"; // <-- TU ÉPICA (ASI)
import pagosRoutes from "../modules/pagos/pagos.routes";
import calendarioRoutes from "../modules/calendario/calendario.routes"; // <-- TU ÉPICA (CAL)
import evaluacionesRoutes from "../modules/evaluaciones/evaluaciones.routes";
import anunciosRoutes from "../modules/anuncios/anuncios.routes";
import notificacionesRoutes from "../modules/notificaciones/notificaciones.routes";
import reportesRoutes from "../modules/reportes/reportes.routes";
import dashboardRoutes from "../modules/dashboard/dashboard.routes";
import configuracionRoutes from "../modules/configuracion/configuracion.routes";

const router = Router();

// =======================================================
// Registro de Endpoints (Rutas base)
// =======================================================

// Épica: AUTH — Autenticación
router.use("/auth", authRoutes);

// Épica: USR — Cuentas de acceso
router.use("/usuarios", usuariosRoutes);

// Épica: SED — Sedes
router.use("/sedes", sedesRoutes);

// Épica: CAT — Categorías
router.use("/categorias", categoriasRoutes);

// Épica: PRF — Profesores
router.use("/profesores", profesoresRoutes);

// Épica: ALU — Alumnos y perfil
router.use("/alumnos", alumnosRoutes);

// Épica: ASI — Asistencia
router.use("/asistencias", asistenciasRoutes);

// Épica: PAG — Pagos / mensualidades
router.use("/pagos", pagosRoutes);

// Épica: CAL — Calendario y eventos
router.use("/calendario", calendarioRoutes);

// Épica: EVA — Evaluaciones
router.use("/evaluaciones", evaluacionesRoutes);

// Épica: ANU — Anuncios
router.use("/anuncios", anunciosRoutes);

// Épica: NOT — Notificaciones
router.use("/notificaciones", notificacionesRoutes);

// Épica: REP — Reportes
router.use("/reportes", reportesRoutes);

// Épica: DSH — Resúmenes de inicio
router.use("/dashboard", dashboardRoutes);

// Épica: CFG — Configuración
router.use("/configuracion", configuracionRoutes);

export default router;
