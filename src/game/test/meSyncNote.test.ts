// @vitest-environment jsdom

/**
 * The Me tab's honest sync line (STATUS A1). Until the progress table exists on
 * the account, a signed-in student's lessons stay on the device, and Me says
 * so in one quiet line. When sync is healthy there is no line at all.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { AuthState } from "@/lib/AuthContext";

const { auth } = vi.hoisted(() => ({ auth: { current: null as unknown as AuthState } }));

vi.mock("@/lib/AuthContext", () => ({ useAuth: () => auth.current }));

import { Profile } from "../tabs/me/MeTab";
import { setSyncStatus } from "../app/syncStatus";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement | null = null;

function authAs(user: { id: string } | null): AuthState {
  return {
    session: null,
    user: user as AuthState["user"],
    role: "member",
    loading: false,
    profileName: "Ada",
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

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  setSyncStatus("synced");
});

describe("Me tab sync line", () => {
  it("says lessons stay on the device when sync is local-only", async () => {
    auth.current = authAs({ id: "u1" });
    setSyncStatus("local-only");
    const el = await render();
    expect(el.textContent).toContain("Lessons save on this device for now.");
  });

  it("says it will save when back online, and updates as the status changes", async () => {
    auth.current = authAs({ id: "u1" });
    const el = await render();
    expect(el.textContent).not.toContain("back online");
    await act(async () => setSyncStatus("offline"));
    expect(el.textContent).toContain("Saving to your account when you are back online.");
    await act(async () => setSyncStatus("synced"));
    expect(el.textContent).not.toContain("back online");
  });

  it("shows nothing for a signed-out visitor", async () => {
    auth.current = authAs(null);
    setSyncStatus("local-only");
    const el = await render();
    expect(el.textContent).not.toContain("Lessons save on this device");
  });
});
