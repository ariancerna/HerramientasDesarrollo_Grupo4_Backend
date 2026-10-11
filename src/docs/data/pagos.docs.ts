import { registerDocs } from '../registry';

const pagoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    alumno_id: { type: 'string', format: 'uuid' },
    periodo: { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$' },
    monto: { type: 'number' },
    estado: { type: 'string', enum: ['pendiente', 'pagado', 'vencido'] },
    fecha_pago: { type: 'string', format: 'date', nullable: true },
    metodo_pago: { type: 'string', nullable: true },
    codigo_operacion: { type: 'string', nullable: true },
    vencimiento: { type: 'string', format: 'date', nullable: true },
  },
};

registerDocs({
  nombre: 'PAG — Pagos y mensualidades',
  responsable: 'Equipo backend',
  endpoints: [
    {
      id: 'PAG-02',
      metodo: 'GET',
      ruta: '/pagos/estado-mensual',
      descripcion: 'Una fila por alumno activo para el período. Los totales corresponden a las filas devueltas.',
      acceso: 'ADM',
      implementado: true,
      queryParams: [
        { name: 'periodo', in: 'query', required: true, schema: { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$' } },
        { name: 'texto', in: 'query', required: false, schema: { type: 'string', maxLength: 100 } },
        { name: 'filtro', in: 'query', required: false, schema: { type: 'string', enum: ['todos', 'alDia', 'porPagar'], default: 'todos' } },
      ],
      responses: {
        '200': {
          description: 'Alumnos activos del período; un pago ausente se representa como sin_cargo y pago null.',
          content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              data: { type: 'object', properties: {
                periodo: { type: 'string' },
                filtro: { type: 'string', enum: ['todos', 'alDia', 'porPagar'] },
                totales: { type: 'object', properties: {
                  alumnos: { type: 'integer' }, alDia: { type: 'integer' }, porPagar: { type: 'integer' },
                } },
                alumnos: { type: 'array', items: { type: 'object', properties: {
                  estudianteId: { type: 'string', format: 'uuid' },
                  nombres: { type: 'string' },
                  apellidos: { type: 'string' },
                  nombreCompleto: { type: 'string' },
                  dni: { type: 'string' },
                  codigo: { type: 'string', nullable: true },
                  estado: { type: 'string', enum: ['pendiente', 'pagado', 'vencido', 'sin_cargo'] },
                  pago: { ...pagoSchema, nullable: true },
                } } },
              } },
            },
          } } },
        },
      },
    },
    {
      id: 'PAG-03',
      metodo: 'POST',
      ruta: '/pagos',
      descripcion: 'Crea un cargo pendiente para un alumno y período.',
      acceso: 'ADM',
      implementado: true,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object',
          required: ['estudianteId', 'periodo'],
          properties: {
            estudianteId: { type: 'string', format: 'uuid' },
            periodo: { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$' },
            monto: { type: 'number', exclusiveMinimum: 0 },
            vencimiento: { type: 'string', format: 'date' },
          },
          additionalProperties: false,
        } } },
      },
      responses: {
        '201': { description: 'Cargo pendiente creado', content: { 'application/json': { schema: { type: 'object', properties: { data: pagoSchema } } } } },
        '409': { description: 'Ya existe un pago para ese alumno y período' },
      },
    },
    {
      id: 'PAG-11',
      metodo: 'GET',
      ruta: '/me/pagos/actual',
      descripcion: 'Consulta la mensualidad del período actual en la zona horaria America/Lima. Sin cargo, responde 200 con data null.',
      acceso: 'ALU',
      implementado: true,
      responses: {
        '200': {
          description: 'Pago vigente o null cuando aún no existe un cargo para el alumno.',
          content: { 'application/json': { schema: {
            type: 'object',
            properties: { data: { ...pagoSchema, nullable: true } },
          } } },
        },
      },
    },
  ],
});
