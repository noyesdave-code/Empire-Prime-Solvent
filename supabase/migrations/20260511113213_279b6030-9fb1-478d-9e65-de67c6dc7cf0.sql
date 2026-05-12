
create table public.ide_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  slug text not null,
  description text,
  primary_language text not null default 'javascript',
  is_public boolean not null default false,
  fork_of uuid references public.ide_projects(id) on delete set null,
  template_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);
alter table public.ide_projects enable row level security;
create policy "owner manages own projects" on public.ide_projects for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "public projects readable" on public.ide_projects for select using (is_public = true);
create trigger trg_ide_projects_updated before update on public.ide_projects for each row execute function public.update_updated_at_column();

create table public.ide_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ide_projects(id) on delete cascade,
  path text not null,
  content text not null default '',
  language text,
  size_bytes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, path)
);
alter table public.ide_files enable row level security;
create policy "owner manages own files" on public.ide_files for all
  using (exists (select 1 from public.ide_projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.ide_projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "public project files readable" on public.ide_files for select
  using (exists (select 1 from public.ide_projects p where p.id = project_id and p.is_public = true));
create trigger trg_ide_files_updated before update on public.ide_files for each row execute function public.update_updated_at_column();
create index idx_ide_files_project on public.ide_files(project_id);

create table public.ide_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  language text not null,
  icon text,
  files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ide_templates enable row level security;
create policy "anyone reads templates" on public.ide_templates for select using (true);
create policy "admin manages templates" on public.ide_templates for all
  using (private.has_role(auth.uid(), 'admin'::public.app_role))
  with check (private.has_role(auth.uid(), 'admin'::public.app_role));
create trigger trg_ide_templates_updated before update on public.ide_templates for each row execute function public.update_updated_at_column();

create table public.ide_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.ide_projects(id) on delete cascade,
  user_id uuid not null,
  language text not null,
  source_preview text,
  stdout_preview text,
  stderr_preview text,
  exit_code integer,
  duration_ms integer,
  provider text not null default 'e2b',
  created_at timestamptz not null default now()
);
alter table public.ide_runs enable row level security;
create policy "users see own runs" on public.ide_runs for select using (auth.uid() = user_id);
create policy "users insert own runs" on public.ide_runs for insert with check (auth.uid() = user_id);
create index idx_ide_runs_user on public.ide_runs(user_id, created_at desc);

-- Seed starter templates
insert into public.ide_templates (name, slug, description, language, icon, files) values
('Blank JavaScript', 'blank-js', 'Empty JS file ready to run.', 'javascript', '⚡', '[{"path":"index.js","content":"console.log(''Hello, Empire'');\n","language":"javascript"}]'::jsonb),
('Blank Python', 'blank-py', 'Empty Python file ready to run.', 'python', '🐍', '[{"path":"main.py","content":"print(''Hello, Empire'')\n","language":"python"}]'::jsonb),
('Node Express API', 'node-express', 'Minimal Express server.', 'javascript', '🚀', '[{"path":"server.js","content":"const express = require(''express'');\nconst app = express();\napp.get(''/'', (_req, res) => res.send(''Empire API live''));\napp.listen(3000, () => console.log(''port 3000''));\n","language":"javascript"},{"path":"package.json","content":"{\n  \"name\": \"empire-api\",\n  \"version\": \"0.0.1\",\n  \"dependencies\": {\"express\": \"^4.19.2\"}\n}\n","language":"json"}]'::jsonb);
