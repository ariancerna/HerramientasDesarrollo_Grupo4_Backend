import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import * as controller from './usuarios.controller';
import { crearCuentaSchema, estadoSchema } from './usuarios.schema';

const router = Router();

// USR-01 — nota: se monta también como /alumnos/:id/cuenta en routes/index.ts
router.post('/:id/cuenta', requireAuth, requireRole('ADM'), validateBody(crearCuentaSchema), controller.crearCuenta);
// USR-02
router.patch('/:id/estado', requireAuth, requireRole('ADM'), validateBody(estadoSchema), controller.actualizarEstado);
// USR-03
router.post('/:id/reset-password', requireAuth, requireRole('ADM'), controller.resetPassword);

export default router;
