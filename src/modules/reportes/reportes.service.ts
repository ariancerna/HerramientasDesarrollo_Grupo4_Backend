import * as repository from './reportes.repository';

export async function reporteAsistencia(filtros: {
  categoriaId?: string;
  desde: string;
  hasta: string;
  metodo?: string;
}) {
  const registros = await repository.obtenerRegistrosAsistencia(filtros);

  // TODO: calcular indicadores reales (REP-01):
  // totalAsistencias, estudiantesUnicos, diasConActividad, promedioPorDia,
  // porcentajeEscaneo, porCategoria[], porFecha[]
  const indicadores = {
    totalAsistencias: registros.length,
    estudiantesUnicos: 0,
    diasConActividad: 0,
    promedioPorDia: 0,
    porcentajeEscaneo: 0,
    porCategoria: [],
    porFecha: [],
  };

  return { registros, indicadores };
}

export async function exportarAsistenciaCsv(filtros: {
  categoriaId?: string;
  desde: string;
  hasta: string;
  metodo?: string;
}) {
  const { registros } = await reporteAsistencia(filtros);
  // TODO: convertir `registros` a CSV real (encabezados + filas).
  const header = 'alumno,dni,categoria,fecha,hora,metodo';
  return [header].join('\n') + '\n' + registros.map(() => '').join('\n');
}
