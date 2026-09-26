import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import * as controller from './auth.controller';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyCodeSchema,
} from './auth.schema';

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
// AUTH-05 — registro por DNI (decisión #2: el alumno ya debe existir)
router.post('/register', validateBody(registerSchema), controller.register);
// AUTH-07
router.post('/password/forgot', validateBody(forgotPasswordSchema), controller.forgotPassword);
// AUTH-08
router.post('/password/verify', validateBody(verifyCodeSchema), controller.verifyCode);
// AUTH-09
router.post('/password/reset', validateBody(resetPasswordSchema), controller.resetPassword);
// AUTH-10
router.patch('/password', requireAuth, validateBody(changePasswordSchema), controller.changePassword);

export default router;