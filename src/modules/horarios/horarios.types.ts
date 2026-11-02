import type { diasHorario } from './horarios.schema';

export interface HorarioRow {
  id: string;
  categoria_id: string;
  dia: typeof diasHorario[number];
  hora_inicio: string;
  hora_fin: string;
  cancha: string | null;
  estado: 'activo' | 'cancelado';
  created_at: string;
}

export type HorarioChanges = Partial<Pick<HorarioRow,
  'dia' | 'hora_inicio' | 'hora_fin' | 'cancha' | 'estado'>>;

export interface HorarioDto {
  id: string;
  categoriaId: string;
  dia: HorarioRow['dia'];
  horaInicio: string;
  horaFin: string;
  cancha: string | null;
  estado: HorarioRow['estado'];
  createdAt: string;
}
