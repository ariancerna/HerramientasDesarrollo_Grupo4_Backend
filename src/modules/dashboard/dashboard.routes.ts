import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import * as controller from './dashboard.controller';

const router = Router();

// DSH-01
router.get('/admin', requireAuth, requireRole('ADM'), controller.admin);
// DSH-02
router.get('/profesor', requireAuth, requireRole('PROF'), controller.profesor);
// DSH-03
router.get('/alumno', requireAuth, requireRole('ALU'), controller.alumno);

export default router;
