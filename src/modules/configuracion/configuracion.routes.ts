import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody, validateQuery } from '../../middlewares/validate.middleware';
import * as controller from './configuracion.controller';
import { configClubSchema, miConfigQuerySchema, miConfigSchema } from './configuracion.schema';

const router = Router();

// CFG-01 / CFG-02
router.get('/me/configuracion', requireAuth, validateQuery(miConfigQuerySchema), controller.miConfig);
router.patch('/me/configuracion', requireAuth, validateQuery(miConfigQuerySchema),
  validateBody(miConfigSchema), controller.actualizarMiConfig);
// CFG-03 / CFG-04 (opcionales)
router.get('/configuracion/club', requireAuth, requireRole('ADM'), controller.configClub);
router.put('/configuracion/club', requireAuth, requireRole('ADM'), validateBody(configClubSchema), controller.actualizarConfigClub);

export default router;
