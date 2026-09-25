import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import * as controller from './categorias.controller';
import { actualizarCategoriaSchema, crearCategoriaSchema } from './categorias.schema';

const router = Router();

// CAT-01..05 y HOR-01..05 (horarios anidados: agregar aquí /:id/horarios)
// TODO: ajustar roles exactos según docs/ENDPOINTS.md (algunos endpoints de este
// módulo son de solo lectura para ALU/PROF, o tienen reglas de alcance por rol).
router.get('/', requireAuth, controller.list);
router.get('/:id', requireAuth, controller.getById);
router.post('/', requireAuth, requireRole('ADM'), validateBody(crearCategoriaSchema), controller.create);
router.put('/:id', requireAuth, requireRole('ADM'), validateBody(actualizarCategoriaSchema), controller.update);
router.delete('/:id', requireAuth, requireRole('ADM'), controller.remove);

export default router;
