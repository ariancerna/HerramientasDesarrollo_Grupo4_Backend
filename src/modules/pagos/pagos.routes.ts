import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.middleware';
import * as controller from './pagos.controller';
import {
  actualizarPagoSchema,
  crearPagoSchema,
  estadoMensualQuerySchema,
  listarPagosQuerySchema,
  pagoIdParamsSchema,
} from './pagos.schema';

const router = Router();
export const mePagosRoutes = Router();

router.get('/estado-mensual', requireAuth, requireRole('ADM'), validateQuery(estadoMensualQuerySchema), controller.estadoMensual);
router.get('/', requireAuth, requireRole('ADM'), validateQuery(listarPagosQuerySchema), controller.list);
router.get('/:id', requireAuth, requireRole('ADM'), validateParams(pagoIdParamsSchema), controller.getById);
router.post('/', requireAuth, requireRole('ADM'), validateBody(crearPagoSchema), controller.create);
router.put('/:id', requireAuth, requireRole('ADM'), validateParams(pagoIdParamsSchema), validateBody(actualizarPagoSchema), controller.update);
router.delete('/:id', requireAuth, requireRole('ADM'), validateParams(pagoIdParamsSchema), controller.remove);

mePagosRoutes.get('/actual', requireAuth, requireRole('ALU'), controller.pagoActual);

export default router;
