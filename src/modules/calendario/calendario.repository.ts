import { supabaseAdmin } from "../../config/supabase";
import { CalendarioDTO } from "./calendario.schema";

export class CalendarioRepository {
  static async findAll() {
    const { data, error } = await supabaseAdmin.from("eventos").select("*");
    if (error) throw new Error(error.message);
    return data;
  }

  static async findById(id: string) {
    const { data, error } = await supabaseAdmin
      .from("eventos")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async create(evento: CalendarioDTO) {
    const { data, error } = await supabaseAdmin
      .from("eventos")
      .insert([evento])
      .select();
    if (error) throw new Error(error.message);
    return data[0];
  }
}
