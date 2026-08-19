alter table public.clients
  add column billing_type text not null default 'fixo',
  add column commission_percentage numeric;
