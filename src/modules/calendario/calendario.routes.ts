import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import * as controller from './calendario.controller';
import { actualizarEventoSchema, crearEventoSchema } from './calendario.schema';

const router = Router();

// CAL-01..04 (agregar /calendario/actividades → CAL-05)
// TODO: ajustar roles exactos según docs/ENDPOINTS.md (algunos endpoints de este
// módulo son de solo lectura para ALU/PROF, o tienen reglas de alcance por rol).
router.get('/', requireAuth, controller.list);
router.get('/:id', requireAuth, controller.getById);
router.post('/', requireAuth, requireRole('ADM'), validateBody(crearEventoSchema), controller.create);
router.put('/:id', requireAuth, requireRole('ADM'), validateBody(actualizarEventoSchema), controller.update);
router.delete('/:id', requireAuth, requireRole('ADM'), controller.remove);

export default router;
