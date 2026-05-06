alter table sessions
  add column if not exists notes_document jsonb not null default '{"version":1,"blocks":[]}'::jsonb;

update sessions
set notes_document = jsonb_build_object(
  'version', 1,
  'blocks', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', concat('legacy-block-', block_index),
          'type', 'paragraph',
          'text', block_text,
          'references', '[]'::jsonb
        )
        order by block_index
      )
      from (
        select
          trim(legacy_notes.block_text) as block_text,
          legacy_notes.block_index
        from unnest(regexp_split_to_array(notes, E'\\n\\s*\\n'))
          with ordinality as legacy_notes(block_text, block_index)
        where trim(legacy_notes.block_text) <> ''
      ) normalized_blocks
    ),
    '[]'::jsonb
  )
)
where notes_document = '{"version":1,"blocks":[]}'::jsonb
  and trim(notes) <> '';
