import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import * as controller from './pagos.controller';
import { actualizarPagoSchema, crearPagoSchema } from './pagos.schema';

const router = Router();

// PAG-01..09 (agregar rutas especiales: estado-mensual, registrar, marcar-pendiente, generar-mensualidad, y /me/pagos* → PAG-10..11)
// TODO: ajustar roles exactos según docs/ENDPOINTS.md (algunos endpoints de este
// módulo son de solo lectura para ALU/PROF, o tienen reglas de alcance por rol).
router.get('/', requireAuth, controller.list);
router.get('/:id', requireAuth, controller.getById);
router.post('/', requireAuth, requireRole('ADM'), validateBody(crearPagoSchema), controller.create);
router.put('/:id', requireAuth, requireRole('ADM'), validateBody(actualizarPagoSchema), controller.update);
router.delete('/:id', requireAuth, requireRole('ADM'), controller.remove);

export default router;
