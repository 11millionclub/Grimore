-- The reader archetype was replaced by Houses. Apply this only after the app
-- version without `archetype` is live (older builds still select it).
alter table public.profiles drop column if exists archetype;
