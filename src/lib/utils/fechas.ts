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

/** Hora HH:mm en America/Lima para un instante dado. */
export function horaEnLima(instante: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA_CLUB, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instante);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)!.value;
  return `${valor('hour')}:${valor('minute')}`;
}

/**
 * ¿La fecha (y opcionalmente la hora HH:mm) ya pasó en America/Lima?
 * Sin hora, solo se considera pasada si es anterior a hoy.
 */
export function yaPasoEnLima(fecha: string, hora?: string, ahora: Date = new Date()): boolean {
  const hoy = fechaEnLima(ahora);
  if (fecha !== hoy) return fecha < hoy;
  return hora ? hora.slice(0, 5) <= horaEnLima(ahora) : false;
}

/** ¿La fecha YYYY-MM-DD es posterior a hoy en America/Lima? */
export function esFechaFutura(fecha: string, ahora: Date = new Date()): boolean {
  return fecha > fechaEnLima(ahora);
}
