-- Torq CRM shared team-sync table. Run once in the Supabase SQL editor
-- (Dashboard → SQL → New query → paste → Run), or via `supabase db push`.
--
-- Stores the whole shared pipeline state (stages, owners, notes keyed by lead id)
-- as one JSONB row. Merge/conflict handling is done client-side in store.js.
-- Access is open to the anon (publishable) key on purpose: the data is low-value
-- pipeline metadata for a small trusted team, and the lead list is already public.

create table if not exists public.crm_state (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.crm_state enable row level security;

drop policy if exists "crm_state anon rw" on public.crm_state;
create policy "crm_state anon rw" on public.crm_state
  for all to anon, authenticated using (true) with check (true);

grant all on table public.crm_state to anon, authenticated;

insert into public.crm_state (id, data)
values ('shared', '{"records":{},"team":[]}'::jsonb)
on conflict (id) do nothing;
