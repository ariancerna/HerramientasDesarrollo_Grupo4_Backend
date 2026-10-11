import { registerDocs } from '../registry';

registerDocs({
  nombre: 'DSH — Dashboard',
  responsable: 'Andre',
  endpoints: [
    { id: 'DSH-01', metodo: 'GET', ruta: '/dashboard/admin', descripcion: 'Resumen del club: alumnos, asistencias de hoy, pagos, agenda y últimos registros. Contrato: docs/DASHBOARD.md.', acceso: 'ADM', implementado: true },
    { id: 'DSH-02', metodo: 'GET', ruta: '/dashboard/profesor', descripcion: 'Categorías y alumnos asignados, seguimiento de evaluaciones y próximas sesiones del profesor autenticado. Contrato: docs/DASHBOARD.md.', acceso: 'PROF', implementado: true },
    { id: 'DSH-03', metodo: 'GET', ruta: '/dashboard/alumno', descripcion: 'Mensualidad, asistencias del mes, próxima actividad, anuncios enviados y movimientos del alumno vinculado al token. Contrato: docs/DASHBOARD.md.', acceso: 'ALU', implementado: true },
  ],
});
