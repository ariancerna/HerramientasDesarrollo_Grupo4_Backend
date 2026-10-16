import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateQuery } from '../../middlewares/validate.middleware';
import * as controller from './reportes.controller';
import { filtroAsistenciaSchema } from './reportes.schema';

const router = Router();

// REP-01
router.get('/asistencia', requireAuth, requireRole('ADM'), validateQuery(filtroAsistenciaSchema), controller.asistencia);
// REP-02
router.get('/asistencia/export', requireAuth, requireRole('ADM'), validateQuery(filtroAsistenciaSchema), controller.exportarAsistencia);

export default router;
