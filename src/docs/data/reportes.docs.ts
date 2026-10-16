import { registerDocs } from '../registry';

const filtros = [
  { name: 'desde', in: 'query' as const, required: true, schema: { type: 'string', format: 'date' } },
  { name: 'hasta', in: 'query' as const, required: true, schema: { type: 'string', format: 'date' } },
  { name: 'categoriaId', in: 'query' as const, schema: { type: 'string', format: 'uuid' } },
  { name: 'metodo', in: 'query' as const, schema: { type: 'string', enum: ['ESCANEO', 'MANUAL'] } },
];
registerDocs({ nombre: 'REP — Reportes', responsable: 'Rodrigo', endpoints: [
  { id: 'REP-01', metodo: 'GET', ruta: '/reportes/asistencia',
    descripcion: 'Registros e indicadores de asistencia en el rango inclusivo; promedio sobre todos los días del rango',
    acceso: 'ADM', implementado: true, queryParams: filtros },
  { id: 'REP-02', metodo: 'GET', ruta: '/reportes/asistencia/export',
    descripcion: 'Descarga CSV UTF-8 con los registros de asistencia del mismo filtro',
    acceso: 'ADM', implementado: true, queryParams: filtros,
    responses: { '200': { description: 'Archivo CSV', content: { 'text/csv': { schema: { type: 'string' } } } } } },
] });
