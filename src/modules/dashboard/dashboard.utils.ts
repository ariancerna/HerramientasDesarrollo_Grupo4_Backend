import type { ActividadDashboard, PagoDashboard } from './dashboard.types';

const ZONA_CLUB = 'America/Lima';
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export interface ContextoDashboard {
  ahora: Date;
  hoy: string;
  hora: string;
  inicioMes: string;
  siguienteMes: string;
}

export interface HorarioRow {
  id: string;
  categoria_id: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  cancha: string | null;
  estado: string;
}

export interface EventoRow {
  id: string;
  titulo: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  ubicacion: string;
  categoria_id: string | null;
}

/** El día/mes del club no depende del huso horario del servidor. */
export function contextoDashboard(ahora = new Date()): ContextoDashboard {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_CLUB, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(ahora);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)!.value;
  const hoy = `${valor('year')}-${valor('month')}-${valor('day')}`;
  const siguiente = new Date(Date.UTC(Number(valor('year')), Number(valor('month')), 1));
  return {
    ahora, hoy, hora: `${valor('hour')}:${valor('minute')}:${valor('second')}`,
    inicioMes: `${hoy.slice(0, 7)}-01`, siguienteMes: siguiente.toISOString().slice(0, 10),
  };
}

export function estadoPago(estado: PagoDashboard['estado'], vencimiento: string | null, hoy: string) {
  return estado === 'pendiente' && vencimiento && vencimiento < hoy ? 'vencido' : estado;
}

/** Expande horarios regulares por 35 días y los combina con eventos únicos. */
export function combinarActividades(
  categorias: { id: string; nombre: string }[], horarios: HorarioRow[],
  eventos: EventoRow[], contexto: ContextoDashboard, limite = 5,
): ActividadDashboard[] {
  const nombres = new Map(categorias.map((categoria) => [categoria.id, categoria.nombre]));
  const actividades: (ActividadDashboard & { inicio: string })[] = eventos.map((evento) => ({
    id: evento.id, tipo: 'evento', titulo: evento.titulo, fecha: evento.fecha,
    horaInicio: evento.hora_inicio.slice(0, 5), horaFin: evento.hora_fin?.slice(0, 5) ?? null,
    ubicacion: evento.ubicacion, categoriaId: evento.categoria_id,
    categoria: evento.categoria_id ? nombres.get(evento.categoria_id) ?? null : null,
    inicio: `${evento.fecha}T${evento.hora_inicio}-05:00`,
  }));
  for (let desplazamiento = 0; desplazamiento <= 35; desplazamiento += 1) {
    const dia = new Date(`${contexto.hoy}T00:00:00Z`);
    dia.setUTCDate(dia.getUTCDate() + desplazamiento);
    const fecha = dia.toISOString().slice(0, 10);
    for (const horario of horarios) {
      const nombreDia = horario.dia.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
      if (horario.estado !== 'activo' || !nombres.has(horario.categoria_id) || DIAS[dia.getUTCDay()] !== nombreDia) continue;
      actividades.push({
        id: `entrenamiento-${horario.id}-${fecha}`, tipo: 'entrenamiento', titulo: 'Entrenamiento', fecha,
        horaInicio: horario.hora_inicio.slice(0, 5), horaFin: horario.hora_fin.slice(0, 5),
        ubicacion: horario.cancha ?? 'Cancha principal', categoriaId: horario.categoria_id,
        categoria: nombres.get(horario.categoria_id)!,
        inicio: `${fecha}T${horario.hora_inicio}-05:00`,
      });
    }
  }
  return actividades
    .filter((actividad) => new Date(actividad.inicio) >= contexto.ahora)
    .sort((a, b) => a.inicio.localeCompare(b.inicio) || a.id.localeCompare(b.id))
    .slice(0, limite)
    .map(({ inicio, ...actividad }) => actividad);
}
