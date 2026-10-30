-- Clerk organization ids are the primary key. Session tokens carry the active
-- organization as o.id (claim version 2) or org_id (version 1). Deleting an
-- organization removes every row that points at it.
-- The other tables only record that ownership here. Later phases add the
-- columns that describe a parsed repository.

create function public.requesting_organization_id()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    auth.jwt() -> 'o' ->> 'id',
    auth.jwt() ->> 'org_id'
  );
$$;

revoke all on function public.requesting_organization_id() from public;
grant execute on function public.requesting_organization_id() to authenticated;

create table public.organizations (
  id text primary key
);

alter table public.organizations enable row level security;

create policy organizations_select_own_organization
on public.organizations
for select
to authenticated
using (id = (select public.requesting_organization_id()));

revoke all on table public.organizations from anon, authenticated;
grant select on table public.organizations to authenticated;

create table public.projects (
  id bigint generated always as identity primary key,
  organization_id text not null references public.organizations (id) on delete cascade
);

create index projects_organization_id_idx on public.projects (organization_id);

alter table public.projects enable row level security;

create policy projects_select_own_organization
on public.projects
for select
to authenticated
using (organization_id = (select public.requesting_organization_id()));

revoke all on table public.projects from anon, authenticated;
grant select on table public.projects to authenticated;

create table public.analyses (
  id bigint generated always as identity primary key,
  organization_id text not null references public.organizations (id) on delete cascade,
  repository_url text not null,
  state text not null
);

create index analyses_organization_id_idx on public.analyses (organization_id);

alter table public.analyses enable row level security;

create policy analyses_select_own_organization
on public.analyses
for select
to authenticated
using (organization_id = (select public.requesting_organization_id()));

revoke all on table public.analyses from anon, authenticated;
grant select on table public.analyses to authenticated;

create table public.files (
  id bigint generated always as identity primary key,
  organization_id text not null references public.organizations (id) on delete cascade
);

create index files_organization_id_idx on public.files (organization_id);

alter table public.files enable row level security;

create policy files_select_own_organization
on public.files
for select
to authenticated
using (organization_id = (select public.requesting_organization_id()));

revoke all on table public.files from anon, authenticated;
grant select on table public.files to authenticated;

create table public.edges (
  id bigint generated always as identity primary key,
  organization_id text not null references public.organizations (id) on delete cascade
);

create index edges_organization_id_idx on public.edges (organization_id);

alter table public.edges enable row level security;

create policy edges_select_own_organization
on public.edges
for select
to authenticated
using (organization_id = (select public.requesting_organization_id()));

revoke all on table public.edges from anon, authenticated;
grant select on table public.edges to authenticated;

create table public.routes (
  id bigint generated always as identity primary key,
  organization_id text not null references public.organizations (id) on delete cascade
);

create index routes_organization_id_idx on public.routes (organization_id);

alter table public.routes enable row level security;

create policy routes_select_own_organization
on public.routes
for select
to authenticated
using (organization_id = (select public.requesting_organization_id()));

revoke all on table public.routes from anon, authenticated;
grant select on table public.routes to authenticated;

create table public.explanations (
  id bigint generated always as identity primary key,
  organization_id text not null references public.organizations (id) on delete cascade
);

create index explanations_organization_id_idx on public.explanations (organization_id);

alter table public.explanations enable row level security;

create policy explanations_select_own_organization
on public.explanations
for select
to authenticated
using (organization_id = (select public.requesting_organization_id()));

revoke all on table public.explanations from anon, authenticated;
grant select on table public.explanations to authenticated;

create table public.file_roles (
  id bigint generated always as identity primary key,
  organization_id text not null references public.organizations (id) on delete cascade
);

create index file_roles_organization_id_idx on public.file_roles (organization_id);

alter table public.file_roles enable row level security;

create policy file_roles_select_own_organization
on public.file_roles
for select
to authenticated
using (organization_id = (select public.requesting_organization_id()));

revoke all on table public.file_roles from anon, authenticated;
grant select on table public.file_roles to authenticated;

create table public.insights (
  id bigint generated always as identity primary key,
  organization_id text not null references public.organizations (id) on delete cascade
);

create index insights_organization_id_idx on public.insights (organization_id);

alter table public.insights enable row level security;

create policy insights_select_own_organization
on public.insights
for select
to authenticated
using (organization_id = (select public.requesting_organization_id()));

revoke all on table public.insights from anon, authenticated;
grant select on table public.insights to authenticated;

-- Seeded because nothing creates an analysis yet. One list per Clerk
-- organization, so switching team changes what the same query returns.
insert into public.organizations (id) values
  ('org_3LOhuqvuBpTLhF1Pi6wjeeKAJHL'),
  ('org_3LP09Ed02kTe5HAT5B5Ac4x0ePP');

insert into public.analyses (organization_id, repository_url, state) values
  ('org_3LOhuqvuBpTLhF1Pi6wjeeKAJHL', 'https://github.com/vercel/next.js', 'seeded'),
  ('org_3LOhuqvuBpTLhF1Pi6wjeeKAJHL', 'https://github.com/supabase/supabase', 'seeded'),
  ('org_3LP09Ed02kTe5HAT5B5Ac4x0ePP', 'https://github.com/facebook/react', 'seeded'),
  ('org_3LP09Ed02kTe5HAT5B5Ac4x0ePP', 'https://github.com/clerk/javascript', 'seeded');

notify pgrst, 'reload schema';
