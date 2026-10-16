import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.middleware';
import * as controller from './profesores.controller';
import { actualizarProfesorSchema, crearProfesorSchema, profesorParamsSchema, profesoresQuerySchema, asignarCategoriasSchema } from './profesores.schema';
const router = Router();
router.use(requireAuth, requireRole('ADM'));
router.get('/', validateQuery(profesoresQuerySchema), controller.list);
router.get('/:id', validateParams(profesorParamsSchema), controller.getById);
router.post('/', validateBody(crearProfesorSchema), controller.create);
router.put('/:id', validateParams(profesorParamsSchema), validateBody(actualizarProfesorSchema), controller.update);
router.delete('/:id', validateParams(profesorParamsSchema), controller.remove);
router.put('/:id/categorias', validateParams(profesorParamsSchema), validateBody(asignarCategoriasSchema), controller.asignarCategorias);
export default router;

/** PRF-06 — se monta en /me/categorias. */
export const meCategoriasRoutes = Router();
meCategoriasRoutes.get('/', requireAuth, requireRole('PROF'), controller.misCategorias);
