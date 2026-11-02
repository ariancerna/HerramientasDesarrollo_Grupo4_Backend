import { NextFunction, Request, Response } from "express";
import { created, ok } from "../../lib/utils/response";
import { CalendarioService } from "./calendario.service";

export class CalendarioController {
  static async getEventos(_req: Request, res: Response, next: NextFunction) {
    try {
      ok(res, await CalendarioService.obtenerTodos());
    } catch (error) {
      next(error);
    }
  }

  static async getEvento(req: Request, res: Response, next: NextFunction) {
    try {
      ok(res, await CalendarioService.obtenerPorId(req.params.id));
    } catch (error) {
      next(error);
    }
  }

  static async createEvento(req: Request, res: Response, next: NextFunction) {
    try {
      created(res, await CalendarioService.registrar(req.body));
    } catch (error) {
      next(error);
    }
  }

  static async updateEvento(req: Request, res: Response, next: NextFunction) {
    try {
      ok(res, await CalendarioService.actualizar(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  }

  static async deleteEvento(req: Request, res: Response, next: NextFunction) {
    try {
      await CalendarioService.eliminar(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
