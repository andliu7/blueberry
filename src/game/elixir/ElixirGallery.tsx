/**
 * #/app/gallery/elixir?energy=7&cap=25&sleep=90
 *
 * Development only, lazy. Shows the vial, the bar and Bloom together over
 * demo numbers. `sleep` is the nap delay in seconds, so a critic can see the
 * sleep and the wake in a few seconds instead of waiting ninety.
 */
import { useState } from "react";
import { hashParam } from "../app/routes";
import { useReducedMotion } from "../app/hooks";
import { ElixirBloom } from "./ElixirBloom";

function num(name: string, fallback: number): number {
  const v = Number(hashParam(name));
  return Number.isFinite(v) && hashParam(name) !== null ? v : fallback;
}

export default function ElixirGallery() {
  const reduced = useReducedMotion();
  const cap = Math.max(1, num("cap", 25));
  const [current, setCurrent] = useState(Math.min(cap, Math.max(0, num("energy", 7))));
  const [drinkKey, setDrinkKey] = useState(0);
  const sleepMs = Math.max(1, num("sleep", 90)) * 1000;

  return (
    <main className="elx-page" style={{ display: "grid", justifyItems: "center", gap: 8, padding: "24px 16px 96px" }}>
      <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#fff" }}>Energy</h1>
      <ElixirBloom current={current} cap={cap} drinkKey={drinkKey} reducedMotion={reduced} sleepAfterMs={sleepMs} />
      <div className="elx-actions">
        <button
          type="button"
          className="elx-btn"
          onClick={() => {
            setCurrent(cap);
            setDrinkKey((k) => k + 1);
          }}
        >
          Drink elixir
        </button>
        <button type="button" className="elx-btn" data-quiet onClick={() => setCurrent((c) => Math.max(0, c - 5))}>
          Use 5
        </button>
      </div>
    </main>
  );
}
