create table public.users (
  id text primary key,
  name text not null,
  email text not null unique,
  password text not null,
  role text not null,
  job_title text not null default '',
  avatar_initials text not null default '',
  avatar_color text not null default '#7C6BFF',
  active boolean not null default true,
  allowed_bases jsonb not null default '[]',
  allowed_areas jsonb not null default '[]',
  allowed_actions jsonb not null default '[]',
  allowed_client_ids jsonb not null default '[]',
  allowed_dashboard_cards jsonb not null default '[]',
  created_at date not null default current_date
);

create table public.clients (
  id text primary key,
  name text not null,
  status text not null,
  plan text not null default '',
  monthly_value numeric not null default 0,
  services jsonb not null default '[]',
  strategic_responsible_id text references public.users(id) on delete set null,
  creative_responsible_id text references public.users(id) on delete set null,
  drive_folder_url text,
  briefing text,
  next_meeting_at date,
  pendencies text,
  notes text,
  segment text,
  created_at date not null default current_date
);

create table public.projects (
  id text primary key,
  title text not null,
  client_id text references public.clients(id) on delete cascade,
  description text default '',
  responsible_id text references public.users(id) on delete set null,
  team_ids jsonb not null default '[]',
  status text not null,
  start_date date,
  end_date date,
  priority text not null default 'media',
  created_at date not null default current_date
);

create table public.tasks (
  id text primary key,
  title text not null,
  description text,
  client_id text references public.clients(id) on delete set null,
  project_id text references public.projects(id) on delete set null,
  responsible_id text not null references public.users(id) on delete cascade,
  due_date date,
  priority text not null default 'media',
  status text not null,
  type text not null default '',
  area text not null,
  created_at date not null default current_date,
  completed_at date,
  file_ids jsonb default '[]',
  comments jsonb default '[]'
);

create table public.calendar_events (
  id text primary key,
  title text not null,
  date date not null,
  type text not null,
  scope text not null,
  client_id text references public.clients(id) on delete cascade,
  task_id text references public.tasks(id) on delete cascade,
  status text,
  priority text,
  source text not null default 'manual'
);

create table public.financial_entries (
  id text primary key,
  type text not null,
  category text not null default '',
  description text not null,
  client_id text references public.clients(id) on delete set null,
  amount numeric not null default 0,
  due_date date not null,
  paid_date date,
  status text not null,
  recurring boolean default false
);

create table public.leads (
  id text primary key,
  company_name text not null,
  responsible_name text default '',
  contact text default '',
  instagram_or_site text,
  segment text default '',
  origin text default '',
  status text not null,
  service_interest text default '',
  estimated_value numeric not null default 0,
  next_action text,
  follow_up_date date,
  notes text,
  created_at date not null default current_date
);

create table public.content_items (
  id text primary key,
  client_id text not null references public.clients(id) on delete cascade,
  project_id text references public.projects(id) on delete set null,
  format text not null,
  theme text default '',
  title text not null,
  responsible_id text not null references public.users(id) on delete cascade,
  status text not null,
  due_date date,
  publish_date date,
  caption text,
  script text,
  file_url text,
  internal_approval boolean not null default false,
  client_approval boolean not null default false,
  comments jsonb default '[]',
  created_at date not null default current_date
);

create table public.files (
  id text primary key,
  name text not null,
  type text default '',
  category text not null default '',
  client_id text references public.clients(id) on delete set null,
  project_id text references public.projects(id) on delete set null,
  url text not null,
  description text,
  visible_to_roles jsonb not null default '[]',
  created_at date not null default current_date
);

create table public.dashboard_cards (
  id text primary key,
  section text not null,
  title text not null,
  description text,
  visible_to_roles jsonb not null default '[]'
);

create table public.app_settings (
  id integer primary key default 1,
  company_name text not null,
  login_slogan text not null,
  dashboard_slogan text not null,
  login_background_image_url text,
  plans jsonb not null default '[]',
  services jsonb not null default '[]',
  client_statuses jsonb not null default '[]',
  task_types jsonb not null default '[]',
  integrations jsonb not null default '[]',
  constraint single_row check (id = 1)
);

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_events enable row level security;
alter table public.financial_entries enable row level security;
alter table public.leads enable row level security;
alter table public.content_items enable row level security;
alter table public.files enable row level security;
alter table public.dashboard_cards enable row level security;
alter table public.app_settings enable row level security;

create policy "allow_all" on public.users for all using (true) with check (true);
create policy "allow_all" on public.clients for all using (true) with check (true);
create policy "allow_all" on public.projects for all using (true) with check (true);
create policy "allow_all" on public.tasks for all using (true) with check (true);
create policy "allow_all" on public.calendar_events for all using (true) with check (true);
create policy "allow_all" on public.financial_entries for all using (true) with check (true);
create policy "allow_all" on public.leads for all using (true) with check (true);
create policy "allow_all" on public.content_items for all using (true) with check (true);
create policy "allow_all" on public.files for all using (true) with check (true);
create policy "allow_all" on public.dashboard_cards for all using (true) with check (true);
create policy "allow_all" on public.app_settings for all using (true) with check (true);
