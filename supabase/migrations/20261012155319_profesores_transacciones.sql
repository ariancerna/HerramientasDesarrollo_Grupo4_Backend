-- Operaciones atomicas de perfil/cuenta. Auth se coordina desde el backend.
-- SECURITY INVOKER: solo service_role puede ejecutar estas funciones.
create table public.profesores_auth_pendientes (
  profesor_id uuid primary key,
  created_at timestamptz not null default now()
);
alter table public.profesores_auth_pendientes enable row level security;
revoke all on public.profesores_auth_pendientes from public, anon, authenticated;
grant select, insert, delete on public.profesores_auth_pendientes to service_role;

create function public.profesor_json(p_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'nombre', p.nombre, 'sedeId', p.sede_id,
    'usuario', (select u.usuario from public.usuarios u where u.id = p.id and u.rol = 'PROF'),
    'email', (select u.email from public.usuarios u where u.id = p.id and u.rol = 'PROF'),
    'categoriaIds', coalesce((select jsonb_agg(pc.categoria_id order by pc.categoria_id) from public.profesores_categorias pc where pc.profesor_id = p.id), '[]'::jsonb)
  ) from public.profesores p where p.id = p_id;
$$;

create function public.crear_profesor(p_id uuid, p_nombre text, p_usuario text, p_email text, p_sede_id uuid, p_categoria_ids uuid[])
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.profesores(id, nombre, sede_id) values (p_id, p_nombre, p_sede_id);
  insert into public.usuarios(id, usuario, email, nombre, rol, profesor_id)
    values (p_id, p_usuario, p_email, p_nombre, 'PROF', p_id);
  insert into public.profesores_categorias(profesor_id, categoria_id)
    select p_id, unnest(p_categoria_ids);
  return public.profesor_json(p_id);
end;
$$;

create function public.actualizar_profesor(p_id uuid, p_cambios jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.profesores where id = p_id for update;
  if not found then raise exception 'Profesor no encontrado' using errcode = 'P0002'; end if;
  update public.profesores set
    nombre = case when p_cambios ? 'nombre' then p_cambios->>'nombre' else nombre end,
    sede_id = case when p_cambios ? 'sedeId' then (p_cambios->>'sedeId')::uuid else sede_id end
  where id = p_id;
  update public.usuarios set
    nombre = case when p_cambios ? 'nombre' then p_cambios->>'nombre' else nombre end,
    usuario = case when p_cambios ? 'usuario' then p_cambios->>'usuario' else usuario end
  where id = p_id and rol = 'PROF';
  if p_cambios ? 'usuario' and not found then
    raise exception 'El profesor no tiene cuenta configurada' using errcode = 'P0002';
  end if;
  return public.profesor_json(p_id);
end;
$$;

create function public.asignar_categorias_profesor(p_id uuid, p_categoria_ids uuid[])
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.profesores where id = p_id for update;
  if not found then raise exception 'Profesor no encontrado' using errcode = 'P0002'; end if;
  delete from public.profesores_categorias where profesor_id = p_id;
  insert into public.profesores_categorias(profesor_id, categoria_id) select p_id, unnest(p_categoria_ids);
  return public.profesor_json(p_id);
end;
$$;

create function public.eliminar_profesor(p_id uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.profesores where id = p_id for update;
  if not found then
    return exists(select 1 from public.profesores_auth_pendientes where profesor_id = p_id);
  end if;
  delete from public.usuarios where id = p_id and rol = 'PROF';
  delete from public.profesores where id = p_id;
  insert into public.profesores_auth_pendientes(profesor_id) values (p_id) on conflict do nothing;
  return true;
end;
$$;

revoke all on function public.profesor_json(uuid) from public, anon, authenticated;
revoke all on function public.crear_profesor(uuid,text,text,text,uuid,uuid[]) from public, anon, authenticated;
revoke all on function public.actualizar_profesor(uuid,jsonb) from public, anon, authenticated;
revoke all on function public.asignar_categorias_profesor(uuid,uuid[]) from public, anon, authenticated;
revoke all on function public.eliminar_profesor(uuid) from public, anon, authenticated;
grant execute on function public.profesor_json(uuid) to service_role;
grant execute on function public.crear_profesor(uuid,text,text,text,uuid,uuid[]) to service_role;
grant execute on function public.actualizar_profesor(uuid,jsonb) to service_role;
grant execute on function public.asignar_categorias_profesor(uuid,uuid[]) to service_role;
grant execute on function public.eliminar_profesor(uuid) to service_role;
