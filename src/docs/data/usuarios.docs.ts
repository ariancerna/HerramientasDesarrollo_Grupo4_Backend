import { registerDocs } from '../registry';

registerDocs({
  nombre: 'USR — Cuentas de acceso',
  responsable: 'Eduardo',
  endpoints: [
    { id: 'USR-02', metodo: 'PATCH', ruta: '/usuarios/:id/estado', descripcion: '{activo} bloquear / habilitar acceso', acceso: 'ADM', implementado: true },
    { id: 'USR-01', metodo: 'POST', ruta: '/alumnos/:id/cuenta', descripcion: 'El admin crea usuario+contraseña para un alumno existente', acceso: 'ADM', implementado: true },
    { id: 'USR-03', metodo: 'POST', ruta: '/usuarios/:id/reset-password', descripcion: '{nuevaPassword} el admin restablece la contraseña de un alumno o profesor', acceso: 'ADM', implementado: true },
  ],
});