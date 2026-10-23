// @vitest-environment jsdom

/**
 * The Me tab's name box (owner, item 11: "a display name typed while signed
 * out does not save: ask the person to sign in"). Signed out the pencil asks
 * for a sign-in and writes nothing; signed in it saves to the account.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { AuthState } from "@/lib/AuthContext";

const { auth, saveAccountName } = vi.hoisted(() => ({
  auth: { current: null as unknown as AuthState },
  saveAccountName: vi.fn(),
}));

vi.mock("@/lib/AuthContext", () => ({ useAuth: () => auth.current }));
vi.mock("@/lib/accountName", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/accountName")>()),
  saveAccountName,
}));

import { Profile } from "../tabs/me/MeTab";
import { progress } from "../app/progress";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const KEY = "blueberry.progress.v2";
let root: Root | null = null;
let host: HTMLElement | null = null;

function authAs(user: { id: string } | null, profileName: string | null = null): AuthState {
  return {
    session: null,
    user: user as AuthState["user"],
    role: "member",
    loading: false,
    profileName,
    profileLoaded: user !== null,
    refreshRole: vi.fn(),
  };
}

async function render(): Promise<HTMLElement> {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(createElement(Profile, { joined: null, course: null }));
  });
  return host;
}

function button(label: string): HTMLButtonElement {
  const found = [...host!.querySelectorAll("button")].find(
    (el) => el.getAttribute("aria-label") === label || el.textContent?.trim() === label,
  );
  if (found === undefined) throw new Error(`no button ${label}`);
  return found;
}

async function click(el: HTMLElement): Promise<void> {
  await act(async () => {
    el.click();
  });
}

/** Type into a React-controlled input: set the native value, then fire input. */
async function type(input: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  saveAccountName.mockReset();
  saveAccountName.mockResolvedValue({});
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

describe("Me tab name, signed out", () => {
  it("asks for a sign-in and leaves the stored name alone", async () => {
    auth.current = authAs(null);
    const before = localStorage.getItem(KEY);
    await render();

    await click(button("Add name"));

    expect(host!.querySelector("#me-name-input")).toBeNull();
    expect(host!.textContent).toContain("Sign in to save your name.");
    const link = host!.querySelector<HTMLAnchorElement>('a[href="#/signin"]');
    expect(link?.textContent).toContain("Sign in");
    expect(localStorage.getItem(KEY)).toBe(before);
    expect(saveAccountName).not.toHaveBeenCalled();
  });
});

describe("Me tab name, signed in", () => {
  it("saves the cleaned name to the account", async () => {
    auth.current = authAs({ id: "u1" }, "Ada");
    await render();
    expect(host!.querySelector(".me-name")?.textContent).toBe("Ada");

    await click(button("Edit name"));
    await type(host!.querySelector<HTMLInputElement>("#me-name-input")!, "  Ada    Lovelace ");
    await click(button("Save"));

    expect(saveAccountName).toHaveBeenCalledWith("u1", "Ada Lovelace");
    expect(auth.current.refreshRole).toHaveBeenCalled();
    expect(host!.querySelector("#me-name-input")).toBeNull();
  });

  it("still refuses a blank name", async () => {
    auth.current = authAs({ id: "u1" }, "Ada");
    await render();

    await click(button("Edit name"));
    await type(host!.querySelector<HTMLInputElement>("#me-name-input")!, "   ");
    await click(button("Save"));

    expect(saveAccountName).not.toHaveBeenCalled();
    expect(host!.querySelector("#me-name-error")?.textContent).toContain("Type a name to save");
  });

  it("keeps the form open with the reason when the save fails", async () => {
    auth.current = authAs({ id: "u1" }, "Ada");
    saveAccountName.mockResolvedValue({ error: "Your name did not save." });
    await render();

    await click(button("Edit name"));
    await type(host!.querySelector<HTMLInputElement>("#me-name-input")!, "Grace");
    await click(button("Save"));

    expect(host!.querySelector("#me-name-input")).not.toBeNull();
    expect(host!.querySelector("#me-name-error")?.textContent).toBe("Your name did not save.");
  });
});

describe("Me tab name, first signed-in visit", () => {
  it("moves a name typed on this device up to a nameless account, once", async () => {
    progress.setDisplayName("Rosalind");
    auth.current = authAs({ id: "u1" }, null);
    await render();
    await act(async () => {
      root!.render(createElement(Profile, { joined: null, course: null }));
    });

    expect(saveAccountName).toHaveBeenCalledTimes(1);
    expect(saveAccountName).toHaveBeenCalledWith("u1", "Rosalind");
    progress.setDisplayName("");
  });

  it("never overwrites an account that already has a name", async () => {
    progress.setDisplayName("Rosalind");
    auth.current = authAs({ id: "u1" }, "Ada");
    await render();

    expect(saveAccountName).not.toHaveBeenCalled();
    expect(host!.querySelector(".me-name")?.textContent).toBe("Ada");
    progress.setDisplayName("");
  });
});
