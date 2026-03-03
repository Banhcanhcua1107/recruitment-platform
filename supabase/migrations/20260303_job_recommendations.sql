-- Persist latest AI job recommendations per user
-- so they survive page reload.

create table if not exists public.job_recommendations (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  items    jsonb not null default '[]'::jsonb,
  candidate_summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.job_recommendations enable row level security;

create policy "Users can read own recommendations"
  on public.job_recommendations for select
  using (auth.uid() = user_id);

create policy "Users can insert own recommendations"
  on public.job_recommendations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recommendations"
  on public.job_recommendations for update
  using (auth.uid() = user_id);
