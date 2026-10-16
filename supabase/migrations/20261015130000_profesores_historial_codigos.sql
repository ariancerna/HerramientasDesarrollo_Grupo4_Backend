-- ============================================================
-- Club de Vóley — PRF-05 conserva historial y AUTH-08 limita intentos.
-- Correr UNA VEZ en el SQL Editor de Supabase, DESPUÉS de
-- 20261012155319_profesores_transacciones.sql. No borra datos.
-- ============================================================

-- ------------------------------------------------------------
-- PRF-05: "Quita acceso y asignaciones; conserva su historial".
-- El perfil queda marcado como eliminado (soft delete) para que sus
-- evaluaciones y anuncios sigan apuntando a él.
-- ------------------------------------------------------------
alter table public.profesores add column if not exists eliminado_en timestamptz;

create or replace function public.eliminar_profesor(p_id uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.profesores where id = p_id and eliminado_en is null for update;
  if not found then
    -- Ya eliminado (o inexistente): permite reintentar la limpieza de Auth.
    return exists(select 1 from public.profesores_auth_pendientes where profesor_id = p_id);
  end if;
  delete from public.usuarios where id = p_id and rol = 'PROF';
  delete from public.profesores_categorias where profesor_id = p_id;
  -- Sin sede: un profesor eliminado no debe impedir borrar la sede (SED-05).
  update public.profesores set eliminado_en = now(), sede_id = null where id = p_id;
  insert into public.profesores_auth_pendientes(profesor_id) values (p_id) on conflict do nothing;
  return true;
end;
$$;

create or replace function public.actualizar_profesor(p_id uuid, p_cambios jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.profesores where id = p_id and eliminado_en is null for update;
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

create or replace function public.asignar_categorias_profesor(p_id uuid, p_categoria_ids uuid[])
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.profesores where id = p_id and eliminado_en is null for update;
  if not found then raise exception 'Profesor no encontrado' using errcode = 'P0002'; end if;
  delete from public.profesores_categorias where profesor_id = p_id;
  insert into public.profesores_categorias(profesor_id, categoria_id) select p_id, unnest(p_categoria_ids);
  return public.profesor_json(p_id);
end;
$$;

-- create or replace conserva los permisos, pero los reafirmamos por claridad.
revoke all on function public.eliminar_profesor(uuid) from public, anon, authenticated;
revoke all on function public.actualizar_profesor(uuid,jsonb) from public, anon, authenticated;
revoke all on function public.asignar_categorias_profesor(uuid,uuid[]) from public, anon, authenticated;
grant execute on function public.eliminar_profesor(uuid) to service_role;
grant execute on function public.actualizar_profesor(uuid,jsonb) to service_role;
grant execute on function public.asignar_categorias_profesor(uuid,uuid[]) to service_role;

-- ------------------------------------------------------------
-- AUTH-08: máximo 5 intentos por código. La verificación es atómica
-- (FOR UPDATE) para que dos peticiones simultáneas no se salten el límite.
-- ------------------------------------------------------------
alter table public.codigos_recuperacion add column if not exists intentos smallint not null default 0;

create or replace function public.verificar_codigo_recuperacion(
  p_correo text, p_codigo text, p_max_intentos smallint default 5
) returns text
language plpgsql security invoker set search_path = '' as $$
declare
  fila public.codigos_recuperacion%rowtype;
begin
  -- Solo cuenta el código más reciente y vigente de ese correo.
  select * into fila from public.codigos_recuperacion
  where correo = p_correo and usado = false and expira_en >= now()
  order by created_at desc limit 1
  for update;
  if not found then return 'invalido'; end if;

  if fila.codigo = p_codigo then
    update public.codigos_recuperacion set usado = true where id = fila.id;
    return 'ok';
  end if;

  update public.codigos_recuperacion
  set intentos = fila.intentos + 1, usado = (fila.intentos + 1 >= p_max_intentos)
  where id = fila.id;
  return case when fila.intentos + 1 >= p_max_intentos then 'bloqueado' else 'invalido' end;
end;
$$;
revoke all on function public.verificar_codigo_recuperacion(text, text, smallint) from public, anon, authenticated;
grant execute on function public.verificar_codigo_recuperacion(text, text, smallint) to service_role;
