import { ModuloDoc } from './types';

/**
 * Registro central de documentación. Cada módulo se agrega llamando a
 * registerDocs(...) desde su propio archivo <modulo>.docs.ts dentro de
 * src/docs/data/. Un módulo que nadie ha programado todavía simplemente
 * no aparece aquí — así /api/v1/docs solo muestra lo que existe de verdad.
 */
const registry: ModuloDoc[] = [];

export function registerDocs(modulo: ModuloDoc) {
  registry.push(modulo);
}

export function getRegistry(): ModuloDoc[] {
  return registry;
}