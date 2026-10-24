import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_PAY_RULES } from "@/lib/tutoring/rules";
import { MODEL_TUTORS } from "@/lib/tutoring/modelCases";

/**
 * The SQL and its TypeScript mirror must not drift. These read the migration
 * and the seed as text, so a changed default, a dropped constraint or a model
 * tutor missing from the seed fails here, without a database.
 */

const root = process.cwd();
const migrationName = readdirSync(join(root, "supabase/migrations")).find((f) => f.endsWith("_tutoring.sql"));
const migration = migrationName ? readFileSync(join(root, "supabase/migrations", migrationName), "utf8") : "";
const seed = readFileSync(join(root, "supabase/seed.sql"), "utf8");
const rlsTest = readFileSync(join(root, "supabase/rls-tests/tutoring.sql"), "utf8");

const defaultOf = (column: string) => {
  const m = migration.match(new RegExp(`\\b${column}\\s+[a-z0-9(),]+\\s+not null default ([0-9.]+)`));
  return m ? Number(m[1]) : NaN;
};

describe("tutoring migration and its mirror", () => {
  it("exists", () => {
    expect(migrationName).toBeTruthy();
  });

  it("has the same pay rule defaults as DEFAULT_PAY_RULES", () => {
    expect(defaultOf("base_rate_cents")).toBe(DEFAULT_PAY_RULES.baseRateCents);
    expect(defaultOf("raised_rate_cents")).toBe(DEFAULT_PAY_RULES.raisedRateCents);
    expect(defaultOf("min_months")).toBe(DEFAULT_PAY_RULES.minMonths);
    expect(defaultOf("min_avg_rating")).toBe(DEFAULT_PAY_RULES.minAvgRating);
    expect(defaultOf("min_ratings")).toBe(DEFAULT_PAY_RULES.minRatings);
    expect(defaultOf("min_lessons")).toBe(DEFAULT_PAY_RULES.minLessons);
    expect(defaultOf("min_referrals")).toBe(DEFAULT_PAY_RULES.minReferrals);
  });

  it("keeps the double-booking guard as a constraint", () => {
    expect(migration).toContain("exclude using gist (tutor_id with =, during with &&) where (status <> 'cancelled')");
    expect(migration).toContain("tstzrange(starts_at, ends_at, '[)')");
  });

  it("turns on row level security for every table it creates", () => {
    const tables = [...migration.matchAll(/create table public\.(tutor\w*)/g)].map((m) => m[1]);
    expect(tables.length).toBeGreaterThanOrEqual(9);
    for (const t of tables) {
      expect(migration, `${t} has RLS`).toContain(`alter table public.${t} enable row level security;`);
      expect(migration, `${t} grants are revoked first`).toMatch(new RegExp(`revoke all on public\\.${t}\\s+from anon, authenticated;`));
    }
  });

  it("never grants a write on rate or amount columns", () => {
    expect(migration).toContain("grant update (paid_at, paid_note) on public.tutor_ledger to authenticated;");
    expect(migration).not.toMatch(/grant insert[^;]*on public\.tutor_ledger/);
    expect(migration).not.toMatch(/grant (insert|update)[^;]*on public\.tutor_bookings/);
  });
});

describe("model tutors in the seed and the database test", () => {
  it("seeds every model tutor and referred student", () => {
    for (const t of MODEL_TUTORS) {
      expect(seed, t.email).toContain(`'${t.email}'`);
      for (const r of [...t.creditedReferrals, ...t.uncreditedReferrals]) expect(seed, r).toContain(r);
    }
  });

  it("seeds each tutor's start date and lesson count", () => {
    for (const t of MODEL_TUTORS) {
      const line = seed.split("\n").find((l) => l.includes(`('${t.email}'`)) ?? "";
      const stamp = t.startedAt.toISOString().replace(".000Z", "Z");
      expect(line, t.email).toContain(`'${stamp}'`);
      // Stars then lessons, with the seed's column-aligning spaces between them.
      expect(line, t.email).toMatch(new RegExp(`'\\{${t.stars.join(",")}\\}',\\s+${t.lessons},`));
    }
  });

  it("checks the same expected cents on the database", () => {
    for (const t of MODEL_TUTORS) {
      expect(rlsTest).toMatch(new RegExp(`\\('${t.email.replace(/\./g, "\\.")}',\\s+${t.expectedCents}\\)`));
    }
  });

  it("never seeds a real address", () => {
    const emails = seed.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [];
    expect(emails.length).toBeGreaterThan(0);
    for (const e of emails) expect(e.endsWith("@test.local"), e).toBe(true);
  });
});
