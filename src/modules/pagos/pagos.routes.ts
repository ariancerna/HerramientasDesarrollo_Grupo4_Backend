import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody, validateQuery } from '../../middlewares/validate.middleware';
import * as controller from './pagos.controller';
import {
  actualizarPagoSchema,
  crearPagoSchema,
  estadoMensualQuerySchema,
} from './pagos.schema';

const router = Router();
export const mePagosRoutes = Router();

router.get('/estado-mensual', requireAuth, requireRole('ADM'), validateQuery(estadoMensualQuerySchema), controller.estadoMensual);
router.get('/', requireAuth, requireRole('ADM'), controller.list);
router.get('/:id', requireAuth, requireRole('ADM'), controller.getById);
router.post('/', requireAuth, requireRole('ADM'), validateBody(crearPagoSchema), controller.create);
router.put('/:id', requireAuth, requireRole('ADM'), validateBody(actualizarPagoSchema), controller.update);
router.delete('/:id', requireAuth, requireRole('ADM'), controller.remove);

mePagosRoutes.get('/actual', requireAuth, requireRole('ALU'), controller.pagoActual);

export default router;
