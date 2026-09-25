import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import * as controller from './anuncios.controller';
import { actualizarAnuncioSchema, crearAnuncioSchema } from './anuncios.schema';

const router = Router();

// ANU-01..05 (agregar /me/anuncios → ANU-06)
// TODO: ajustar roles exactos según docs/ENDPOINTS.md (algunos endpoints de este
// módulo son de solo lectura para ALU/PROF, o tienen reglas de alcance por rol).
router.get('/', requireAuth, controller.list);
router.get('/:id', requireAuth, controller.getById);
router.post('/', requireAuth, requireRole('ADM'), validateBody(crearAnuncioSchema), controller.create);
router.put('/:id', requireAuth, requireRole('ADM'), validateBody(actualizarAnuncioSchema), controller.update);
router.delete('/:id', requireAuth, requireRole('ADM'), controller.remove);

export default router;
