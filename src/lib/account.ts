import { useEffect, useState } from "react";
import type { GoogleUser } from "@/lib/useGoogleAuth";
import { fetchWorkspace } from "@/lib/workspace";

export type AccountRole = "member" | "admin" | "owner";

// This is presentation metadata only. Apps Script remains the source of truth
// for every privileged action and verifies the Google ID token itself.
const OWNER_EMAILS = new Set([
  "zeus.andrewliu@gmail.com",
  "andliu@terpmail.umd.edu",
]);

export function accountRole(user: Pick<GoogleUser, "email"> | null): AccountRole {
  if (!user?.email) return "member";
  return OWNER_EMAILS.has(user.email.trim().toLowerCase()) ? "owner" : "member";
}

export function roleLabel(role: AccountRole) {
  return role[0].toUpperCase() + role.slice(1);
}

/** Owners are known locally; admins are confirmed by the protected endpoint. */
export function useAccountRole(user: GoogleUser | null): AccountRole {
  const [role, setRole] = useState<AccountRole>(() => accountRole(user));
  useEffect(() => {
    let cancelled = false;
    const known = accountRole(user);
    setRole(known);
    if (!user || known === "owner") return;
    void fetchWorkspace(user.idToken).then((result) => { if (!cancelled && result.ok) setRole("admin"); });
    return () => { cancelled = true; };
  }, [user]);
  return role;
}