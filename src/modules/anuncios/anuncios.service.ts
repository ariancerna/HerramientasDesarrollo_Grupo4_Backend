import * as repository from './anuncios.repository';

export async function list(filters: Record<string, unknown>) {
  return repository.findAll(filters);
}

export async function getById(id: string) {
  return repository.findById(id);
}

export async function create(payload: Record<string, unknown>) {
  return repository.create(payload);
}

export async function update(id: string, payload: Record<string, unknown>) {
  return repository.update(id, payload);
}

export async function remove(id: string) {
  return repository.remove(id);
}
