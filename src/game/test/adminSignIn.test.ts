/**
 * The staff viewer for a signed-out visitor (owner, 23 Oct: "add a sign in
 * CTA"). AdminGate offers a sign-in instead of bouncing them to the path; a
 * signed-in non-staff visitor is still sent to the path.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminSignIn } from "../admin/AdminSignIn";

const game = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(game, rel), "utf8");

describe("AdminSignIn", () => {
  it("links to the site sign-in with the game's primary button", () => {
    const html = renderToStaticMarkup(createElement(AdminSignIn));
    expect(html).toContain('href="#/signin"');
    expect(html).toContain("btn3d btn3d--primary");
    expect(html).toContain("Sign in to open the lesson viewer");
  });

  it("remembers the viewer as the place to come back to", () => {
    expect(read("admin/AdminSignIn.tsx")).toMatch(/onClick=\{\(\) => rememberReturn\(window\.location\.hash\)\}/);
  });
});

describe("AdminGate wiring", () => {
  const app = read("App.tsx");
  const gate = app.slice(app.indexOf("function AdminGate"));

  it("renders the sign-in card when signed out", () => {
    // Localhost counts as staff and skips the card (owner, 29 Oct); the deployed site still shows it.
    expect(gate).toMatch(/const signedOut = !loading && user === null && !devLocal;/);
    expect(gate).toMatch(/if \(signedOut\) \{[\s\S]*?<AdminSignIn \/>/);
  });

  it("still sends a signed-in non-staff visitor to the path", () => {
    expect(gate).toMatch(/if \(!waiting && !staff && !signedOut\) navigate\(hrefForTab\("pathway"\)\)/);
  });
});
