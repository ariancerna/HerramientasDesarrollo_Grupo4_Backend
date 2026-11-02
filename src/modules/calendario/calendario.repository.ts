import { supabaseAdmin } from "../../config/supabase";
import { ActualizarCalendarioDTO } from "./calendario.schema";

const SELECT = "*, categorias(nombre)";

/** Convierte la fila de Supabase al formato que usa el frontend. */
function presentar(row: any) {
  return {
    id: row.id,
    titulo: row.titulo,
    fecha: row.fecha,
    horaInicio: String(row.hora_inicio).slice(0, 5),
    horaFin: row.hora_fin ? String(row.hora_fin).slice(0, 5) : undefined,
    ubicacion: row.ubicacion,
    categoriaId: row.categoria_id ?? undefined,
    categoria: row.categorias?.nombre ?? undefined,
    descripcion: row.descripcion ?? "",
  };
}

function aFila(evento: ActualizarCalendarioDTO) {
  const fila: Record<string, unknown> = {};
  if (evento.titulo !== undefined) fila.titulo = evento.titulo;
  if (evento.fecha !== undefined) fila.fecha = evento.fecha;
  if (evento.horaInicio !== undefined) fila.hora_inicio = evento.horaInicio;
  if (evento.horaFin !== undefined) fila.hora_fin = evento.horaFin || null;
  if (evento.ubicacion !== undefined) fila.ubicacion = evento.ubicacion;
  if (evento.categoriaId !== undefined) fila.categoria_id = evento.categoriaId || null;
  if (evento.descripcion !== undefined) fila.descripcion = evento.descripcion;
  return fila;
}

export class CalendarioRepository {
  static async findAll() {
    const { data, error } = await supabaseAdmin
      .from("eventos")
      .select(SELECT)
      .order("fecha")
      .order("hora_inicio");
    if (error) throw error;
    return (data ?? []).map(presentar);
  }

  static async findById(id: string) {
    const { data, error } = await supabaseAdmin
      .from("eventos")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? presentar(data) : null;
  }

  static async create(evento: ActualizarCalendarioDTO) {
    const { data, error } = await supabaseAdmin
      .from("eventos")
      .insert(aFila(evento))
      .select(SELECT)
      .single();
    if (error) throw error;
    return presentar(data);
  }

  static async update(id: string, cambios: ActualizarCalendarioDTO) {
    const { data, error } = await supabaseAdmin
      .from("eventos")
      .update(aFila(cambios))
      .eq("id", id)
      .select(SELECT)
      .maybeSingle();
    if (error) throw error;
    return data ? presentar(data) : null;
  }

  static async remove(id: string) {
    const { data, error } = await supabaseAdmin
      .from("eventos")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) throw error;
    return (data ?? []).length > 0;
  }
}
