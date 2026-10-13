import { Router } from "express";
import { AsistenciasController } from "./asistencias.controller";

const router = Router();

router.get("/", AsistenciasController.getAsistencias);
router.post("/", AsistenciasController.createAsistencia);

export default router;
