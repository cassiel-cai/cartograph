-- realtime.send inserts into realtime.messages as whoever calls it. The writer
-- is the signed-in role, which has a select policy there and no insert policy,
-- so every publish was refused and the handler below turned that into a
-- warning. Running the trigger as its owner lets this one table publish
-- without opening realtime.messages to inserts from any signed-in user.
create or replace function public.publish_analysis_stage()
returns trigger
language plpgsql
security definer
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
