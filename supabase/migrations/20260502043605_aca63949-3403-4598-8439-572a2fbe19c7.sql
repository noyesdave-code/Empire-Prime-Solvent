-- =========================================
-- PROFILES
-- =========================================
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  display_name text,
  email text,
  tier text not null default 'free',
  prompt_count_month integer not null default 0,
  quota_reset_at timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles viewable by owner"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- =========================================
-- SUBSCRIPTIONS (Paddle)
-- =========================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  paddle_subscription_id text not null unique,
  paddle_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_paddle_id on public.subscriptions(paddle_subscription_id);

alter table public.subscriptions enable row level security;

create policy "Users view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Service role manages subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');

-- =========================================
-- PROMPT USAGE (daily rollup for quotas + analytics)
-- =========================================
create table public.prompt_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  day date not null default current_date,
  prompt_count integer not null default 0,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, day)
);

create index idx_prompt_usage_user_day on public.prompt_usage(user_id, day);

alter table public.prompt_usage enable row level security;

create policy "Users view own usage"
  on public.prompt_usage for select
  using (auth.uid() = user_id);

create policy "Users insert own usage"
  on public.prompt_usage for insert
  with check (auth.uid() = user_id);

create policy "Users update own usage"
  on public.prompt_usage for update
  using (auth.uid() = user_id);

-- =========================================
-- TIMESTAMP TRIGGER FN
-- =========================================
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger trg_subscriptions_updated
  before update on public.subscriptions
  for each row execute function public.update_updated_at_column();

create trigger trg_prompt_usage_updated
  before update on public.prompt_usage
  for each row execute function public.update_updated_at_column();

-- =========================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =========================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================
-- SUBSCRIPTION CHECK HELPER
-- =========================================
create or replace function public.has_active_subscription(
  user_uuid uuid,
  check_env text default 'live'
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = user_uuid
      and environment = check_env
      and (
        (status in ('active', 'trialing') and (current_period_end is null or current_period_end > now()))
        or (status = 'canceled' and current_period_end > now())
      )
  );
$$;