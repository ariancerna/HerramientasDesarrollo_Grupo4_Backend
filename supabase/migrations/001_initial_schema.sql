-- ============================================================
-- Club de Vóley — Esquema completo de base de datos
-- Corre este archivo UNA SOLA VEZ en el SQL Editor de Supabase.
-- Ningún compañero necesita crear tablas por su cuenta: todo
-- lo que necesitan las 16 épicas de docs/ENDPOINTS.md está aquí.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- SED — Sedes
-- ------------------------------------------------------------
create table if not exists sedes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- CAT — Categorías
-- ------------------------------------------------------------
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- HOR — Horarios de entrenamiento (pertenecen a una categoría)
-- ------------------------------------------------------------
create table if not exists horarios (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias(id) on delete cascade,
  dia text not null, -- 'Lunes', 'Martes', etc.
  hora_inicio time not null,
  hora_fin time not null,
  cancha text,
  estado text not null default 'activo' check (estado in ('activo', 'cancelado')),
  created_at timestamptz not null default now(),
  constraint horarios_horas_validas check (hora_fin > hora_inicio)
);

-- ------------------------------------------------------------
-- PRF — Profesores
-- ------------------------------------------------------------
-- El id ES el id de Supabase Auth (auth.users.id), igual que en usuarios.
create table if not exists profesores (
  id uuid primary key,
  nombre text not null,
  sede_id uuid references sedes(id),
  created_at timestamptz not null default now()
);

create table if not exists profesores_categorias (
  profesor_id uuid not null references profesores(id) on delete cascade,
  categoria_id uuid not null references categorias(id) on delete cascade,
  primary key (profesor_id, categoria_id)
);

-- ------------------------------------------------------------
-- AUTH/USR — Usuarios (cuentas de acceso)
-- El id ES el mismo id que Supabase Auth le da al usuario.
-- ------------------------------------------------------------
create table if not exists usuarios (
  id uuid primary key,
  usuario text not null unique,
  email text not null unique,
  nombre text not null,
  rol text not null check (rol in ('ADM', 'PROF', 'ALU')),
  estudiante_id uuid,
  profesor_id uuid references profesores(id),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ALU — Alumnos (tabla completa; ya existía un stub mínimo)
-- ------------------------------------------------------------
create table if not exists alumnos (
  id uuid primary key default gen_random_uuid(),
  dni text not null unique,
  nombres text not null,
  apellidos text not null,
  email text,
  created_at timestamptz not null default now()
);

alter table alumnos add column if not exists codigo text unique;
alter table alumnos add column if not exists telefono text;
alter table alumnos add column if not exists categoria_id uuid references categorias(id);
alter table alumnos add column if not exists estado text not null default 'activo' check (estado in ('activo', 'inactivo'));
alter table alumnos add column if not exists foto_url text;

-- Ahora que alumnos existe completa, conectamos la FK de usuarios.estudiante_id.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'usuarios_estudiante_id_fkey'
  ) then
    alter table usuarios
      add constraint usuarios_estudiante_id_fkey
      foreign key (estudiante_id) references alumnos(id);
  end if;
end $$;

-- ------------------------------------------------------------
-- ASI — Asistencia
-- ------------------------------------------------------------
create table if not exists asistencias (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references alumnos(id) on delete cascade,
  categoria_id uuid references categorias(id),
  fecha date not null,
  fecha_hora timestamptz not null,
  metodo text not null check (metodo in ('ESCANEO', 'MANUAL')),
  created_at timestamptz not null default now(),
  unique (alumno_id, fecha)
);

-- ------------------------------------------------------------
-- PAG — Pagos / mensualidades
-- ------------------------------------------------------------
create table if not exists pagos (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references alumnos(id) on delete cascade,
  periodo text not null, -- ej. '2026-09'
  monto numeric(10, 2) not null default 180,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado', 'vencido')),
  fecha_pago date,
  metodo_pago text check (metodo_pago in ('Yape', 'Plin', 'Transferencia', 'Efectivo')),
  codigo_operacion text,
  vencimiento date,
  created_at timestamptz not null default now(),
  unique (alumno_id, periodo)
);

-- ------------------------------------------------------------
-- CAL — Eventos del calendario
-- ------------------------------------------------------------
create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time,
  ubicacion text not null,
  categoria_id uuid references categorias(id),
  descripcion text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- EVA — Evaluaciones
-- ------------------------------------------------------------
create table if not exists evaluaciones (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references alumnos(id) on delete cascade,
  profesor_id uuid not null references profesores(id),
  fecha date not null,
  rendimiento_tecnico smallint check (rendimiento_tecnico between 1 and 10),
  rendimiento_fisico smallint check (rendimiento_fisico between 1 and 10),
  actitud smallint check (actitud between 1 and 10),
  observaciones text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ANU — Anuncios
-- ------------------------------------------------------------
create table if not exists anuncios (
  id uuid primary key default gen_random_uuid(),
  profesor_id uuid not null references profesores(id),
  titulo text not null,
  mensaje text not null,
  categoria_id uuid references categorias(id),
  estado text not null default 'borrador' check (estado in ('borrador', 'enviado')),
  created_at timestamptz not null default now()
);

create table if not exists anuncios_destinatarios (
  anuncio_id uuid not null references anuncios(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  primary key (anuncio_id, alumno_id)
);

-- ------------------------------------------------------------
-- NOT — Notificaciones
-- ------------------------------------------------------------
create table if not exists notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  titulo text not null,
  descripcion text,
  tipo text,
  href text,
  leida boolean not null default false,
  creada_en timestamptz not null default now()
);

-- ------------------------------------------------------------
-- CFG — Configuración
-- ------------------------------------------------------------
create table if not exists configuraciones_usuario (
  usuario_id uuid primary key references usuarios(id) on delete cascade,
  tema text not null default 'sistema' check (tema in ('claro', 'oscuro', 'sistema')),
  notificaciones_silenciadas boolean not null default false
);

create table if not exists configuracion_club (
  id smallint primary key default 1 check (id = 1), -- fila única (singleton)
  monto_mensualidad numeric(10, 2) not null default 180,
  dia_vencimiento smallint not null default 10 check (dia_vencimiento between 1 and 28)
);

insert into configuracion_club (id) values (1) on conflict (id) do nothing;

-- ------------------------------------------------------------
-- AUTH — Recuperar contraseña
-- ------------------------------------------------------------
create table if not exists codigos_recuperacion (
  id uuid primary key default gen_random_uuid(),
  correo text not null,
  codigo text not null,
  expira_en timestamptz not null,
  usado boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  correo text not null,
  expira_en timestamptz not null,
  usado boolean not null default false,
  created_at timestamptz not null default now()
);