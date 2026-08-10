"use client";

import { useEffect, useState } from "react";

export function GlassTimeCard({ showSeconds = false, showTimezone = false }: { showSeconds?: boolean; showTimezone?: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id); }, []);
  return <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-white shadow-xl backdrop-blur-xl"><p className="text-center text-sm text-white/70">{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p><p className="mt-1 text-center font-mono text-3xl font-semibold tabular-nums">{now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: showSeconds ? "2-digit" : undefined, hour12: false })}</p>{showTimezone && <p className="mt-1 text-center text-xs text-white/55">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>}</div>;
}
