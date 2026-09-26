-- Migración inicial — Club de Vóley
-- TODO (equipo BD): crear aquí las tablas según docs/ENDPOINTS.md (sección 4).
-- Sugerencia de tablas a partir del análisis del front (types/*.ts):
--   usuarios (id, usuario, email, nombre, rol, estudiante_id, profesor_id, activo)
--   sedes (id, nombre, direccion)
--   categorias (id, nombre, descripcion)
--   horarios (id, categoria_id, dia, hora_inicio, hora_fin, cancha, estado)
--   profesores (id, nombre, usuario, sede_id)
--   profesores_categorias (profesor_id, categoria_id)
--   alumnos (id, codigo, dni, nombres, apellidos, email, telefono, categoria_id, estado, foto_url)
--   asistencias (id, alumno_id, categoria_id, fecha, fecha_hora, metodo)
--   pagos (id, alumno_id, periodo, monto, estado, fecha_pago, metodo_pago, codigo_operacion, vencimiento)
--   eventos (id, titulo, fecha, hora_inicio, hora_fin, ubicacion, categoria_id, descripcion)
--   evaluaciones (id, alumno_id, profesor_id, fecha, rendimiento_tecnico, rendimiento_fisico, actitud, observaciones)
--   anuncios (id, profesor_id, titulo, mensaje, categoria_id, estado)
--   anuncios_destinatarios (anuncio_id, alumno_id)
--   notificaciones (id, usuario_id, titulo, descripcion, tipo, href, leida, creada_en)
--   configuraciones_usuario (usuario_id, tema, notificaciones_silenciadas)
--   configuracion_club (id, monto_mensualidad, dia_vencimiento)

-- Ejemplo de extensión necesaria para generar UUIDs:
create extension if not exists "pgcrypto";
-- ============================================================
-- Tablas necesarias para la épica AUTH (rama: auth)
-- El resto de tablas de la lista de arriba las crea cada épica
-- cuando le toque (alumnos se completa con más columnas en la
-- épica ALU, esto es solo lo mínimo que auth necesita).
-- ============================================================

-- El id de "usuarios" ES el mismo id que Supabase Auth le da al usuario
-- (auth.users.id), así el JWT y esta tabla comparten el mismo id sin
-- necesidad de una columna aparte.
create table if not exists usuarios (
  id uuid primary key,
  usuario text not null unique,
  email text not null unique,
  nombre text not null,
  rol text not null check (rol in ('ADM', 'PROF', 'ALU')),
  estudiante_id uuid,
  profesor_id uuid,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Stub mínimo: la épica ALU le agregará el resto de columnas
-- (codigo, categoria_id, telefono, estado, foto_url, etc.) con ALTER TABLE.
create table if not exists alumnos (
  id uuid primary key default gen_random_uuid(),
  dni text not null unique,
  nombres text not null,
  apellidos text not null,
  email text,
  created_at timestamptz not null default now()
);

alter table usuarios
  add constraint usuarios_estudiante_id_fkey
  foreign key (estudiante_id) references alumnos(id);

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
-- ============================================================
-- Tabla necesaria para la épica SED (rama: sed)
-- ============================================================
create table if not exists sedes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text,
  created_at timestamptz not null default now()
);