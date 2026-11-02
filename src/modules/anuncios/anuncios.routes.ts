import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.middleware';
import * as controller from './anuncios.controller';
import {
  actualizarAnuncioSchema,
  anuncioParamsSchema,
  crearAnuncioSchema,
  listarAnunciosSchema,
  misAnunciosSchema,
} from './anuncios.schema';

const router = Router();
export const meAnunciosRoutes = Router();

router.use(requireAuth, requireRole('PROF'));
// ANU-01
router.get('/', validateQuery(listarAnunciosSchema), controller.list);
// ANU-02
router.post('/', validateBody(crearAnuncioSchema), controller.create);
// ANU-05
router.post('/:id/enviar', validateParams(anuncioParamsSchema), controller.send);
// ANU-03
router.put('/:id', validateParams(anuncioParamsSchema), validateBody(actualizarAnuncioSchema), controller.update);
// ANU-04
router.delete('/:id', validateParams(anuncioParamsSchema), controller.remove);

// ANU-06 — se monta en /me/anuncios
meAnunciosRoutes.get('/', requireAuth, requireRole('ALU'), validateQuery(misAnunciosSchema), controller.mine);

export default router;
