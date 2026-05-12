alter table campaigns
  add column if not exists ruleset text not null default 'D&D 5e',
  add column if not exists tone text,
  add column if not exists starting_location text,
  add column if not exists onboarding_completed_at timestamptz;
