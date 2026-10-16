import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateQuery } from '../../middlewares/validate.middleware';
import * as controller from './reportes.controller';
import { exportAsistenciaSchema, filtroAsistenciaBaseSchema } from './reportes.schema';

const router = Router();

// REP-01
router.get('/asistencia', requireAuth, requireRole('ADM'), validateQuery(filtroAsistenciaBaseSchema), controller.validarRango, controller.asistencia);
// REP-02
router.get('/asistencia/export', requireAuth, requireRole('ADM'), validateQuery(exportAsistenciaSchema), controller.validarRango, controller.exportarAsistencia);

export default router;
