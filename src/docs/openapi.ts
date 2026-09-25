import { getRegistry } from './registry';
import { EndpointDoc } from './types';

/** Convierte "/alumnos/:id/cuenta" en { path: "/alumnos/{id}/cuenta", params: ["id"] } */
function convertirRuta(ruta: string): { path: string; params: string[] } {
  const params: string[] = [];
  const path = ruta.replace(/:([a-zA-Z0-9_]+)/g, (_match, nombre: string) => {
    params.push(nombre);
    return `{${nombre}}`;
  });
  return { path, params };
}

function construirOperacion(endpoint: EndpointDoc, tag: string) {
  const { params } = convertirRuta(endpoint.ruta);
  const metodosConBody = ['POST', 'PUT', 'PATCH'];
  const prefijoEstado = endpoint.implementado ? '' : '⏳ [PENDIENTE] ';

  const operacion: Record<string, unknown> = {
    tags: [tag],
    summary: `${prefijoEstado}${endpoint.id} — ${endpoint.descripcion}`,
    description: `**Acceso:** ${endpoint.acceso}${
      endpoint.implementado ? '' : '\n\n⚠️ Este endpoint todavía no está implementado en el backend.'
    }`,
    operationId: endpoint.id,
    parameters: params.map((nombre) => ({
      name: nombre,
      in: 'path',
      required: true,
      schema: { type: 'string' },
    })),
    responses: {
      '200': { description: 'OK' },
      '400': { description: 'Solicitud inválida' },
      '401': { description: 'No autenticado' },
      '403': { description: 'Sin permiso para este recurso' },
      '404': { description: 'No encontrado' },
    },
  };

  if (metodosConBody.includes(endpoint.metodo)) {
    // TODO: reemplazar este schema genérico por el real de cada módulo
    // (usando el *.schema.ts de Zod correspondiente) cuando se programe.
    operacion.requestBody = {
      required: false,
      content: {
        'application/json': {
          schema: { type: 'object', additionalProperties: true },
        },
      },
    };
  }

  return operacion;
}

/** Arma el documento OpenAPI 3.0 completo a partir de src/docs/data/*.docs.ts */
export function buildOpenApiSpec() {
  const modulos = getRegistry();
  const paths: Record<string, Record<string, unknown>> = {};

  for (const modulo of modulos) {
    for (const endpoint of modulo.endpoints) {
      const { path } = convertirRuta(endpoint.ruta);
      if (!paths[path]) paths[path] = {};
      paths[path][endpoint.metodo.toLowerCase()] = construirOperacion(endpoint, modulo.nombre);
    }
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Club de Vóley — API',
      version: '1.0.0',
      description:
        'Documentación generada automáticamente desde src/docs/data/*.docs.ts. ' +
        'Los módulos que el equipo aún no ha programado no aparecen aquí.',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
    paths,
  };
}