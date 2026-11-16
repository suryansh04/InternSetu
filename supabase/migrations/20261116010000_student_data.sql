-- Student data: the matching profile, saved and applied internships, and
-- interview attempts. Every table is private to its owner via row-level security.

-- ---------------------------------------------------------------
-- Matching profile, stored on the user's profile row
-- ---------------------------------------------------------------
alter table public.profiles
  add column skills          text[]  not null default '{}',
  add column location        text,
  add column duration_months integer check (duration_months between 1 and 24),
  add column interests       text[]  not null default '{}';

grant update (skills, location, duration_months, interests) on public.profiles to authenticated;

-- Keep updated_at honest.
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- Saved internships and applications
-- ---------------------------------------------------------------
create table public.saved_internships (
  user_id       uuid not null references auth.users (id) on delete cascade default auth.uid(),
  internship_id uuid not null references public.internships (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, internship_id)
);

create table public.applications (
  user_id       uuid not null references auth.users (id) on delete cascade default auth.uid(),
  internship_id uuid not null references public.internships (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, internship_id)
);

alter table public.saved_internships enable row level security;
alter table public.applications enable row level security;

create policy "Users manage their saved internships"
  on public.saved_internships for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their applications"
  on public.applications for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------
-- Interview attempts: written only by the API server (secret key),
-- readable by the candidate who made them
-- ---------------------------------------------------------------
create table public.interview_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  session_id    text not null,
  role          text not null,
  question      text not null,
  video_url     text,
  transcript    text,
  scores        jsonb,
  total_score   integer check (total_score between 0 and 50),
  feedback      text,
  status        text not null default 'processing'
                check (status in ('processing', 'scored', 'failed')),
  flagged_reason text,
  created_at    timestamptz not null default now()
);

create index interview_attempts_user_created on public.interview_attempts (user_id, created_at desc);

alter table public.interview_attempts enable row level security;

create policy "Users read their interview attempts"
  on public.interview_attempts for select
  to authenticated
  using ((select auth.uid()) = user_id);
