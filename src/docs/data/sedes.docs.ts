import { registerDocs } from '../registry';

registerDocs({
  nombre: 'SED — Sedes',
  responsable: 'Eduardo',
  endpoints: [
    { id: 'SED-01', metodo: 'GET', ruta: '/sedes', descripcion: 'Lista de sedes', acceso: 'Todos', implementado: true },
    {
      id: 'SED-02', metodo: 'GET', ruta: '/sedes/:id', descripcion: 'Detalle de una sede (SCRUM-52)',
      acceso: 'Todos', implementado: true,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': { description: 'Sede encontrada', content: { 'application/json': { schema: {
          type: 'object', required: ['data'], properties: { data: {
            type: 'object', required: ['id', 'nombre', 'direccion', 'created_at'], properties: {
              id: { type: 'string', format: 'uuid' }, nombre: { type: 'string' },
              direccion: { type: 'string', nullable: true }, created_at: { type: 'string', format: 'date-time' },
            },
          } },
        } } } },
        '500': { description: 'Fallo inesperado de base de datos' },
      },
    },
    { id: 'SED-03', metodo: 'POST', ruta: '/sedes', descripcion: 'Crea {nombre, direccion?}', acceso: 'ADM', implementado: true },
    { id: 'SED-04', metodo: 'PUT', ruta: '/sedes/:id', descripcion: 'Edita una sede', acceso: 'ADM', implementado: true },
    { id: 'SED-05', metodo: 'DELETE', ruta: '/sedes/:id', descripcion: 'Elimina (409 si tiene profesores asignados)', acceso: 'ADM', implementado: true },
  ],
});
