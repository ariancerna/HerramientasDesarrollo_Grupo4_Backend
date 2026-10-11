import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateParams } from '../../middlewares/validate.middleware';
import { horarioParamsSchema } from './horarios.schema';
import * as controller from './horarios.controller';

const router = Router({ mergeParams: true });

// HOR-03 / SCRUM-99: eliminación física del horario de la categoría indicada.
router.delete('/:horarioId', requireAuth, requireRole('ADM'),
  validateParams(horarioParamsSchema), controller.eliminar);

export default router;
