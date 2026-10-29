/**
 * The lesson-start card's states, at #/app/gallery/start?state=ready|free|empty|exam|restart.
 * Development only, lazy, never in a student's payload. It drives the REAL
 * ChargeGate against the local journal (spending and an exam date are written
 * to the dev profile), so every word and number on screen is derived.
 */
import { lazy, Suspense, useEffect, useState } from "react";
import { hashParam } from "../app/routes";
import { progress } from "../app/progress";
import { useReducedMotion } from "../app/hooks";
import { ChargeGate } from "./ChargeGate";
import type { ChargeGateNode } from "./chargeGateModel";

const PathwayTab = lazy(() => import("../tabs/pathway/PathwayTab"));

const REACTION: ChargeGateNode = { id: "u3-directing", kind: "reaction", title: "Directing groups", place: "Step 4 of 6", href: "#/lesson/u3-directing" };
const TUTORIAL: ChargeGateNode = { id: "tutorial-1", kind: "tutorial", title: "How Blueberry works", href: "#/lesson/tutorial-1" };
const REVIEW: ChargeGateNode = { id: "u1-review", kind: "review", title: "Review: resonance", href: "#/lesson/u1-review" };
const QUIZ: ChargeGateNode = { id: "u3-quiz", kind: "quiz", title: "Unit 3 quiz", href: "#/lesson/u3-quiz", final: true };

export default function StartPopGallery() {
  const state = hashParam("state") ?? "ready";
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<ChargeGateNode | null>(null);
  useEffect(() => {
    progress.reset();
    if (state === "empty") {
      for (let i = 0; i < 12; i += 1) progress.startNode(`dev-drain-${i}`, "reaction");
    }
    if (state === "exam") {
      const d = new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10);
      progress.setSettings({ examDate: d });
    }
    setOpen(null);
    const want = state === "free" ? TUTORIAL : state === "quiz" ? QUIZ : state === "review" ? REVIEW : REACTION;
    if (hashParam("path") === "0") {
      setOpen(want);
      return;
    }
    // Over the live path: wait for a node to exist, focus the n-th (the sheet hangs under whatever held
    // focus when it opened, exactly as after a real tap), then open.
    const nth = Number(hashParam("n") ?? "1");
    let tries = 0;
    const id = window.setInterval(() => {
      const nodes = document.querySelectorAll<HTMLElement>('.path-node:not(.path-node--locked)');
      tries += 1;
      if (nodes.length > nth || tries > 80) {
        window.clearInterval(id);
        nodes[Math.min(nth, nodes.length - 1)]?.focus({ preventScroll: false });
        window.setTimeout(() => setOpen(want), 120);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [state]);
  return (
    <>
      {hashParam("path") === "0" ? null : (
        <Suspense fallback={null}>
          <PathwayTab reducedMotion={reduced} />
        </Suspense>
      )}
    <ChargeGate
      node={open}
      onClose={() => setOpen(null)}
      reducedMotion={reduced}
      {...(state === "restart" ? { restartSaved: "4 saved questions" } : {})}
    />
    </>
  );
}
