import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.middleware';
import * as controller from './pagos.controller';
import {
  actualizarPagoSchema,
  crearPagoSchema,
  estadoMensualQuerySchema,
  generarMensualidadSchema,
  listarPagosQuerySchema,
  pagoIdParamsSchema,
  registrarPagoDirectoSchema,
  registrarPagoSchema,
} from './pagos.schema';

const router = Router();
export const mePagosRoutes = Router();

// Rutas estáticas antes de las rutas parametrizadas para evitar que Express
// interprete "registrar" o "generar-mensualidad" como un ID de pago.
router.get(
  '/estado-mensual',
  requireAuth,
  requireRole('ADM'),
  validateQuery(estadoMensualQuerySchema),
  controller.estadoMensual,
);
router.post(
  '/registrar',
  requireAuth,
  requireRole('ADM'),
  validateBody(registrarPagoDirectoSchema),
  controller.registrarDirecto,
);
router.post(
  '/generar-mensualidad',
  requireAuth,
  requireRole('ADM'),
  validateBody(generarMensualidadSchema),
  controller.generarMensualidad,
);

router.post(
  '/:id/registrar',
  requireAuth,
  requireRole('ADM'),
  validateParams(pagoIdParamsSchema),
  validateBody(registrarPagoSchema),
  controller.registrarPorId,
);
router.post(
  '/:id/marcar-pendiente',
  requireAuth,
  requireRole('ADM'),
  validateParams(pagoIdParamsSchema),
  controller.marcarPendiente,
);

router.get('/', requireAuth, requireRole('ADM'), validateQuery(listarPagosQuerySchema), controller.list);
router.post('/', requireAuth, requireRole('ADM'), validateBody(crearPagoSchema), controller.create);
router.patch(
  '/:id',
  requireAuth,
  requireRole('ADM'),
  validateParams(pagoIdParamsSchema),
  validateBody(actualizarPagoSchema),
  controller.update,
);
router.delete('/:id', requireAuth, requireRole('ADM'), validateParams(pagoIdParamsSchema), controller.remove);

// Ruta de consulta por ID conservada como operación auxiliar del módulo.
router.get('/:id', requireAuth, requireRole('ADM'), validateParams(pagoIdParamsSchema), controller.getById);

mePagosRoutes.get('/', requireAuth, requireRole('ALU'), controller.history);
mePagosRoutes.get('/actual', requireAuth, requireRole('ALU'), controller.pagoActual);

export default router;
