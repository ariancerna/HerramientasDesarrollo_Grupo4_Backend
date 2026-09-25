import { supabaseAdmin } from '../../config/supabase';

// TODO: cada función debe combinar varias tablas (alumnos, asistencias, pagos,
// eventos/horarios) según lo descrito en DSH-01/02/03 de docs/ENDPOINTS.md.

export async function resumenAdmin() {
  // ejemplo de arranque:
  const { count: totalAlumnos } = await supabaseAdmin.from('alumnos').select('*', { count: 'exact', head: true });
  return {
    alumnos: { total: totalAlumnos ?? 0, activos: 0, inactivos: 0 },
    asistenciasHoy: 0,
    pagos: { vencidos: 0, pendientes: 0 },
    proximasActividades: [],
  };
}

export async function resumenProfesor(profesorId: string) {
  return { categorias: [], alumnosAsignados: 0, proximasSesiones: [], misEvaluaciones: [] };
}

export async function resumenAlumno(estudianteId: string) {
  return { mensualidadActual: null, asistenciasDelMes: 0, proximaActividad: null, anuncios: [], movimientos: [] };
}
