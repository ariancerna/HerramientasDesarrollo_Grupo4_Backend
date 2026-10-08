import { registerDocs } from '../registry';
import { OpenApiParameter } from '../types';

const alumnoFields = {
  id: { type: 'string', format: 'uuid', description: 'Identificador único del alumno' },
  dni: { type: 'string', description: 'DNI con exactamente 8 dígitos' },
  nombres: { type: 'string', description: 'Nombres del alumno' },
  apellidos: { type: 'string', description: 'Apellidos del alumno' },
  email: { type: 'string', nullable: true, format: 'email', description: 'Correo electrónico' },
  codigo: { type: 'string', nullable: true, description: 'Código único del alumno' },
  telefono: { type: 'string', nullable: true, description: 'Teléfono de 9 dígitos' },
  categoria_id: { type: 'string', format: 'uuid', nullable: true, description: 'Identificador de la categoría' },
  estado: { type: 'string', enum: ['activo', 'inactivo'], description: 'Estado del alumno' },
  foto_url: { type: 'string', nullable: true, description: 'URL pública de la foto de perfil' },
  created_at: { type: 'string', format: 'date-time', description: 'Fecha de creación' },
};

const alumnoSchema = {
  type: 'object',
  properties: alumnoFields,
  additionalProperties: false,
};

const alumnoResponseSchema = { type: 'object', properties: { data: alumnoSchema } };
const perfilResponseSchema = {
  type: 'object',
  properties: { data: { type: 'object', properties: {
    id: alumnoFields.id, nombres: alumnoFields.nombres, apellidos: alumnoFields.apellidos,
    dni: alumnoFields.dni, codigo: alumnoFields.codigo, email: alumnoFields.email,
    telefono: alumnoFields.telefono, estado: alumnoFields.estado, foto_url: alumnoFields.foto_url,
    categoria: { type: 'string', nullable: true, description: 'Nombre de la categoría' },
  } } },
};

const paginationParams: OpenApiParameter[] = [
  { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
];

const listQueryParams: OpenApiParameter[] = [
  { name: 'texto', in: 'query', required: false, schema: { type: 'string' } },
  { name: 'categoriaId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
  { name: 'estado', in: 'query', required: false, schema: { type: 'string', enum: ['activo', 'inactivo'] } },
  ...paginationParams,
];

const createAlumnoBody = {
  type: 'object',
  required: ['dni', 'nombres', 'apellidos', 'email', 'codigo', 'categoriaId'],
  properties: {
    dni: alumnoFields.dni,
    nombres: alumnoFields.nombres,
    apellidos: alumnoFields.apellidos,
    email: alumnoFields.email,
    codigo: alumnoFields.codigo,
    telefono: alumnoFields.telefono,
    categoriaId: { type: 'string', format: 'uuid', description: 'Categoría del alumno' },
    estado: { ...alumnoFields.estado, default: 'activo' },
  },
  additionalProperties: false,
};

const updateAlumnoBody = {
  type: 'object',
  properties: {
    dni: alumnoFields.dni, nombres: alumnoFields.nombres, apellidos: alumnoFields.apellidos,
    email: alumnoFields.email, codigo: alumnoFields.codigo, telefono: alumnoFields.telefono,
    categoriaId: createAlumnoBody.properties.categoriaId,
  },
  additionalProperties: false,
};

const updateStateBody = {
  type: 'object',
  required: ['estado'],
  properties: { estado: alumnoFields.estado },
  additionalProperties: false,
};

const updateProfileBody = {
  type: 'object',
  properties: {
    nombres: alumnoFields.nombres,
    apellidos: alumnoFields.apellidos,
    email: alumnoFields.email,
    telefono: alumnoFields.telefono,
  },
  additionalProperties: false,
};

const photoUploadBody = {
  type: 'object',
  required: ['foto'],
  properties: {
    foto: {
      type: 'string',
      format: 'binary',
      description: 'Archivo de imagen JPEG, PNG o WebP de hasta 1,5 MB',
    },
  },
};

registerDocs({
  nombre: 'ALU — Alumnos y perfil',
  responsable: 'Equipo backend',
  endpoints: [
    {
      id: 'ALU-01',
      metodo: 'GET',
      ruta: '/alumnos',
      descripcion: 'Lista paginada de alumnos',
      acceso: 'ADM, PROF',
      implementado: true,
      queryParams: listQueryParams,
      responses: {
        '200': { description: 'Lista paginada de alumnos', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'object', properties: { data: { type: 'array', items: alumnoSchema }, page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } } } } } } } },
      },
    },
    {
      id: 'ALU-02',
      metodo: 'GET',
      ruta: '/alumnos/:id',
      descripcion: 'Detalle de un alumno',
      acceso: 'ADM, PROF de categoría asignada, ALU propietario',
      implementado: true,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '200': { description: 'Alumno encontrado', content: { 'application/json': { schema: alumnoResponseSchema } } } },
    },
    {
      id: 'ALU-03',
      metodo: 'GET',
      ruta: '/alumnos/dni/:dni',
      descripcion: 'Busca un alumno por DNI',
      acceso: 'ADM, PROF de categoría asignada',
      implementado: true,
      parameters: [{ name: 'dni', in: 'path', required: true, schema: { type: 'string', pattern: '^\\d{8}$' } }],
      responses: { '200': { description: 'Alumno encontrado', content: { 'application/json': { schema: alumnoResponseSchema } } } },
    },
    {
      id: 'ALU-04',
      metodo: 'POST',
      ruta: '/alumnos',
      descripcion: 'Crea un alumno',
      acceso: 'ADM',
      implementado: true,
      requestBody: { required: true, content: { 'application/json': { schema: createAlumnoBody } } },
      responses: { '201': { description: 'Alumno creado', content: { 'application/json': { schema: alumnoResponseSchema } } } },
    },
    {
      id: 'ALU-05',
      metodo: 'PUT',
      ruta: '/alumnos/:id',
      descripcion: 'Actualiza un alumno',
      acceso: 'ADM',
      implementado: true,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: { required: true, content: { 'application/json': { schema: updateAlumnoBody } } },
      responses: { '200': { description: 'Alumno actualizado', content: { 'application/json': { schema: alumnoResponseSchema } } } },
    },
    {
      id: 'ALU-06',
      metodo: 'PATCH',
      ruta: '/alumnos/:id/estado',
      descripcion: 'Cambia el estado de un alumno',
      acceso: 'ADM',
      implementado: true,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: { required: true, content: { 'application/json': { schema: updateStateBody } } },
      responses: { '200': { description: 'Estado actualizado', content: { 'application/json': { schema: alumnoResponseSchema } } } },
    },
    {
      id: 'ALU-07',
      metodo: 'DELETE',
      ruta: '/alumnos/:id',
      descripcion: 'Desactiva un alumno',
      acceso: 'ADM',
      implementado: true,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { '204': { description: 'Alumno desactivado' } },
    },
    {
      id: 'ALU-08',
      metodo: 'GET',
      ruta: '/alumnos/me/perfil',
      descripcion: 'Consulta el perfil del alumno autenticado',
      acceso: 'ALU',
      implementado: true,
      responses: { '200': { description: 'Perfil del alumno', content: { 'application/json': { schema: perfilResponseSchema } } } },
    },
    {
      id: 'ALU-09',
      metodo: 'PATCH',
      ruta: '/alumnos/me/perfil',
      descripcion: 'Actualiza el perfil del alumno autenticado',
      acceso: 'ALU',
      implementado: true,
      requestBody: { required: true, content: { 'application/json': { schema: updateProfileBody } } },
      responses: { '200': { description: 'Perfil actualizado', content: { 'application/json': { schema: alumnoResponseSchema } } } },
    },
    {
      id: 'ALU-10',
      metodo: 'PUT',
      ruta: '/alumnos/me/perfil/foto',
      descripcion: 'Sube la foto de perfil del alumno autenticado',
      acceso: 'ALU',
      implementado: true,
      requestBody: { required: true, content: { 'multipart/form-data': { schema: photoUploadBody } } },
      responses: {
        '200': {
          description: 'Foto de perfil actualizada',
          content: { 'application/json': { schema: {
            type: 'object',
            properties: { data: {
              type: 'object', properties: { fotoUrl: { type: 'string', format: 'uri' } },
            } },
          } } },
        },
        '413': { description: 'La imagen supera el límite de 1.5 MB' },
      },
    },
    {
      id: 'ALU-11',
      metodo: 'DELETE',
      ruta: '/alumnos/me/perfil/foto',
      descripcion: 'Elimina la foto de perfil del alumno autenticado',
      acceso: 'ALU',
      implementado: true,
      responses: { '204': { description: 'Foto eliminada' } },
    },
  ],
});
