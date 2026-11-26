-- One read of a finished analysis. A table read stops at the API row cap,
-- and a map built from a cut-off list would look complete. This returns the
-- graph as one value. The caller's policies still decide which rows are in it.

create function public.analysis_graph(target_id bigint)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'repository_url', a.repository_url,
    'adapter', a.adapter,
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
