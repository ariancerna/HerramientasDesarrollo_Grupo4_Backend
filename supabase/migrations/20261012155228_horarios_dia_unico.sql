-- No elimina datos existentes. Si hay duplicados, resolverlos antes de aplicar.
create unique index horarios_categoria_dia_unique on public.horarios (categoria_id, lower(dia));
