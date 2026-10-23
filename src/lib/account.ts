export type AccountRole = "member" | "admin" | "owner";

export function roleLabel(role: AccountRole) {
  return role[0].toUpperCase() + role.slice(1);
}
