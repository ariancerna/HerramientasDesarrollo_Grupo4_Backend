/** Zona horaria del club: la "fecha" de negocio nunca se calcula en UTC (regla #2). */
export const ZONA_CLUB = 'America/Lima';

/** Fecha YYYY-MM-DD en America/Lima para un instante dado. */
export function fechaEnLima(instante: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_CLUB, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instante);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)!.value;
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

/** Valida una fecha de calendario real en formato YYYY-MM-DD. */
export function esFechaValida(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
