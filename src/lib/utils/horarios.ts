export interface HorarioRow {
  id: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  cancha?: string | null;
  estado?: string;
}

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

export function presentHorario(row: HorarioRow) {
  return {
    id: row.id,
    dia: row.dia.toLowerCase(),
    horaInicio: row.hora_inicio.slice(0, 5),
    horaFin: row.hora_fin.slice(0, 5),
    cancha: row.cancha,
    estado: row.estado,
  };
}

export function presentHorarios(rows: HorarioRow[]) {
  const position = (dia: string) => {
    const index = DIAS.indexOf(dia);
    return index < 0 ? DIAS.length : index;
  };
  return rows.map(presentHorario).sort((a, b) =>
    position(a.dia) - position(b.dia)
    || a.horaInicio.localeCompare(b.horaInicio)
    || a.id.localeCompare(b.id),
  );
}
