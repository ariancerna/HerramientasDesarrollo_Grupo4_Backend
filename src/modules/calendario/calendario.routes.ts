import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { CalendarioController } from "./calendario.controller";
import { ActualizarCalendarioSchema, CalendarioSchema } from "./calendario.schema";

const router = Router();

router.get("/", requireAuth, CalendarioController.getEventos);
router.get("/:id", requireAuth, CalendarioController.getEvento);
router.post("/", requireAuth, requireRole("ADM"), validateBody(CalendarioSchema), CalendarioController.createEvento);
router.put("/:id", requireAuth, requireRole("ADM"), validateBody(ActualizarCalendarioSchema), CalendarioController.updateEvento);
router.delete("/:id", requireAuth, requireRole("ADM"), CalendarioController.deleteEvento);

export default router;
