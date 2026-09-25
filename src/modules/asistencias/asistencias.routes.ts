import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import * as controller from './asistencias.controller';
import { actualizarAsistenciaSchema, crearAsistenciaSchema } from './asistencias.schema';

const router = Router();

// ASI-01..04 (además, agregar aquí /me/asistencias → ASI-05)
// TODO: ajustar roles exactos según docs/ENDPOINTS.md (algunos endpoints de este
// módulo son de solo lectura para ALU/PROF, o tienen reglas de alcance por rol).
router.get('/', requireAuth, controller.list);
router.get('/:id', requireAuth, controller.getById);
router.post('/', requireAuth, requireRole('ADM'), validateBody(crearAsistenciaSchema), controller.create);
router.put('/:id', requireAuth, requireRole('ADM'), validateBody(actualizarAsistenciaSchema), controller.update);
router.delete('/:id', requireAuth, requireRole('ADM'), controller.remove);

export default router;
