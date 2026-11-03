-- Staff may read every entitlement row, so the admin home can count who is on Pro.
-- Read only: no insert, update or delete policy is added, and the grant is unchanged
-- (authenticated already has select; RLS decides which rows). Amounts are not stored
-- here, so this exposes plan, status and dates only.
--
-- NOT APPLIED. The owner applies migrations. Until then the admin home shows the
-- paying figure as sample data.

create policy "entitlements_select_staff" on public.entitlements
  for select to authenticated using ((select public.is_staff()));
