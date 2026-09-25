import { registerDocs } from '../registry';

registerDocs({
  nombre: 'USR — Cuentas de acceso',
  responsable: 'Eduardo',
  endpoints: [
    { id: 'USR-02', metodo: 'PATCH', ruta: '/usuarios/:id/estado', descripcion: '{activo} bloquear / habilitar acceso', acceso: 'ADM', implementado: true },
    { id: 'USR-01', metodo: 'POST', ruta: '/alumnos/:id/cuenta', descripcion: 'Crea usuario+contraseña para un alumno existente', acceso: 'ADM', implementado: false },
    { id: 'USR-03', metodo: 'POST', ruta: '/usuarios/:id/reset-password', descripcion: 'El admin restablece la contraseña de un alumno o profesor', acceso: 'ADM', implementado: false },
  ],
});