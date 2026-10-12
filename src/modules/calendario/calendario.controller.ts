import { Request, Response } from "express";
import { CalendarioService } from "./calendario.service";
import { CalendarioSchema } from "./calendario.schema";

export class CalendarioController {
  static async getEventos(req: Request, res: Response) {
    try {
      const eventos = await CalendarioService.obtenerTodos();
      res.status(200).json({ success: true, data: eventos });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createEvento(req: Request, res: Response) {
    try {
      // Validamos los datos con Zod antes de pasarlos al servicio
      const validatedData = CalendarioSchema.parse(req.body);
      const nuevoEvento = await CalendarioService.registrar(validatedData);

      res.status(201).json({ success: true, data: nuevoEvento });
    } catch (error: any) {
      res
        .status(400)
        .json({ success: false, message: error.errors || error.message });
    }
  }
}
