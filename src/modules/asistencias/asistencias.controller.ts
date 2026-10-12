import { Request, Response } from "express";
import { AsistenciasService } from "./asistencias.service";
import { AsistenciaSchema } from "./asistencias.schema";

export class AsistenciasController {
  static async getAsistencias(req: Request, res: Response) {
    try {
      const asistencias = await AsistenciasService.obtenerTodas();
      res.status(200).json({ success: true, data: asistencias });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createAsistencia(req: Request, res: Response) {
    try {
      // Validar datos de entrada con Zod
      const validatedData = AsistenciaSchema.parse(req.body);
      const nuevaAsistencia = await AsistenciasService.registrar(validatedData);

      res.status(201).json({ success: true, data: nuevaAsistencia });
    } catch (error: any) {
      res
        .status(400)
        .json({ success: false, message: error.errors || error.message });
    }
  }
}
