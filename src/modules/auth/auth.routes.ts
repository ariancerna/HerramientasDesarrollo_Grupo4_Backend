import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import * as controller from './auth.controller';
import { loginSchema, refreshSchema } from './auth.schema';

const router = Router();

// AUTH-01
router.post('/login', validateBody(loginSchema), controller.login);
// AUTH-02
router.post('/logout', requireAuth, controller.logout);
// AUTH-03
router.post('/refresh', validateBody(refreshSchema), controller.refresh);
// AUTH-04
router.get('/me', requireAuth, controller.me);
// AUTH-06
router.get('/usuario-disponible', controller.usuarioDisponible);

// TODO — pendientes de definir con el equipo (ver decisión #2 en docs/ENDPOINTS.md):
// AUTH-05  POST /auth/register
// AUTH-07  POST /auth/password/forgot
// AUTH-08  POST /auth/password/verify
// AUTH-09  POST /auth/password/reset
// AUTH-10  PATCH /auth/password

export default router;
