import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.middleware';
import * as controller from './anuncios.controller';
import {
  actualizarAnuncioSchema,
  anuncioIdParamsSchema,
  crearAnuncioSchema,
  listarAnunciosQuerySchema,
} from './anuncios.schema';

const router = Router();

// ANU-01: ADM ve todo, PROF los que publicó, ALU los "enviado" dirigidos a él (el alcance lo aplica el service)
router.get('/', requireAuth, validateQuery(listarAnunciosQuerySchema), controller.list);
// ANU-02
router.post('/', requireAuth, requireRole('ADM', 'PROF'), validateBody(crearAnuncioSchema), controller.create);
// ANU-03
router.put(
  '/:id',
  requireAuth,
  requireRole('ADM', 'PROF'),
  validateParams(anuncioIdParamsSchema),
  validateBody(actualizarAnuncioSchema),
  controller.update,
);

// Fuera de este ticket: se dejan como en la plantilla (ANU-04/05; /me/anuncios sería ANU-06).
router.get('/:id', requireAuth, validateParams(anuncioIdParamsSchema), controller.getById);
router.delete('/:id', requireAuth, requireRole('ADM'), validateParams(anuncioIdParamsSchema), controller.remove);

export default router;
