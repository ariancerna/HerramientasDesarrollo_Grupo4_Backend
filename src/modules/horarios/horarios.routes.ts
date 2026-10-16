import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.middleware';
import { categoriaParamsSchema } from '../categorias/categorias.schema';
import { crearHorarioSchema, actualizarHorarioSchema, estadoHorarioSchema, horarioParamsSchema, horariosQuerySchema, misHorariosQuerySchema } from './horarios.schema';
import * as controller from './horarios.controller';
// El router padre aplica requireAuth antes de montar este router.
const router = Router({ mergeParams: true });
router.get('/', validateParams(categoriaParamsSchema), validateQuery(horariosQuerySchema), controller.list);
router.get('/:horarioId', validateParams(horarioParamsSchema), controller.getById);
router.post('/', requireRole('ADM'), validateParams(categoriaParamsSchema), validateBody(crearHorarioSchema), controller.create);
router.put('/:horarioId', requireRole('ADM'), validateParams(horarioParamsSchema), validateBody(actualizarHorarioSchema), controller.update);
router.patch('/:horarioId', requireRole('ADM'), validateParams(horarioParamsSchema), validateBody(actualizarHorarioSchema), controller.update);
// HOR-04 — cancelar / reactivar una clase (solo ADM, decisión #6)
router.patch('/:horarioId/estado', requireRole('ADM'), validateParams(horarioParamsSchema), validateBody(estadoHorarioSchema), controller.update);
router.delete('/:horarioId', requireRole('ADM'), validateParams(horarioParamsSchema), controller.remove);

/** HOR-05 — "Mi horario" del profesor; se monta en /me/horarios. */
export const meHorariosRoutes = Router();
meHorariosRoutes.get('/', requireAuth, requireRole('PROF'), validateQuery(misHorariosQuerySchema), controller.mine);

export default router;
