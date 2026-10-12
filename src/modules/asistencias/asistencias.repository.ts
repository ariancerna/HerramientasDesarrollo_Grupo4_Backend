import { supabaseAdmin } from "../../config/supabase";
import { AsistenciaDTO } from "./asistencias.schema";

export class AsistenciasRepository {
  static async findAll() {
    const { data, error } = await supabaseAdmin.from("asistencias").select("*");
    if (error) throw new Error(error.message);
    return data;
  }

  static async findByAlumno(alumno_id: string) {
    const { data, error } = await supabaseAdmin
      .from("asistencias")
      .select("*")
      .eq("alumno_id", alumno_id);
    if (error) throw new Error(error.message);
    return data;
  }

  static async create(asistencia: AsistenciaDTO) {
    const { data, error } = await supabaseAdmin
      .from("asistencias")
      .insert([asistencia])
      .select();
    if (error) throw new Error(error.message);
    return data[0];
  }
}
