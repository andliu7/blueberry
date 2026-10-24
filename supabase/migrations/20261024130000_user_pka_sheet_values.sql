-- ============================================================
-- A STUDENT'S OWN pKa VALUES, PART 2: rows with no rung (STATUS C2)
--
-- Apply after 20261023130000_user_pka_settings.sql. A separate file rather
-- than an edit to that one, so it is correct whether or not part 1 has
-- already been applied.
--
-- The course sheet prints species Blueberry's ladder has no rung for (HI, HBr,
-- HCl, H2SO4, HNO3, HF, HN3, HCN, carbocations, amide N-H). A pasted value for
-- one is shown on the site's pKa deck only, kept on the device under
-- blueberry.pka.sheet.v1 (src/game/settings/pkaSheet.ts), and synced in this
-- column by src/game/settings/pkaSync.ts on the same clock as `overrides`.
--
-- A preference, not an entitlement: the client re-sanitises on read (known
-- rows only, range -25 to 65). RLS and grants are part 1's: own row only,
-- nothing for anon, and a table-level grant already covers a new column.
-- ============================================================

alter table public.user_pka_settings
  add column if not exists sheet_values jsonb not null default '{}'::jsonb check (
    jsonb_typeof(sheet_values) = 'object'
    and pg_column_size(sheet_values) < 4096
  );
