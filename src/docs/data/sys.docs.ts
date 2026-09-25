import { registerDocs } from '../registry';

registerDocs({
  nombre: 'SYS — Sistema',
  responsable: 'Eduardo',
  endpoints: [
    { id: 'SYS-01', metodo: 'GET', ruta: '/health', descripcion: 'Estado del servicio y conexión a Supabase', acceso: 'Público', implementado: true },
    { id: 'SYS-02', metodo: 'GET', ruta: '/docs', descripcion: 'Esta página: catálogo de endpoints del backend', acceso: 'Público (solo dev)', implementado: true },
  ],
});