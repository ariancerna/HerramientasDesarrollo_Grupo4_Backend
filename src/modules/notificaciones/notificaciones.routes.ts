import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.middleware';
import * as controller from './notificaciones.controller';
import { crearNotificacionSchema, listarNotificacionesSchema,
  notificacionParamsSchema } from './notificaciones.schema';

const router = Router();
router.get('/me/notificaciones', requireAuth, validateQuery(listarNotificacionesSchema), controller.list);
// NOT-03 — antes de /:id para que "leer-todas" no se lea como un UUID.
router.post('/me/notificaciones/leer-todas', requireAuth, controller.markAllRead);
router.get('/me/notificaciones/:id',requireAuth, validateParams(notificacionParamsSchema), controller.getById);
router.patch('/me/notificaciones/:id/leida', requireAuth, validateParams(notificacionParamsSchema), controller.markRead);
router.delete('/me/notificaciones/:id', requireAuth, validateParams(notificacionParamsSchema), controller.remove);
router.post('/notificaciones', requireAuth, requireRole('ADM'), validateBody(crearNotificacionSchema), controller.create);

export default router;
