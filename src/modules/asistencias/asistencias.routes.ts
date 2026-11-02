import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { AsistenciasController } from "./asistencias.controller";
import { ActualizarAsistenciaSchema, AsistenciaSchema } from "./asistencias.schema";

const router = Router();

router.get("/", requireAuth, AsistenciasController.getAsistencias);
router.post("/", requireAuth, requireRole("ADM", "PROF"), validateBody(AsistenciaSchema), AsistenciasController.createAsistencia);
router.patch("/:id", requireAuth, requireRole("ADM", "PROF"), validateBody(ActualizarAsistenciaSchema), AsistenciasController.updateAsistencia);

export default router;
