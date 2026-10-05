import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { upload } from '../../middlewares/upload.middleware';
import * as controller from './alumnos.controller';
import { actualizarAlumnoSchema, crearAlumnoSchema } from './alumnos.schema';

const router = Router();

// ALU-08: Mis datos + categoría
router.get('/me/perfil', requireAuth, requireRole('ALU'), controller.getProfile);

// ALU-09: Actualizar mi perfil
router.patch('/me/perfil', requireAuth, requireRole('ALU'), controller.updateProfile);

// ALU-10: Subir foto de perfil
router.put('/me/perfil/foto', requireAuth, requireRole('ALU'), upload.single('foto'), controller.uploadProfilePhoto);

// ALU-11: Quitar foto de perfil
router.delete('/me/perfil/foto', requireAuth, requireRole('ALU'), controller.deleteProfilePhoto);

// ALU-03: Buscar alumno por DNI
router.get('/dni/:dni', requireAuth, requireRole('ADM', 'PROF'), controller.getByDni);

// ALU-02: Detalle de alumno
router.get('/:id', requireAuth, controller.getById);

// ALU-04: Crear alumno
router.post('/', requireAuth, requireRole('ADM'), validateBody(crearAlumnoSchema), controller.create);

// ALU-05: Editar alumno
router.put('/:id', requireAuth, requireRole('ADM'), validateBody(actualizarAlumnoSchema), controller.update);

// ALU-06: Cambiar estado
router.patch('/:id/estado', requireAuth, requireRole('ADM'), controller.updateState);

// ALU-07: Eliminar alumno
router.delete('/:id', requireAuth, requireRole('ADM'), controller.remove);

// ALU-01: Listado paginado
router.get('/', requireAuth, controller.list);

export default router;
