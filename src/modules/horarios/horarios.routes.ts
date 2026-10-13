import { Router } from 'express';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.middleware';
import { categoriaParamsSchema } from '../categorias/categorias.schema';
import { crearHorarioSchema, actualizarHorarioSchema, horarioParamsSchema, horariosQuerySchema } from './horarios.schema';
import * as controller from './horarios.controller';
// El router padre aplica requireAuth antes de montar este router.
const router = Router({ mergeParams: true });
router.get('/', validateParams(categoriaParamsSchema), validateQuery(horariosQuerySchema), controller.list);
router.get('/:horarioId', validateParams(horarioParamsSchema), controller.getById);
router.post('/', requireRole('ADM'), validateParams(categoriaParamsSchema), validateBody(crearHorarioSchema), controller.create);
router.put('/:horarioId', requireRole('ADM'), validateParams(horarioParamsSchema), validateBody(actualizarHorarioSchema), controller.update);
router.patch('/:horarioId', requireRole('ADM'), validateParams(horarioParamsSchema), validateBody(actualizarHorarioSchema), controller.update);
router.delete('/:horarioId', requireRole('ADM'), validateParams(horarioParamsSchema), controller.remove);
export default router;
