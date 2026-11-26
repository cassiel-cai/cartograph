-- Roles and routes from the framework adapter. Analyses stored before this
-- never read either, and are not the same as "an adapter found nothing".
-- parse_version says which parser wrote an analysis: null is the old one, and
-- the app asks for a re-run instead of drawing it. The placeholder role below
-- only keeps the not-null rule true for those rows and is never shown.
alter table public.analyses add column parse_version integer;

alter table public.files add column role text;

update public.files set role = 'Source files' where skip_reason is null;

alter table public.files drop constraint files_parsed_or_skipped;
alter table public.files add constraint files_parsed_or_skipped check (
  (
    skip_reason is null
    and module is not null
    and role is not null
    and line_count is not null
    and content_hash is not null
    and fan_in is not null
    and fan_out is not null
  )
  or (
    skip_reason is not null
    and length(trim(skip_reason)) > 0
    and module is null
    and role is null
    and line_count is null
    and content_hash is null
    and fan_in is null
    and fan_out is null
  )
);

-- routes already exists from the first schema, empty, with only id and
-- organization_id (and its organization index). Fill it in rather than
-- creating it again.
alter table public.routes
  add column analysis_id bigint not null,
  add column method text not null,
  add column pattern text not null,
  add column file_path text not null,
  add column line integer not null,
  add constraint routes_method_present check (length(trim(method)) > 0),
  add constraint routes_pattern_rooted check (pattern like '/%'),
  add constraint routes_analysis_organization_fkey
    foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id)
    on delete cascade;

create index routes_analysis_id_idx on public.routes (analysis_id);

-- routes_select_own_organization and its select grant already exist.
create policy routes_insert_own_organization
on public.routes
for insert
to authenticated
with check (organization_id = (select public.requesting_organization_id()));

create policy routes_delete_own_organization
on public.routes
for delete
to authenticated
using (organization_id = (select public.requesting_organization_id()));

grant insert, delete on table public.routes to authenticated;

create or replace function public.analysis_graph(target_id bigint)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'repository_url', a.repository_url,
    'adapter', a.adapter,
    'parse_version', a.parse_version,
    'files_found', a.files_found,
    'files_parsed', a.files_parsed,
    'files_skipped', a.files_skipped,
    'folder_count', a.folder_count,
    'edge_count', a.edge_count,
    'imports_seen', a.imports_seen,
    'imports_resolved', a.imports_resolved,
    'imports_external', a.imports_external,
    'imports_excluded', a.imports_excluded,
    'imports_unresolved', a.imports_unresolved,
    'reexports_found', a.reexports_found,
    'reexports_resolved', a.reexports_resolved,
    'files', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'path', f.path,
        'folder', f.folder,
        'module', f.module,
        'role', f.role,
        'lines', f.line_count,
        'hash', f.content_hash,
        'fan_in', f.fan_in,
        'fan_out', f.fan_out,
        'skip_reason', f.skip_reason
      ) order by f.path), '[]'::jsonb)
      from public.files f
      where f.analysis_id = a.id
    ),
    'edges', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'from', e.from_path,
        'to', e.to_path,
        'kind', e.kind,
        'specifier', e.specifier,
        'type_only', e.type_only
      ) order by e.from_path, e.to_path, e.specifier), '[]'::jsonb)
      from public.edges e
      where e.analysis_id = a.id
    ),
    'exclusions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'path', x.path,
        'reason', x.reason
      ) order by x.path), '[]'::jsonb)
      from public.exclusions x
      where x.analysis_id = a.id
    ),
    'routes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'method', r.method,
        'pattern', r.pattern,
        'file', r.file_path,
        'line', r.line
      ) order by r.pattern, r.method, r.file_path, r.line), '[]'::jsonb)
      from public.routes r
      where r.analysis_id = a.id
    ),
    'imports', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'from', i.from_path,
        'specifier', i.specifier,
        'kind', i.kind,
        'type_only', i.type_only,
        'status', i.status,
        'line', i.line,
        'target', i.target,
        'reason', i.reason
      ) order by i.from_path, i.line, i.specifier), '[]'::jsonb)
      from public.imports i
      where i.analysis_id = a.id
    )
  )
  from public.analyses a
  where a.id = target_id
    and a.state = 'complete';
$$;

revoke all on function public.analysis_graph(bigint) from public;
grant execute on function public.analysis_graph(bigint) to authenticated;

notify pgrst, 'reload schema';
