/**
 * The two admin statistics boards under one page: "#/app/admin/stats".
 *
 * Staff only. It is mounted from AdminViewer, which App.tsx only renders behind
 * AdminGate, so a non-staff visitor never reaches it. Both boards are lazy, so
 * neither is in the #/app entry chunk, and only the tab on screen is fetched.
 *
 * Both show labelled sample data until a staff-only server function exists (the
 * analytics_* views are revoked from the API roles on purpose); each board's
 * header comment documents the contract that function must fill.
 */
import { lazy, Suspense, useState } from "react";

const StatsBoardPage = lazy(() => import("./StatsBoard"));
const GrowthBoard = lazy(() => import("@/components/admin/GrowthBoard"));

const TABS = [
  { id: "learners", label: "Learners" },
  { id: "growth", label: "Growth" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function BoardsPage() {
  const [tab, setTab] = useState<TabId>("learners");
  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 pb-10">
      <div role="tablist" aria-label="Statistics board" className="my-3 inline-flex rounded-[12px] bg-muted p-[3px]">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-[44px] min-w-[96px] rounded-[10px] px-4 text-sm font-semibold transition-colors ${tab === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <Suspense fallback={<p className="av-empty">Loading the board...</p>}>
        {tab === "learners" ? <StatsBoardPage /> : <GrowthBoard />}
      </Suspense>
    </div>
  );
}
