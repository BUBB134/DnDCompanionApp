alter table sessions
  add column if not exists recap_format text not null default 'quick';

alter table sessions
  drop constraint if exists sessions_recap_format_check;

alter table sessions
  add constraint sessions_recap_format_check
  check (recap_format in ('quick', 'detailed'));