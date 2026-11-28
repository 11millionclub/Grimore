-- GriMore — two simpler, painting-free library styles, free for everyone.
insert into public.corner_items (key, kind, name, price_cents, sort_order, house_id, source) values
  ('library:simple', 'library', 'Simple Walnut', null, 5, null, 'shop'),
  ('library:minimal', 'library', 'Minimal Oak', null, 6, null, 'shop')
on conflict (key) do nothing;

-- Two simple app themes (plain colours), free for everyone.
insert into public.corner_items (key, kind, name, price_cents, sort_order, source) values
  ('apptheme:paper', 'apptheme', 'Paper', null, 3, 'shop'),
  ('apptheme:slate', 'apptheme', 'Slate', null, 4, 'shop')
on conflict (key) do nothing;
