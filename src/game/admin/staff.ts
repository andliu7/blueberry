/**
 * Who counts as staff in the game.
 *
 * Mirrors the SQL function public.is_staff() (role in ('admin', 'owner')),
 * read from the same profiles row the site uses (lib/AuthContext.tsx). This
 * only decides what the UI draws. The gate on anything that matters is RLS on
 * the server; a student who flips this in the browser sees a viewer of content
 * that already ships in the bundle, and can write nothing.
 */
import type { AccountRole } from "@/lib/account";

export const isStaffRole = (role: AccountRole): boolean => role === "admin" || role === "owner";
