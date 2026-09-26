-- ============================================================
-- Storage — bucket para fotos de perfil de alumnos (ALU-10, ALU-11)
-- Corre esto UNA SOLA VEZ en el SQL Editor de Supabase.
-- ============================================================

-- Bucket público: cualquiera con la URL puede VER la foto (normal para
-- avatares), pero solo el backend (con la service_role key) puede
-- subir/borrar, porque esas operaciones las hace supabaseAdmin, no el
-- usuario final directo.
insert into storage.buckets (id, name, public)
values ('avatares', 'avatares', true)
on conflict (id) do nothing;

-- Cualquiera puede leer (necesario para que la foto se vea en el navegador).
create policy "avatares_lectura_publica"
on storage.objects for select
using (bucket_id = 'avatares');

-- Solo el dueño del archivo puede subir/actualizar/borrar SU PROPIA carpeta.
-- Convención de nombre de archivo: "{idDelAlumno}/foto.jpg"
-- (esto es una segunda capa de seguridad; el backend además valida con
-- requireAuth que cada alumno solo pueda tocar su propio perfil).
create policy "avatares_subir_propio"
on storage.objects for insert
with check (
  bucket_id = 'avatares'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatares_actualizar_propio"
on storage.objects for update
using (
  bucket_id = 'avatares'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatares_eliminar_propio"
on storage.objects for delete
using (
  bucket_id = 'avatares'
  and auth.uid()::text = (storage.foldername(name))[1]
);