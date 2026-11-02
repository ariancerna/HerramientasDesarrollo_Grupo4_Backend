import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import * as controller from './evaluaciones.controller';
import { actualizarEvaluacionSchema, crearEvaluacionSchema } from './evaluaciones.schema';

const router = Router();

// EVA-01..04: lectura con alcance por rol; el profesor registra y gestiona sus evaluaciones.
router.get('/', requireAuth, controller.list);
router.get('/:id', requireAuth, controller.getById);
router.post('/', requireAuth, requireRole('PROF'), validateBody(crearEvaluacionSchema), controller.create);
router.put('/:id', requireAuth, requireRole('PROF'), validateBody(actualizarEvaluacionSchema), controller.update);
router.delete('/:id', requireAuth, requireRole('PROF'), controller.remove);

export default router;
