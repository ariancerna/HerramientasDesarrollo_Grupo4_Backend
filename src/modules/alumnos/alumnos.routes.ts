import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import * as controller from './alumnos.controller';
import { actualizarAlumnoSchema, crearAlumnoSchema } from './alumnos.schema';

const router = Router();

// ALU-01..07 (además, agregar aquí /me/perfil* → ALU-08..11)
// TODO: ajustar roles exactos según docs/ENDPOINTS.md (algunos endpoints de este
// módulo son de solo lectura para ALU/PROF, o tienen reglas de alcance por rol).
router.get('/', requireAuth, controller.list);
router.get('/:id', requireAuth, controller.getById);
router.post('/', requireAuth, requireRole('ADM'), validateBody(crearAlumnoSchema), controller.create);
router.put('/:id', requireAuth, requireRole('ADM'), validateBody(actualizarAlumnoSchema), controller.update);
router.delete('/:id', requireAuth, requireRole('ADM'), controller.remove);

export default router;
