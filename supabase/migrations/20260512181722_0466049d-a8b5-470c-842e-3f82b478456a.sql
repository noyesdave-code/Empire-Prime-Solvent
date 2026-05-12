
create table if not exists public.ani_persona (
  id int primary key default 1,
  figure text,
  start_hour int not null default 9 check (start_hour between 0 and 23),
  end_hour int not null default 17 check (end_hour between 0 and 23),
  timezone text not null default 'America/New_York',
  notes text,
  set_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint ani_persona_singleton check (id = 1)
);
insert into public.ani_persona (id) values (1) on conflict do nothing;
alter table public.ani_persona enable row level security;
create policy "admins read persona" on public.ani_persona for select to authenticated using (private.has_role(auth.uid(),'admin'));
create policy "admins write persona" on public.ani_persona for all to authenticated using (private.has_role(auth.uid(),'admin')) with check (private.has_role(auth.uid(),'admin'));
