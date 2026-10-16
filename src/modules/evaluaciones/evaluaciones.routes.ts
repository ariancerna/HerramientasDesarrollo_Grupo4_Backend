import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.middleware';
import * as controller from './evaluaciones.controller';
import {
  actualizarEvaluacionSchema,
  crearEvaluacionSchema,
  evaluacionParamsSchema,
  listarEvaluacionesSchema,
} from './evaluaciones.schema';

const router = Router();

// EVA-01
router.get('/', requireAuth, requireRole('PROF', 'ADM'), validateQuery(listarEvaluacionesSchema), controller.list);
// EVA-02
router.post('/', requireAuth, requireRole('PROF'), validateBody(crearEvaluacionSchema), controller.create);
// EVA-03
router.put('/:id', requireAuth, requireRole('PROF'), validateParams(evaluacionParamsSchema),
  validateBody(actualizarEvaluacionSchema), controller.update);
// EVA-04
router.delete('/:id', requireAuth, requireRole('PROF'), validateParams(evaluacionParamsSchema), controller.remove);

export default router;
