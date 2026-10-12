import { Router } from "express";
import { CalendarioController } from "./calendario.controller";

const router = Router();

router.get("/", CalendarioController.getEventos);
router.post("/", CalendarioController.createEvento);

export default router;
