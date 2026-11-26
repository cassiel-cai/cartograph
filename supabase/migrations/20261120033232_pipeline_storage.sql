-- One analysis per repository. The seeded dashboard rows had two states for
-- the same URL; keep the finished one when it exists.
delete from public.analyses
where id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by organization_id, repository_url
        order by (state = 'complete') desc, id desc
      ) as keep_rank
    from public.analyses
  ) ranked
  where keep_rank > 1
);

create unique index analyses_organization_repository_key
  on public.analyses (organization_id, repository_url);

-- Lets a file or edge row prove it belongs to that analysis's organization.
create unique index analyses_id_organization_id_key
  on public.analyses (id, organization_id);

-- stage is the named step (fetch, select, parse, store). state is what the
-- dashboard reads: the same step while the run is going, then complete or failed.
-- On failure, stage stays on the step that failed and detail says why.
alter table public.analyses
  add column stage text,
  add column adapter text,
  add column files_found integer,
  add column files_parsed integer,
  add column files_skipped integer,
  add column folder_count integer,
  add column edge_count integer,
  add column imports_seen integer,
  add column imports_resolved integer,
  add column imports_external integer,
  add column imports_excluded integer,
  add column imports_unresolved integer,
  add column reexports_found integer,
  add column reexports_resolved integer;

alter table public.analyses
  add constraint analyses_stage_known check (
    stage is null or stage in ('fetch', 'select', 'parse', 'store')
  );

alter table public.files
  add column analysis_id bigint not null,
  add column path text not null,
  add column folder text not null,
  add column module text,
  add column line_count integer,
  add column content_hash text,
  add column fan_in integer,
  add column fan_out integer,
  add column skip_reason text,
  add constraint files_analysis_organization_fkey
    foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id)
    on delete cascade,
  add constraint files_parsed_or_skipped check (
    (
      skip_reason is null
      and module is not null
      and line_count is not null
      and content_hash is not null
      and fan_in is not null
      and fan_out is not null
    )
    or (
      skip_reason is not null
      and length(trim(skip_reason)) > 0
      and module is null
      and line_count is null
      and content_hash is null
      and fan_in is null
      and fan_out is null
    )
  );

-- The table was created empty, before any analysis could own a file. Existing
-- rows would make analysis_id not null impossible; there are none.
create unique index files_analysis_path_key on public.files (analysis_id, path);
create index files_analysis_id_idx on public.files (analysis_id);

alter table public.edges
  add column analysis_id bigint not null,
  add column from_path text not null,
  add column to_path text not null,
  add column kind text not null,
  add column specifier text not null,
  add column type_only boolean not null,
  add constraint edges_analysis_organization_fkey
    foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id)
    on delete cascade,
  add constraint edges_kind_known check (kind in ('import', 'reexport', 'dynamic'));

create index edges_analysis_id_idx on public.edges (analysis_id);

create table public.exclusions (
  id bigint generated always as identity primary key,
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id bigint not null,
  path text not null,
  reason text not null,
  constraint exclusions_reason_present check (length(trim(reason)) > 0),
  constraint exclusions_analysis_organization_fkey
    foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id)
    on delete cascade
);

create index exclusions_organization_id_idx on public.exclusions (organization_id);
create index exclusions_analysis_id_idx on public.exclusions (analysis_id);

alter table public.exclusions enable row level security;

create policy exclusions_select_own_organization
on public.exclusions
for select
to authenticated
using (organization_id = (select public.requesting_organization_id()));

create policy exclusions_insert_own_organization
on public.exclusions
for insert
to authenticated
with check (organization_id = (select public.requesting_organization_id()));

create policy exclusions_delete_own_organization
on public.exclusions
for delete
to authenticated
using (organization_id = (select public.requesting_organization_id()));

revoke all on table public.exclusions from anon, authenticated;
grant select, insert, delete on table public.exclusions to authenticated;

create table public.imports (
  id bigint generated always as identity primary key,
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id bigint not null,
  from_path text not null,
  specifier text not null,
  kind text not null,
  type_only boolean not null,
  status text not null,
  line integer not null,
  target text,
  reason text,
  constraint imports_kind_known check (kind in ('import', 'reexport', 'dynamic')),
  constraint imports_status_known check (
    status in ('resolved', 'external', 'excluded', 'unresolved')
  ),
  constraint imports_analysis_organization_fkey
    foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id)
    on delete cascade
);

create index imports_organization_id_idx on public.imports (organization_id);
create index imports_analysis_id_idx on public.imports (analysis_id);

alter table public.imports enable row level security;

create policy imports_select_own_organization
on public.imports
for select
to authenticated
using (organization_id = (select public.requesting_organization_id()));

create policy imports_insert_own_organization
on public.imports
for insert
to authenticated
with check (organization_id = (select public.requesting_organization_id()));

create policy imports_delete_own_organization
on public.imports
for delete
to authenticated
using (organization_id = (select public.requesting_organization_id()));

revoke all on table public.imports from anon, authenticated;
grant select, insert, delete on table public.imports to authenticated;

create policy organizations_insert_own_organization
on public.organizations
for insert
to authenticated
with check (id = (select public.requesting_organization_id()));

grant insert on table public.organizations to authenticated;

create policy analyses_insert_own_organization
on public.analyses
for insert
to authenticated
with check (organization_id = (select public.requesting_organization_id()));

create policy analyses_update_own_organization
on public.analyses
for update
to authenticated
using (organization_id = (select public.requesting_organization_id()))
with check (organization_id = (select public.requesting_organization_id()));

grant insert, update on table public.analyses to authenticated;

create policy files_insert_own_organization
on public.files
for insert
to authenticated
with check (organization_id = (select public.requesting_organization_id()));

create policy files_delete_own_organization
on public.files
for delete
to authenticated
using (organization_id = (select public.requesting_organization_id()));

grant insert, delete on table public.files to authenticated;

create policy edges_insert_own_organization
on public.edges
for insert
to authenticated
with check (organization_id = (select public.requesting_organization_id()));

create policy edges_delete_own_organization
on public.edges
for delete
to authenticated
using (organization_id = (select public.requesting_organization_id()));

grant insert, delete on table public.edges to authenticated;

-- Progress topics are analysis:<id>. The policy is the registration: a topic
-- this policy does not recognise cannot be subscribed to, and a publish then
-- reaches nobody. The trigger below is the only publisher, and it sends the
-- stage and its message, not the row.
create function public.analysis_id_from_topic(topic text)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case
    when topic ~ '^analysis:[0-9]+$' then split_part(topic, ':', 2)::bigint
    else null
  end;
$$;

revoke all on function public.analysis_id_from_topic(text) from public;
grant execute on function public.analysis_id_from_topic(text) to authenticated;

create policy analyses_receive_own_stage
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and exists (
    select 1
    from public.analyses
    where public.analyses.id = public.analysis_id_from_topic((select realtime.topic()))
      and public.analyses.organization_id = (select public.requesting_organization_id())
  )
);

create function public.publish_analysis_stage()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  begin
    perform realtime.send(
      payload => pg_catalog.jsonb_build_object('stage', new.state, 'message', new.detail),
      event => 'stage',
      topic => 'analysis:' || new.id::text,
      private => true
    );
  exception
    when others then
      -- A dropped publish must not stop the run from recording the stage,
      -- including a failure. The warning is the record that it did not go out.
      raise warning 'analysis % stage publish failed: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

revoke all on function public.publish_analysis_stage() from public;
grant execute on function public.publish_analysis_stage() to authenticated, service_role;

create trigger analyses_publish_stage
after insert or update of state, detail on public.analyses
for each row
execute function public.publish_analysis_stage();

notify pgrst, 'reload schema';
