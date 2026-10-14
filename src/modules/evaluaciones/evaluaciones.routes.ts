import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.middleware';
import * as controller from './evaluaciones.controller';
import {
  actualizarEvaluacionSchema,
  crearEvaluacionSchema,
  evaluacionIdParamsSchema,
  listarEvaluacionesQuerySchema,
} from './evaluaciones.schema';

const router = Router();

// Orden de middlewares: 1) ¿logueado?  2) ¿rol permitido?  3) ¿params/query/body válidos?  4) controller

// EVA-01: ADM ve todo, PROF las de sus categorías, ALU solo las suyas (el alcance lo aplica el service)
router.get('/', requireAuth, validateQuery(listarEvaluacionesQuerySchema), controller.list);
// EVA-02
router.post('/', requireAuth, requireRole('ADM', 'PROF'), validateBody(crearEvaluacionSchema), controller.create);
// EVA-03
router.put(
  '/:id',
  requireAuth,
  requireRole('ADM', 'PROF'),
  validateParams(evaluacionIdParamsSchema),
  validateBody(actualizarEvaluacionSchema),
  controller.update,
);

// Fuera de este ticket: se dejan como en la plantilla (el alcance por rol ya lo aplica el service en getById).
router.get('/:id', requireAuth, validateParams(evaluacionIdParamsSchema), controller.getById);
router.delete('/:id', requireAuth, requireRole('ADM'), validateParams(evaluacionIdParamsSchema), controller.remove);

export default router;
