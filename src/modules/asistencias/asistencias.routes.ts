import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.middleware';
import * as controller from './asistencias.controller';
import {
  actualizarAsistenciaSchema,
  asistenciaParamsSchema,
  crearAsistenciaSchema,
  listarAsistenciasSchema,
  misAsistenciasSchema,
} from './asistencias.schema';

const router = Router();
export const meAsistenciasRoutes = Router();

// ASI-01
router.post('/', requireAuth, requireRole('PROF', 'ADM'), validateBody(crearAsistenciaSchema), controller.create);
// ASI-02
router.get('/', requireAuth, requireRole('ADM', 'PROF'), validateQuery(listarAsistenciasSchema), controller.list);
// ASI-03
router.patch('/:id', requireAuth, requireRole('ADM'), validateParams(asistenciaParamsSchema),
  validateBody(actualizarAsistenciaSchema), controller.update);
// ASI-04
router.delete('/:id', requireAuth, requireRole('ADM'), validateParams(asistenciaParamsSchema), controller.remove);

// ASI-05 — se monta en /me/asistencias
meAsistenciasRoutes.get('/', requireAuth, requireRole('ALU'), validateQuery(misAsistenciasSchema), controller.mine);

export default router;
