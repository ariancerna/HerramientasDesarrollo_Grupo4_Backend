import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import * as controller from './anuncios.controller';
import { actualizarAnuncioSchema, crearAnuncioSchema } from './anuncios.schema';

const router = Router();

// ANU-01..06: lectura con alcance por rol (el alumno ve los enviados a él);
// el profesor redacta, envía y gestiona sus anuncios.
router.get('/', requireAuth, controller.list);
router.get('/:id', requireAuth, controller.getById);
router.post('/', requireAuth, requireRole('PROF'), validateBody(crearAnuncioSchema), controller.create);
router.put('/:id', requireAuth, requireRole('PROF'), validateBody(actualizarAnuncioSchema), controller.update);
router.delete('/:id', requireAuth, requireRole('PROF'), controller.remove);

export default router;
