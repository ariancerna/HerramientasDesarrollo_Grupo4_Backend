/** Contrato público de los tres resúmenes DSH. */
export interface ActividadDashboard {
  id: string;
  tipo: 'entrenamiento' | 'evento';
  titulo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string | null;
  ubicacion: string;
  categoriaId: string | null;
  categoria: string | null;
}

export interface PagoDashboard {
  id: string;
  periodo: string;
  monto: number;
  estado: 'pagado' | 'pendiente' | 'vencido';
  vencimiento: string | null;
  fechaPago: string | null;
  metodoPago: string | null;
}

export interface AsistenciaDashboard {
  id: string;
  estudianteId: string;
  estudiante: string;
  categoria: string | null;
  fechaHora: string;
  metodo: 'ESCANEO' | 'MANUAL';
}

export interface EvaluacionDashboard {
  id: string;
  alumnoId: string;
  fecha: string;
  rendimientoTecnico: number | null;
  rendimientoFisico: number | null;
  actitud: number | null;
  observaciones: string;
}

export interface AnuncioDashboard {
  id: string;
  titulo: string;
  mensaje: string;
  fechaCreacion: string;
}

export interface MovimientoDashboard {
  id: string;
  tipo: 'asistencia' | 'pago';
  fecha: string;
  titulo: string;
  detalle: string;
}

export interface ResumenAdmin {
  alumnos: { total: number; activos: number; inactivos: number };
  asistenciasHoy: number;
  pagos: { vencidos: number; pendientes: number };
  proximasActividades: ActividadDashboard[];
  ultimosRegistros: AsistenciaDashboard[];
}

export interface ResumenProfesor {
  categorias: { id: string; nombre: string }[];
  alumnosAsignados: number;
  alumnosSinEvaluacion: number;
  proximasSesiones: ActividadDashboard[];
  misEvaluaciones: EvaluacionDashboard[];
}

export interface ResumenAlumno {
  mensualidadActual: PagoDashboard | null;
  asistenciasDelMes: number;
  proximaActividad: ActividadDashboard | null;
  anuncios: AnuncioDashboard[];
  movimientos: MovimientoDashboard[];
}
