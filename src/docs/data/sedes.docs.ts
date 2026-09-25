import { registerDocs } from '../registry';

registerDocs({
  nombre: 'SED — Sedes',
  responsable: 'Eduardo',
  endpoints: [
    { id: 'SED-01', metodo: 'GET', ruta: '/sedes', descripcion: 'Lista de sedes', acceso: 'Todos', implementado: true },
    { id: 'SED-02', metodo: 'GET', ruta: '/sedes/:id', descripcion: 'Detalle de una sede', acceso: 'Todos', implementado: true },
    { id: 'SED-03', metodo: 'POST', ruta: '/sedes', descripcion: 'Crea {nombre, direccion?}', acceso: 'ADM', implementado: true },
    { id: 'SED-04', metodo: 'PUT', ruta: '/sedes/:id', descripcion: 'Edita una sede', acceso: 'ADM', implementado: true },
    { id: 'SED-05', metodo: 'DELETE', ruta: '/sedes/:id', descripcion: 'Elimina (409 si tiene profesores asignados)', acceso: 'ADM', implementado: true },
  ],
});