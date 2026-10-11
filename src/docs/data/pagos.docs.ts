import { registerDocs } from '../registry';

const periodoSchema = { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$', example: '2026-10' };
const uuidSchema = { type: 'string', format: 'uuid' };
const fechaSchema = { type: 'string', format: 'date', example: '2026-10-31' };
const metodoPagoSchema = {
  type: 'string',
  enum: ['Yape', 'Plin', 'Transferencia', 'Efectivo'],
};

const pagoSchema = {
  type: 'object',
  properties: {
    id: uuidSchema,
    alumno_id: uuidSchema,
    periodo: periodoSchema,
    monto: { type: 'number', example: 180 },
    estado: { type: 'string', enum: ['pendiente', 'pagado', 'vencido'] },
    fecha_pago: { ...fechaSchema, nullable: true },
    metodo_pago: { ...metodoPagoSchema, nullable: true },
    codigo_operacion: { type: 'string', nullable: true },
    vencimiento: { ...fechaSchema, nullable: true },
  },
  additionalProperties: false,
};

const respuestaPago = {
  type: 'object',
  properties: { data: pagoSchema },
};

const bodyCrearPago = {
  type: 'object',
  required: ['estudianteId', 'periodo'],
  properties: {
    estudianteId: uuidSchema,
    periodo: periodoSchema,
    monto: { type: 'number', exclusiveMinimum: 0 },
    vencimiento: fechaSchema,
  },
  additionalProperties: false,
};

const bodyRegistrarPago = {
  type: 'object',
  required: ['metodoPago'],
  properties: {
    metodoPago: metodoPagoSchema,
    codigoOperacion: { type: 'string', minLength: 1, maxLength: 100 },
  },
  additionalProperties: false,
};

const bodyPagoDirecto = {
  type: 'object',
  required: ['estudianteId', 'periodo', 'metodoPago'],
  properties: {
    estudianteId: uuidSchema,
    periodo: periodoSchema,
    metodoPago: metodoPagoSchema,
    codigoOperacion: { type: 'string', minLength: 1, maxLength: 100 },
  },
  additionalProperties: false,
};

const bodyActualizarPago = {
  type: 'object',
  minProperties: 1,
  properties: {
    monto: { type: 'number', exclusiveMinimum: 0 },
    vencimiento: { ...fechaSchema, nullable: true },
  },
  additionalProperties: false,
};

const bodyGenerarMensualidad = {
  type: 'object',
  required: ['periodo'],
  properties: {
    periodo: periodoSchema,
    monto: { type: 'number', exclusiveMinimum: 0 },
    vencimiento: fechaSchema,
  },
  additionalProperties: false,
};

const respuestaListaPagos = {
  type: 'object',
  properties: { data: { type: 'array', items: pagoSchema } },
};

registerDocs({
  nombre: 'PAG — Pagos y mensualidades',
  responsable: 'Equipo backend',
  endpoints: [
    {
      id: 'PAG-01',
      metodo: 'GET',
      ruta: '/pagos',
      descripcion: 'Lista pagos; acepta filtros opcionales por período, estado y estudiante.',
      acceso: 'ADM',
      implementado: true,
      queryParams: [
        { name: 'periodo', in: 'query', schema: periodoSchema },
        { name: 'estado', in: 'query', schema: { type: 'string', enum: ['pendiente', 'pagado', 'vencido'] } },
        { name: 'estudianteId', in: 'query', schema: uuidSchema },
      ],
      responses: {
        '200': { description: 'Pagos ordenados del período más reciente al más antiguo', content: { 'application/json': { schema: respuestaListaPagos } } },
      },
    },
    {
      id: 'PAG-02',
      metodo: 'GET',
      ruta: '/pagos/estado-mensual',
      descripcion: 'Devuelve una fila por alumno activo del período. filtro=todos incluye a todos; alDia incluye pagos pagados; porPagar incluye pendientes, vencidos y alumnos sin cargo. Los totales se calculan sobre las filas devueltas. Un alumno sin cargo se presenta con estado sin_cargo y pago null, sin crear una fila ficticia.',
      acceso: 'ADM',
      implementado: true,
      queryParams: [
        { name: 'periodo', in: 'query', required: true, schema: periodoSchema },
        { name: 'texto', in: 'query', schema: { type: 'string', maxLength: 100 } },
        { name: 'filtro', in: 'query', schema: { type: 'string', enum: ['todos', 'alDia', 'porPagar'], default: 'todos' } },
      ],
      responses: {
        '200': {
          description: 'Resumen mensual filtrado.',
          content: { 'application/json': { schema: {
            type: 'object',
            properties: { data: { type: 'object', properties: {
              periodo: periodoSchema,
              filtro: { type: 'string', enum: ['todos', 'alDia', 'porPagar'] },
              totales: { type: 'object', properties: {
                alumnos: { type: 'integer' },
                alDia: { type: 'integer' },
                porPagar: { type: 'integer' },
              } },
              alumnos: { type: 'array', items: { type: 'object', properties: {
                estudianteId: uuidSchema,
                nombres: { type: 'string' },
                apellidos: { type: 'string' },
                nombreCompleto: { type: 'string' },
                dni: { type: 'string' },
                codigo: { type: 'string', nullable: true },
                estado: { type: 'string', enum: ['pendiente', 'pagado', 'vencido', 'sin_cargo'] },
                pago: { ...pagoSchema, nullable: true },
              } } },
            } } },
          } } },
        },
      },
    },
    {
      id: 'PAG-03',
      metodo: 'POST',
      ruta: '/pagos',
      descripcion: 'Crea un cargo pendiente. Un cargo existente para la misma pareja alumno y período produce conflicto.',
      acceso: 'ADM',
      implementado: true,
      requestBody: { required: true, content: { 'application/json': { schema: bodyCrearPago } } },
      responses: {
        '201': { description: 'Cargo creado', content: { 'application/json': { schema: respuestaPago } } },
        '409': { description: 'Ya existe un cargo para ese alumno y período' },
      },
    },
    {
      id: 'PAG-04',
      metodo: 'PATCH',
      ruta: '/pagos/:id',
      descripcion: 'Actualiza el monto o la fecha de vencimiento del pago.',
      acceso: 'ADM',
      implementado: true,
      parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
      requestBody: { required: true, content: { 'application/json': { schema: bodyActualizarPago } } },
      responses: {
        '200': { description: 'Pago actualizado', content: { 'application/json': { schema: respuestaPago } } },
        '404': { description: 'Pago no encontrado' },
        '409': { description: 'Ya existe un pago para el mismo alumno y período' },
      },
    },
    {
      id: 'PAG-05',
      metodo: 'POST',
      ruta: '/pagos/:id/registrar',
      descripcion: 'Marca el cargo como pagado, registra la fecha actual de Lima, el método y el código de operación opcional.',
      acceso: 'ADM',
      implementado: true,
      parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
      requestBody: { required: true, content: { 'application/json': { schema: bodyRegistrarPago } } },
      responses: {
        '200': { description: 'Pago registrado', content: { 'application/json': { schema: respuestaPago } } },
        '404': { description: 'Pago no encontrado' },
      },
    },
    {
      id: 'PAG-06',
      metodo: 'POST',
      ruta: '/pagos/registrar',
      descripcion: 'Registra el pago del alumno y período: actualiza un cargo existente o crea uno pagado si aún no existe.',
      acceso: 'ADM',
      implementado: true,
      requestBody: { required: true, content: { 'application/json': { schema: bodyPagoDirecto } } },
      responses: {
        '200': { description: 'Cargo existente actualizado', content: { 'application/json': { schema: respuestaPago } } },
        '201': { description: 'Cargo creado como pagado', content: { 'application/json': { schema: respuestaPago } } },
      },
    },
    {
      id: 'PAG-07',
      metodo: 'POST',
      ruta: '/pagos/:id/marcar-pendiente',
      descripcion: 'Revierte el cargo a pendiente y limpia fecha, método y código de operación del pago.',
      acceso: 'ADM',
      implementado: true,
      parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
      responses: {
        '200': { description: 'Pago marcado pendiente', content: { 'application/json': { schema: respuestaPago } } },
        '404': { description: 'Pago no encontrado' },
      },
    },
    {
      id: 'PAG-08',
      metodo: 'DELETE',
      ruta: '/pagos/:id',
      descripcion: 'Elimina un cargo.',
      acceso: 'ADM',
      implementado: true,
      parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
      responses: { '204': { description: 'Pago eliminado sin contenido' }, '404': { description: 'Pago no encontrado' } },
    },
    {
      id: 'PAG-09',
      metodo: 'POST',
      ruta: '/pagos/generar-mensualidad',
      descripcion: 'Genera cargos para alumnos activos que aún no tienen pago para el período; ignora duplicados.',
      acceso: 'ADM',
      implementado: true,
      requestBody: { required: true, content: { 'application/json': { schema: bodyGenerarMensualidad } } },
      responses: {
        '200': { description: 'No había cargos nuevos para generar' },
        '201': { description: 'Cargos generados', content: { 'application/json': { schema: { type: 'object', properties: {
          data: { type: 'object', properties: {
            periodo: periodoSchema,
            generados: { type: 'integer' },
            pagos: { type: 'array', items: pagoSchema },
          } },
        } } } } },
      },
    },
    {
      id: 'PAG-10',
      metodo: 'GET',
      ruta: '/me/pagos',
      descripcion: 'Devuelve el historial del alumno autenticado, con el período más reciente primero.',
      acceso: 'ALU',
      implementado: true,
      responses: {
        '200': { description: 'Historial propio de pagos', content: { 'application/json': { schema: respuestaListaPagos } } },
      },
    },
    {
      id: 'PAG-11',
      metodo: 'GET',
      ruta: '/me/pagos/actual',
      descripcion: 'Consulta la mensualidad del período vigente calculado en la zona horaria America/Lima. Si no hay cargo, responde 200 con data null.',
      acceso: 'ALU',
      implementado: true,
      responses: {
        '200': {
          description: 'Pago vigente o null si no se ha generado el cargo.',
          content: { 'application/json': { schema: {
            type: 'object',
            properties: { data: { ...pagoSchema, nullable: true } },
          } } },
        },
      },
    },
  ],
});
