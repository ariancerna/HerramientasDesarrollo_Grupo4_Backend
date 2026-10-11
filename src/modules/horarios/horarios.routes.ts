import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody, validateParams } from '../../middlewares/validate.middleware';
import { actualizarHorarioSchema, horarioParamsSchema } from './horarios.schema';
import * as controller from './horarios.controller';

const router = Router({ mergeParams: true });

// HOR-03 / SCRUM-99: eliminación física del horario de la categoría indicada.
router.delete('/:horarioId', requireAuth, requireRole('ADM'),
  validateParams(horarioParamsSchema), controller.eliminar);

// HOR-04 / SCRUM-100: edición parcial de campos y estado.
router.patch('/:horarioId', requireAuth, requireRole('ADM'),
  validateParams(horarioParamsSchema), validateBody(actualizarHorarioSchema), controller.actualizar);

export default router;
