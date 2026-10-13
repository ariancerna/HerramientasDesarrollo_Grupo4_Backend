import { supabaseAdmin } from '../../config/supabase';
import { ApiError } from '../../lib/errors/api-error';

const TABLE = 'alumnos';

export async function findCategoriaIdsByProfesor(profesorId?: string) {
  if (!profesorId) return [];

  const { data, error } = await supabaseAdmin
    .from('profesores_categorias')
    .select('categoria_id')
    .eq('profesor_id', profesorId);

  if (error) throw error;
  return (data ?? []).map((row) => row.categoria_id as string);
}

export async function findAll(filters: Record<string, unknown> = {}) {
  let query = supabaseAdmin
    .from(TABLE)
    .select('*, categorias(*)', { count: 'exact' });

  if (typeof filters.texto === 'string' && filters.texto.trim()) {
    const literal = filters.texto.trim().replace(/[\\%_]/g, '\\$&');
    // PostgREST exige comillas para caracteres reservados dentro de un valor.
    // https://docs.postgrest.org/en/stable/references/api/url_grammar.html
    const pattern = '"%' + literal.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '%"';
    query = query.or(['nombres', 'apellidos', 'dni', 'codigo']
      .map((campo) => campo + '.ilike.' + pattern).join(','));
  }

  if (typeof filters.categoriaId === 'string' && filters.categoriaId) {
    query = query.eq('categoria_id', filters.categoriaId);
  }

  if (filters.estado === 'activo' || filters.estado === 'inactivo') {
    query = query.eq('estado', filters.estado);
  }

  if (Array.isArray(filters.categoriaIds) && filters.categoriaIds.length > 0) {
    query = query.in('categoria_id', filters.categoriaIds);
  }

  const page = Number(filters.page ?? 1);
  const limit = Number(filters.limit ?? 20);
  const from = Number(filters.from ?? (page - 1) * limit);
  const to = Number(filters.to ?? from + limit - 1);

  query = query.order('apellidos').order('nombres').order('id').range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: data ?? [],
    page,
    limit,
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

export async function findById(id: string) {
  const { data, error } = await supabaseAdmin.from(TABLE).select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data ?? null;
}

export async function findByDni(dni: string) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('*')
    .eq('dni', dni)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function findProfileByAlumnoId(alumnoId: string) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select(`
      id,
      nombres,
      apellidos,
      dni,
      codigo,
      email,
      telefono,
      estado,
      foto_url,
      categoria_id,
      categorias:categoria_id (id, nombre)
    `)
    .eq('id', alumnoId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const categoria = Array.isArray(data.categorias) ? data.categorias[0] : data.categorias;

  return {
    id: data.id,
    nombres: data.nombres,
    apellidos: data.apellidos,
    dni: data.dni,
    codigo: data.codigo,
    email: data.email,
    telefono: data.telefono,
    estado: data.estado,
    categoria: categoria?.nombre ?? null,
    foto_url: data.foto_url,
  };
}

export async function findByCodigo(codigo: string) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('id')
    .eq('codigo', codigo)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function findByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function findCategoriaById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('categorias')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function create(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function update(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from(TABLE).update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function updateProfile(id: string, payload: Record<string, unknown>) {
  return update(id, payload);
}

export async function updateState(id: string, payload: Record<string, unknown>) {
  return update(id, payload);
}

export async function softDelete(id: string) {
  return update(id, { estado: 'inactivo' });
}

export async function updatePhoto(id: string, fotoUrl: string) {
  return update(id, { foto_url: fotoUrl });
}

export async function deletePhoto(id: string) {
  return update(id, { foto_url: null });
}

export async function findByUserId(userId: string) {
  const { data: usuario, error: usuarioError } = await supabaseAdmin
    .from('usuarios')
    .select('estudiante_id')
    .eq('id', userId)
    .maybeSingle();

  if (usuarioError) throw usuarioError;
  if (!usuario?.estudiante_id) return null;

  return findById(usuario.estudiante_id);
}

export async function uploadProfilePhoto(alumnoId: string, file: Express.Multer.File) {
  const extensiones: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  };
  const extension = extensiones[file.mimetype];
  if (!extension) throw ApiError.badRequest('Solo se admiten imágenes JPEG, PNG o WebP');
  const path = `${alumnoId}/foto.${extension}`;

  const { error } = await supabaseAdmin.storage.from('avatares').upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: true,
  });

  if (error) throw error;

  const { data } = supabaseAdmin.storage.from('avatares').getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteProfilePhoto(alumnoId: string) {
  const { error } = await supabaseAdmin.storage.from('avatares').remove([
    `${alumnoId}/foto.jpg`, `${alumnoId}/foto.jpeg`, `${alumnoId}/foto.png`, `${alumnoId}/foto.webp`,
  ]);
  if (error) throw error;
}

export async function remove(id: string) {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
