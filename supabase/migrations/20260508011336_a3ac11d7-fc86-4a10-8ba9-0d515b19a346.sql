
create table public.blueprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  tier text not null check (tier in ('spark','founder','studio')),
  intake jsonb not null,
  output text,
  status text not null default 'pending' check (status in ('pending','generating','complete','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blueprints enable row level security;

create policy "Users view own blueprints" on public.blueprints
  for select using (auth.uid() = user_id);

create policy "Admins view all blueprints" on public.blueprints
  for select using (public.is_site_editor(auth.uid()));

create policy "Anyone can insert their intake" on public.blueprints
  for insert with check (true);

create trigger blueprints_updated_at
  before update on public.blueprints
  for each row execute function public.update_updated_at_column();
