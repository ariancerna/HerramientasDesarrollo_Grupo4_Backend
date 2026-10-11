import { registerDocs } from '../registry';
import type { OpenApiParameter } from '../types';

const parameters: OpenApiParameter[] = ['id', 'horarioId'].map((name) => ({
  name, in: 'path', required: true, schema: { type: 'string', format: 'uuid' },
}));

registerDocs({
  nombre: 'HOR — Horarios de entrenamiento',
  responsable: 'Andre',
  endpoints: [{
    id: 'HOR-03', metodo: 'DELETE', ruta: '/categorias/:id/horarios/:horarioId',
    descripcion: 'Elimina físicamente un horario de la categoría indicada (SCRUM-99)',
    acceso: 'ADM', implementado: true, parameters,
    responses: {
      '204': { description: 'Horario eliminado. Respuesta sin contenido.' },
      '409': { description: 'El horario tiene registros asociados y no puede eliminarse.' },
      '500': { description: 'Error interno del servidor.' },
    },
  }],
});
