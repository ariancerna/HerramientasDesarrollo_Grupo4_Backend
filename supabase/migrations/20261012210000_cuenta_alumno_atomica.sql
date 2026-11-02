-- No borra datos: los duplicados existentes deben resolverse antes de migrar.
create unique index if not exists usuarios_estudiante_unico
  on public.usuarios (estudiante_id) where estudiante_id is not null;
create unique index if not exists usuarios_nombre_sin_mayusculas
  on public.usuarios (lower(usuario));

-- Auth y SQL no comparten transacción: el servicio compensa errores con deleteUser.
-- Dentro de SQL se bloquea el alumno y se evita vincular dos cuentas concurrentes.
create or replace function public.crear_cuenta_alumno(
  p_auth_id uuid, p_alumno_id uuid, p_usuario text, p_email text
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  alumno public.alumnos%rowtype;
begin
  select * into alumno from public.alumnos where id = p_alumno_id for update;
  if not found then raise exception 'Alumno no encontrado' using errcode = 'P0002'; end if;
  if alumno.email is null or lower(alumno.email) <> lower(p_email) then
    raise exception 'Correo modificado durante la creación' using errcode = 'P0001';
  end if;
  insert into public.usuarios (id, usuario, email, nombre, rol, estudiante_id)
  values (p_auth_id, trim(p_usuario), alumno.email,
    alumno.nombres || ' ' || alumno.apellidos, 'ALU', p_alumno_id);
  return p_auth_id;
end;
$$;
revoke all on function public.crear_cuenta_alumno(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.crear_cuenta_alumno(uuid, uuid, text, text) to service_role;
