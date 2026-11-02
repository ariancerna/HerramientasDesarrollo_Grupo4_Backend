-- Conserva valores omitidos incluso bajo PATCH simultáneos; no altera datos existentes.
create or replace function public.actualizar_configuracion_usuario(
  p_usuario_id uuid, p_tema text default null, p_silenciadas boolean default null
) returns setof public.configuraciones_usuario
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if p_tema is null and p_silenciadas is null then
    raise exception 'Indica al menos una preferencia' using errcode = '22023';
  end if;
  return query
    insert into public.configuraciones_usuario as config
      (usuario_id, tema, notificaciones_silenciadas)
    values (p_usuario_id, coalesce(p_tema, 'sistema'), coalesce(p_silenciadas, false))
    on conflict (usuario_id) do update set
      tema = coalesce(p_tema, config.tema),
      notificaciones_silenciadas = coalesce(p_silenciadas, config.notificaciones_silenciadas)
    returning config.*;
end;
$$;
revoke all on function public.actualizar_configuracion_usuario(uuid, text, boolean)
  from public, anon, authenticated;
grant execute on function public.actualizar_configuracion_usuario(uuid, text, boolean) to service_role;
