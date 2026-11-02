import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody, validateParams } from '../../middlewares/validate.middleware';
import * as controller from './sedes.controller';
import { actualizarSedeSchema, crearSedeSchema, sedeParamsSchema } from './sedes.schema';

const router = Router();

// SED-01..05
router.get('/', requireAuth, controller.list);
router.get('/:id', requireAuth, validateParams(sedeParamsSchema), controller.getById);
router.post('/', requireAuth, requireRole('ADM'), validateBody(crearSedeSchema), controller.create);
router.put('/:id', requireAuth, requireRole('ADM'), validateParams(sedeParamsSchema), validateBody(actualizarSedeSchema), controller.update);
router.delete('/:id', requireAuth, requireRole('ADM'), validateParams(sedeParamsSchema), controller.remove);

export default router;
