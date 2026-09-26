import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import * as controller from './usuarios.controller';
import { crearCuentaSchema, estadoSchema, resetPasswordSchema } from './usuarios.schema';

const router = Router();

// USR-02
router.patch('/:id/estado', requireAuth, requireRole('ADM'), validateBody(estadoSchema), controller.actualizarEstado);
// USR-03
router.post('/:id/reset-password', requireAuth, requireRole('ADM'), validateBody(resetPasswordSchema), controller.resetPassword);

/** USR-01 — se monta aparte, bajo /alumnos, en routes/index.ts. */
export const alumnoCuentaRoutes = Router();
alumnoCuentaRoutes.post('/:id/cuenta', requireAuth, requireRole('ADM'), validateBody(crearCuentaSchema), controller.crearCuenta);

export default router;