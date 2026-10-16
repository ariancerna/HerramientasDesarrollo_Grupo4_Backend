import * as repository from './reportes.repository';
import type { FiltroAsistencia } from './reportes.schema';

function redondear(value: number) { return Math.round(value * 100) / 100; }

export async function reporteAsistencia(filtros: FiltroAsistencia) {
  const registros = await repository.obtenerRegistrosAsistencia(filtros);
  const detalles = await repository.obtenerDetalles(registros);
  const categorias = new Map<string, number>();
  const fechas = new Map<string, number>();
  for (const row of registros) {
    const categoriaId = row.categoria_id ?? '';
    categorias.set(categoriaId, (categorias.get(categoriaId) ?? 0) + 1);
    fechas.set(row.fecha, (fechas.get(row.fecha) ?? 0) + 1);
  }
  const diasEnRango = Math.round((Date.parse(filtros.hasta) - Date.parse(filtros.desde)) / 86400000) + 1;
  const indicadores = {
    totalAsistencias: registros.length,
    estudiantesUnicos: new Set(registros.map((row) => row.alumno_id)).size,
    diasConActividad: fechas.size,
    promedioPorDia: redondear(registros.length / diasEnRango),
    porcentajeEscaneo: registros.length
      ? redondear(100 * registros.filter((row) => row.metodo === 'ESCANEO').length / registros.length) : 0,
    porCategoria: [...categorias].map(([categoriaId, total]) => ({
      categoriaId: categoriaId || null,
      categoria: categoriaId ? detalles.categorias.get(categoriaId)?.nombre ?? 'Categoría no disponible' : 'Sin categoría',
      total,
    })).sort((a, b) => a.categoria.localeCompare(b.categoria)),
    porFecha: [...fechas].map(([fecha, total]) => ({ fecha, total })).sort((a, b) => a.fecha.localeCompare(b.fecha)),
  };
  return { registros: registros.map((row) => {
    const alumno = detalles.alumnos.get(row.alumno_id);
    return {
      id: row.id, alumnoId: row.alumno_id,
      alumno: alumno ? `${alumno.nombres} ${alumno.apellidos}` : 'Alumno no disponible',
      dni: alumno?.dni ?? '', categoriaId: row.categoria_id,
      categoria: row.categoria_id ? detalles.categorias.get(row.categoria_id)?.nombre ?? 'Categoría no disponible' : 'Sin categoría',
      fecha: row.fecha, fechaHora: row.fecha_hora, metodo: row.metodo,
    };
  }), indicadores };
}

function celdaCsv(value: string) {
  const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function exportarAsistenciaCsv(filtros: FiltroAsistencia) {
  const { registros } = await reporteAsistencia(filtros);
  const encabezado = 'alumno,dni,categoria,fecha,hora,metodo';
  const filas = registros.map((row) => [row.alumno, row.dni, row.categoria, row.fecha,
    new Date(row.fechaHora).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour12: false }),
    row.metodo].map(celdaCsv).join(','));
  return '\uFEFF' + [encabezado, ...filas].join('\r\n') + '\r\n';
}
