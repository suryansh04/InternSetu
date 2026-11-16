-- Indexes for foreign keys (deleting an internship cascades through these tables)
create index saved_internships_internship_id on public.saved_internships (internship_id);
create index applications_internship_id on public.applications (internship_id);

-- The API's stale-attempt sweep only ever looks at attempts still processing.
create index interview_attempts_processing on public.interview_attempts (created_at)
  where status = 'processing';

-- Keep profiles within what the matching API accepts, so a saved profile can always be matched.
alter table public.profiles
  add constraint profiles_location_length check (char_length(location) <= 120),
  add constraint profiles_display_name_length check (char_length(display_name) <= 100),
  add constraint profiles_skills_count check (cardinality(skills) <= 40),
  add constraint profiles_interests_count check (cardinality(interests) <= 10);
