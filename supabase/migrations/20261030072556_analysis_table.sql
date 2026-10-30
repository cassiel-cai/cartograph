-- The dashboard table shows a commit, when the run started and finished,
-- and a note when there is one. Missing values stay null and render as a dash.

alter table public.analyses
  add column commit_sha text,
  add column started_at timestamptz,
  add column finished_at timestamptz,
  add column detail text;

delete from public.analyses
where organization_id in (
  'org_3LOhuqvuBpTLhF1Pi6wjeeKAJHL',
  'org_3LP09Ed02kTe5HAT5B5Ac4x0ePP'
);

insert into public.analyses (
  organization_id,
  repository_url,
  state,
  commit_sha,
  started_at,
  finished_at,
  detail
) values
  (
    'org_3LOhuqvuBpTLhF1Pi6wjeeKAJHL',
    'https://github.com/tailwindlabs/tailwindcss',
    'queued',
    null,
    now() - interval '20 minutes',
    null,
    null
  ),
  (
    'org_3LOhuqvuBpTLhF1Pi6wjeeKAJHL',
    'https://github.com/vercel/next.js',
    'parsing',
    'a93be01',
    now() - interval '21 minutes',
    null,
    null
  ),
  (
    'org_3LOhuqvuBpTLhF1Pi6wjeeKAJHL',
    'https://github.com/shadcn-ui/ui',
    'failed',
    null,
    now() - interval '5 hours',
    now() - interval '5 hours',
    'Repository archive download timed out'
  ),
  (
    'org_3LOhuqvuBpTLhF1Pi6wjeeKAJHL',
    'https://github.com/shadcn-ui/ui',
    'complete',
    '0c7d9e2',
    now() - interval '24 hours',
    now() - interval '24 hours',
    null
  ),
  (
    'org_3LOhuqvuBpTLhF1Pi6wjeeKAJHL',
    'https://github.com/vercel/next.js',
    'complete',
    '4f1c2a9',
    now() - interval '3 days',
    now() - interval '3 days',
    null
  ),
  (
    'org_3LP09Ed02kTe5HAT5B5Ac4x0ePP',
    'https://github.com/facebook/react',
    'queued',
    null,
    now() - interval '2 hours',
    null,
    null
  ),
  (
    'org_3LP09Ed02kTe5HAT5B5Ac4x0ePP',
    'https://github.com/clerk/javascript',
    'complete',
    'b71aa30',
    now() - interval '2 days',
    now() - interval '2 days',
    null
  );
