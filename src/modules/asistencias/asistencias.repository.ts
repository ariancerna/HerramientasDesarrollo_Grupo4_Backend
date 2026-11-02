import { supabaseAdmin } from "../../config/supabase";

const SELECT = "id, alumno_id, fecha, fecha_hora, metodo, alumnos(dni, nombres, apellidos), categorias(nombre)";

export interface NuevaAsistencia {
  alumno_id: string;
  categoria_id: string | null;
  fecha: string;
  fecha_hora: string;
  metodo: "ESCANEO" | "MANUAL";
}

/** Convierte la fila de Supabase al formato que usa el frontend. */
function presentar(row: any) {
  const alumno = row.alumnos ?? {};
  return {
    id: row.id,
    estudianteId: row.alumno_id,
    dni: alumno.dni ?? "",
    estudiante: `${alumno.nombres ?? ""} ${alumno.apellidos ?? ""}`.trim(),
    categoria: row.categorias?.nombre ?? "",
    fechaHora: row.fecha_hora,
    metodo: row.metodo,
  };
}

export class AsistenciasRepository {
  static async findAll(alumno_id?: string) {
    let query = supabaseAdmin
      .from("asistencias")
      .select(SELECT)
      .order("fecha_hora", { ascending: false });
    if (alumno_id) query = query.eq("alumno_id", alumno_id);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(presentar);
  }

  static async findAlumno(id: string) {
    const { data, error } = await supabaseAdmin
      .from("alumnos")
      .select("id, categoria_id, estado")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async create(asistencia: NuevaAsistencia) {
    const { data, error } = await supabaseAdmin
      .from("asistencias")
      .insert(asistencia)
      .select(SELECT)
      .single();
    if (error) throw error;
    return presentar(data);
  }

  static async update(id: string, cambios: Pick<NuevaAsistencia, "fecha" | "fecha_hora" | "metodo">) {
    const { data, error } = await supabaseAdmin
      .from("asistencias")
      .update(cambios)
      .eq("id", id)
      .select(SELECT)
      .maybeSingle();
    if (error) throw error;
    return data ? presentar(data) : null;
  }
}
