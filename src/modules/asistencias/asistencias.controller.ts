import { NextFunction, Request, Response } from "express";
import { created, ok } from "../../lib/utils/response";
import { AsistenciasService } from "./asistencias.service";

export class AsistenciasController {
  static async getAsistencias(req: Request, res: Response, next: NextFunction) {
    try {
      const alumnoId = typeof req.query.alumnoId === "string" ? req.query.alumnoId : undefined;
      ok(res, await AsistenciasService.obtenerTodas(req.user!, alumnoId));
    } catch (error) {
      next(error);
    }
  }

  static async createAsistencia(req: Request, res: Response, next: NextFunction) {
    try {
      created(res, await AsistenciasService.registrar(req.body));
    } catch (error) {
      next(error);
    }
  }

  static async updateAsistencia(req: Request, res: Response, next: NextFunction) {
    try {
      ok(res, await AsistenciasService.corregir(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  }
}
