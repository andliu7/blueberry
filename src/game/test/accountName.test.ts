/**
 * The name's one save path and its one precedence rule (owner, item 11).
 * accountName.ts says why the account wins over the device.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const { getSupabase } = vi.hoisted(() => ({ getSupabase: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { firstNameOf, resolveDisplayName, saveAccountName } from "@/lib/accountName";

afterEach(() => {
  getSupabase.mockReset();
});

describe("resolveDisplayName", () => {
  it("prefers the account row, then the sign-in metadata, then the device", () => {
    expect(resolveDisplayName({ profileName: "Ada Lovelace", metaName: "Ada L", localName: "ada" })).toBe("Ada Lovelace");
    expect(resolveDisplayName({ profileName: null, metaName: "Ada L", localName: "ada" })).toBe("Ada L");
    expect(resolveDisplayName({ profileName: null, metaName: null, localName: "ada" })).toBe("ada");
  });

  it("skips blanks and trims", () => {
    expect(resolveDisplayName({ profileName: "   ", metaName: "", localName: "  Grace  " })).toBe("Grace");
    expect(resolveDisplayName({ profileName: null, metaName: undefined, localName: " " })).toBeNull();
    expect(resolveDisplayName({ profileName: null, metaName: null, localName: null })).toBeNull();
  });
});

describe("firstNameOf", () => {
  it("keeps the first word", () => {
    expect(firstNameOf("Ada Lovelace")).toBe("Ada");
    expect(firstNameOf("  Grace   Hopper ")).toBe("Grace");
    expect(firstNameOf("Bloom")).toBe("Bloom");
  });

  it("returns null for no name", () => {
    expect(firstNameOf(null)).toBeNull();
    expect(firstNameOf("   ")).toBeNull();
  });
});

describe("saveAccountName", () => {
  function fakeClient(error: unknown) {
    const eq = vi.fn(() => Promise.resolve({ error }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    return { from, update, eq, client: { from } };
  }

  it("updates the student's own profiles row", async () => {
    const fake = fakeClient(null);
    getSupabase.mockResolvedValue(fake.client);

    expect(await saveAccountName("u1", "Ada Lovelace")).toEqual({});
    expect(fake.from).toHaveBeenCalledWith("profiles");
    expect(fake.update).toHaveBeenCalledWith({ full_name: "Ada Lovelace" });
    expect(fake.eq).toHaveBeenCalledWith("id", "u1");
  });

  it("returns an error when the update fails", async () => {
    getSupabase.mockResolvedValue(fakeClient({ message: "permission denied" }).client);
    const result = await saveAccountName("u1", "Ada");
    expect(result.error).toEqual(expect.any(String));
  });

  it("returns an error when there is no client", async () => {
    getSupabase.mockResolvedValue(null);
    expect((await saveAccountName("u1", "Ada")).error).toEqual(expect.any(String));
    getSupabase.mockRejectedValue(new Error("chunk failed"));
    expect((await saveAccountName("u1", "Ada")).error).toEqual(expect.any(String));
  });
});
