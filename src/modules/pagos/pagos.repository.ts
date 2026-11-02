import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { ApiError } from '../../lib/errors/api-error';
import type { CrearPagoInput } from './pagos.schema';

const TABLE = 'pagos';
const PAGE_SIZE = 500;
const BATCH_SIZE = 100;

export interface PagoRow {
  id: string;
  alumno_id: string;
  periodo: string;
  monto: number | string;
  estado: 'pendiente' | 'pagado' | 'vencido';
  fecha_pago: string | null;
  metodo_pago: string | null;
  codigo_operacion: string | null;
  vencimiento: string | null;
}

export interface AlumnoRow {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  codigo: string | null;
}

export interface CrearPagoRepositoryInput extends CrearPagoInput {
  estado?: PagoRow['estado'];
  fechaPago?: string | null;
  metodoPago?: string | null;
  codigoOperacion?: string | null;
}

export interface DetallePagoRegistrado {
  estado: PagoRow['estado'];
  fechaPago: string | null;
  metodoPago: string | null;
  codigoOperacion: string | null;
}

function columnasDePago(payload: CrearPagoRepositoryInput) {
  return {
    alumno_id: payload.estudianteId,
    periodo: payload.periodo,
    ...(payload.monto === undefined ? {} : { monto: payload.monto }),
    ...(payload.vencimiento === undefined ? {} : { vencimiento: payload.vencimiento }),
    ...(payload.estado === undefined ? {} : { estado: payload.estado }),
    ...(payload.fechaPago === undefined ? {} : { fecha_pago: payload.fechaPago }),
    ...(payload.metodoPago === undefined ? {} : { metodo_pago: payload.metodoPago }),
    ...(payload.codigoOperacion === undefined ? {} : { codigo_operacion: payload.codigoOperacion }),
  };
}

function columnasDeDetalle(payload: DetallePagoRegistrado) {
  return {
    estado: payload.estado,
    fecha_pago: payload.fechaPago,
    metodo_pago: payload.metodoPago,
    codigo_operacion: payload.codigoOperacion,
  };
}

export function crearPagosRepository(client: SupabaseClient) {
  async function findAll(filters: Record<string, unknown> = {}): Promise<PagoRow[]> {
    const pagos: PagoRow[] = [];
    for (let desde = 0; ; desde += PAGE_SIZE) {
      let query = client.from(TABLE).select('*').order('periodo', { ascending: false }).order('id');
      if (typeof filters.periodo === 'string') query = query.eq('periodo', filters.periodo);
      if (typeof filters.estado === 'string') query = query.eq('estado', filters.estado);
      if (typeof filters.estudianteId === 'string') query = query.eq('alumno_id', filters.estudianteId);
      const { data, error } = await query.range(desde, desde + PAGE_SIZE - 1).returns<PagoRow[]>();
      if (error) throw error;
      const pagina = data ?? [];
      pagos.push(...pagina);
      if (pagina.length < PAGE_SIZE) return pagos;
    }
  }

  async function findById(id: string) {
    const { data, error } = await client.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  async function findActiveStudents(): Promise<AlumnoRow[]> {
    const alumnos: AlumnoRow[] = [];
    for (let desde = 0; ; desde += PAGE_SIZE) {
      const { data, error } = await client.from('alumnos')
        .select('id,nombres,apellidos,dni,codigo')
        .eq('estado', 'activo')
        .order('id')
        .range(desde, desde + PAGE_SIZE - 1)
        .returns<AlumnoRow[]>();
      if (error) throw error;
      const pagina = data ?? [];
      alumnos.push(...pagina);
      if (pagina.length < PAGE_SIZE) return alumnos;
    }
  }

  async function findByPeriodForStudents(periodo: string, estudianteIds: string[]): Promise<PagoRow[]> {
    if (estudianteIds.length === 0) return [];
    const pagos: PagoRow[] = [];
    for (let inicio = 0; inicio < estudianteIds.length; inicio += BATCH_SIZE) {
      const lote = estudianteIds.slice(inicio, inicio + BATCH_SIZE);
      for (let desde = 0; ; desde += PAGE_SIZE) {
        const { data, error } = await client.from(TABLE).select('*')
          .eq('periodo', periodo)
          .in('alumno_id', lote)
          .order('alumno_id')
          .range(desde, desde + PAGE_SIZE - 1)
          .returns<PagoRow[]>();
        if (error) throw error;
        const pagina = data ?? [];
        pagos.push(...pagina);
        if (pagina.length < PAGE_SIZE) break;
      }
    }
    return pagos;
  }

  async function findHistoryForStudent(estudianteId: string): Promise<PagoRow[]> {
    const pagos: PagoRow[] = [];
    for (let desde = 0; ; desde += PAGE_SIZE) {
      const { data, error } = await client.from(TABLE)
        .select('*')
        .eq('alumno_id', estudianteId)
        .order('periodo', { ascending: false })
        .order('id')
        .range(desde, desde + PAGE_SIZE - 1)
        .returns<PagoRow[]>();
      if (error) throw error;
      const pagina = data ?? [];
      pagos.push(...pagina);
      if (pagina.length < PAGE_SIZE) return pagos;
    }
  }

  async function findCurrentForStudent(estudianteId: string, periodo: string): Promise<PagoRow | null> {
    const { data, error } = await client.from(TABLE).select('*')
      .eq('alumno_id', estudianteId)
      .eq('periodo', periodo)
      .maybeSingle<PagoRow>();
    if (error) throw error;
    return data ?? null;
  }

  async function findActiveStudentsWithoutPayment(periodo: string): Promise<AlumnoRow[]> {
    const alumnos = await findActiveStudents();
    if (alumnos.length === 0) return [];

    const pagos = await findByPeriodForStudents(periodo, alumnos.map((alumno) => alumno.id));
    const estudiantesConPago = new Set(pagos.map((pago) => pago.alumno_id));
    return alumnos.filter((alumno) => !estudiantesConPago.has(alumno.id));
  }

  async function create(payload: CrearPagoRepositoryInput): Promise<PagoRow> {
    const { data, error } = await client.from(TABLE)
      .insert(columnasDePago(payload))
      .select('*')
      .single<PagoRow>();
    if (error?.code === '23505') {
      throw ApiError.conflict('Ya existe un pago para este alumno y período');
    }
    if (error) throw error;
    return data;
  }

  async function update(id: string, payload: Record<string, unknown>) {
    const { data, error } = await client.from(TABLE).update(payload).eq('id', id).select('*').maybeSingle();
    if (error?.code === '23505') {
      throw ApiError.conflict('Ya existe un pago para este alumno y período');
    }
    if (error) throw error;
    if (!data) throw ApiError.notFound('Pago no encontrado');
    return data;
  }

  async function updatePaymentDetails(id: string, payload: DetallePagoRegistrado): Promise<PagoRow> {
    const { data, error } = await client.from(TABLE)
      .update(columnasDeDetalle(payload))
      .eq('id', id)
      .select('*')
      .maybeSingle<PagoRow>();
    if (error) throw error;
    if (!data) throw ApiError.notFound('Pago no encontrado');
    return data;
  }

  async function createManyIfMissing(payloads: CrearPagoRepositoryInput[]): Promise<PagoRow[]> {
    if (payloads.length === 0) return [];
    const filas = payloads.map((payload) => columnasDePago(payload));
    const { data, error } = await client.from(TABLE)
      .upsert(filas, { onConflict: 'alumno_id,periodo', ignoreDuplicates: true })
      .select('*')
      .returns<PagoRow[]>();
    if (error) throw error;
    return data ?? [];
  }

  /** CFG-03: monto y día de vencimiento configurados por el admin. */
  async function findClubConfig() {
    const { data, error } = await client.from('configuracion_club')
      .select('monto_mensualidad,dia_vencimiento').eq('id', 1).maybeSingle();
    if (error) throw error;
    return data ? { monto: Number(data.monto_mensualidad), diaVencimiento: Number(data.dia_vencimiento) } : null;
  }

  async function remove(id: string) {
    const { data, error } = await client.from(TABLE).delete().eq('id', id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw ApiError.notFound('Pago no encontrado');
  }

  return {
    findAll,
    findById,
    findActiveStudents,
    findByPeriodForStudents,
    findActiveStudentsWithoutPayment,
    findHistoryForStudent,
    findCurrentForStudent,
    create,
    update,
    updatePaymentDetails,
    createManyIfMissing,
    findClubConfig,
    remove,
  };
}

const pagosRepository = crearPagosRepository(supabaseAdmin);

export const {
  findAll,
  findById,
  findActiveStudents,
  findByPeriodForStudents,
  findActiveStudentsWithoutPayment,
  findHistoryForStudent,
  findCurrentForStudent,
  create,
  update,
  updatePaymentDetails,
  createManyIfMissing,
  findClubConfig,
  remove,
} = pagosRepository;
