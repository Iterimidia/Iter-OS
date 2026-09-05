create table public.delivery_plan_items (
  id text primary key,
  client_id text not null references public.clients(id),
  label text not null default '',
  monthly_quantity integer not null default 0,
  format text,
  created_at date not null default current_date
);

create table public.delivery_units (
  id text primary key,
  plan_item_id text not null references public.delivery_plan_items(id) on delete cascade,
  client_id text not null references public.clients(id),
  month text not null,
  status text not null default 'pendente',
  created_at date not null default current_date
);

create index delivery_units_plan_item_month_idx on public.delivery_units (plan_item_id, month);

alter table public.delivery_plan_items enable row level security;
alter table public.delivery_units enable row level security;

create policy allow_all on public.delivery_plan_items for all using (true) with check (true);
create policy allow_all on public.delivery_units for all using (true) with check (true);

alter publication supabase_realtime add table public.delivery_plan_items;
alter publication supabase_realtime add table public.delivery_units;
