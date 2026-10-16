-- ============================================================
-- Club de Vóley — pagos vencidos (regla #3), RLS (regla #4) e índices.
-- Correr UNA VEZ en el SQL Editor de Supabase. No borra ni modifica datos
-- (salvo pasar a "vencido" los pagos pendientes ya vencidos).
-- ============================================================

-- ------------------------------------------------------------
-- 1) Regla #3: pendiente -> vencido cuando vencimiento < hoy (hora de Lima)
-- ------------------------------------------------------------
create or replace function public.marcar_pagos_vencidos() returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  actualizados integer;
begin
  update public.pagos set estado = 'vencido'
  where estado = 'pendiente'
    and vencimiento is not null
    and vencimiento < (now() at time zone 'America/Lima')::date;
  get diagnostics actualizados = row_count;
  return actualizados;
end;
$$;
revoke all on function public.marcar_pagos_vencidos() from public, anon, authenticated;
grant execute on function public.marcar_pagos_vencidos() to service_role;

-- Primera pasada inmediata.
select public.marcar_pagos_vencidos();

-- Job diario con pg_cron. Antes activa la extensión: Dashboard → Database →
-- Extensions → pg_cron. 05:10 UTC = 00:10 en Lima.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'marcar-pagos-vencidos';
    perform cron.schedule('marcar-pagos-vencidos', '10 5 * * *', 'select public.marcar_pagos_vencidos();');
  else
    raise notice 'pg_cron no está activo: actívalo y vuelve a correr este bloque para programar el job.';
  end if;
end $$;

-- ------------------------------------------------------------
-- 2) RLS: el front nunca habla directo con la BD; todo pasa por el backend
--    con service_role (que ignora RLS). Activar RLS sin políticas bloquea el
--    acceso directo con la anon key / tokens de usuario a PostgREST.
-- ------------------------------------------------------------
alter table public.sedes enable row level security;
alter table public.categorias enable row level security;
alter table public.horarios enable row level security;
alter table public.profesores enable row level security;
alter table public.profesores_categorias enable row level security;
alter table public.usuarios enable row level security;
alter table public.alumnos enable row level security;
alter table public.asistencias enable row level security;
alter table public.pagos enable row level security;
alter table public.eventos enable row level security;
alter table public.evaluaciones enable row level security;
alter table public.anuncios enable row level security;
alter table public.anuncios_destinatarios enable row level security;
alter table public.notificaciones enable row level security;
alter table public.configuraciones_usuario enable row level security;
alter table public.configuracion_club enable row level security;
alter table public.codigos_recuperacion enable row level security;
alter table public.password_reset_tokens enable row level security;

-- ------------------------------------------------------------
-- 3) Índices para los filtros más usados por la API
-- ------------------------------------------------------------
create index if not exists asistencias_fecha_idx on public.asistencias (fecha);
create index if not exists asistencias_categoria_fecha_idx on public.asistencias (categoria_id, fecha);
create index if not exists asistencias_fecha_hora_idx on public.asistencias (fecha_hora desc);
create index if not exists pagos_estado_vencimiento_idx on public.pagos (estado, vencimiento);
create index if not exists alumnos_categoria_idx on public.alumnos (categoria_id);
create index if not exists notificaciones_usuario_idx on public.notificaciones (usuario_id, leida, creada_en desc);
create index if not exists evaluaciones_profesor_fecha_idx on public.evaluaciones (profesor_id, fecha desc);
create index if not exists evaluaciones_alumno_idx on public.evaluaciones (alumno_id);
create index if not exists anuncios_profesor_idx on public.anuncios (profesor_id, created_at desc);
create index if not exists anuncios_destinatarios_alumno_idx on public.anuncios_destinatarios (alumno_id);
create index if not exists eventos_fecha_idx on public.eventos (fecha, hora_inicio);
create index if not exists codigos_recuperacion_correo_idx on public.codigos_recuperacion (correo, created_at desc);
