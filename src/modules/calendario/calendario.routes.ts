import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.middleware';
import * as controller from './calendario.controller';
import {
  actividadesSchema,
  actualizarEventoSchema,
  crearEventoSchema,
  eventoParamsSchema,
  listarEventosSchema,
} from './calendario.schema';

/** CAL-01..04 — se monta en /eventos */
export const eventosRoutes = Router();
eventosRoutes.get('/', requireAuth, validateQuery(listarEventosSchema), controller.list);
eventosRoutes.post('/', requireAuth, requireRole('ADM'), validateBody(crearEventoSchema), controller.create);
eventosRoutes.put('/:id', requireAuth, requireRole('ADM'), validateParams(eventoParamsSchema),
  validateBody(actualizarEventoSchema), controller.update);
eventosRoutes.delete('/:id', requireAuth, requireRole('ADM'), validateParams(eventoParamsSchema), controller.remove);

/** CAL-05 — se monta en /calendario */
const router = Router();
router.get('/actividades', requireAuth, validateQuery(actividadesSchema), controller.actividades);

export default router;
