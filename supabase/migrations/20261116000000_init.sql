-- InternSetu schema: internship listings and user profiles.

-- ---------------------------------------------------------------
-- Internships: public listings, read by the matching API
-- ---------------------------------------------------------------
create table public.internships (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  organization     text not null,
  location         text not null,
  duration_months  integer check (duration_months > 0),
  stipend          text,
  skills_required  text[] not null default '{}',
  skills_preferred text[] not null default '{}',
  description      text not null default '',
  created_at       timestamptz not null default now()
);

alter table public.internships enable row level security;

create policy "Anyone can read internships"
  on public.internships for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------
-- Profiles: one row per signed-up user
-- ---------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email        text,
  avatar_url   text,
  role         text not null default 'user',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Users must not be able to promote themselves.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, updated_at) on public.profiles to authenticated;

-- Create a profile whenever someone signs up (email or Google).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
