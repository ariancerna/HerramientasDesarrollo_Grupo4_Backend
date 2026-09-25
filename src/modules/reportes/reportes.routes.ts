import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import * as controller from './reportes.controller';

const router = Router();

// REP-01
router.get('/asistencia', requireAuth, requireRole('ADM'), controller.asistencia);
// REP-02
router.get('/asistencia/export', requireAuth, requireRole('ADM'), controller.exportarAsistencia);

export default router;
