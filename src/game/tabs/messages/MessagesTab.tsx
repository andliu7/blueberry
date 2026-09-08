/**
 * Tutor messaging. Async, moderated, shipped last (Phase 8). The logistics are
 * an owner decision recorded before Phase 8 builds them, so this tab states
 * the shape and stops.
 */

import { Card, Pill } from "../../app/ui/Card";

export default function MessagesTab() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-scale-lg font-semibold">Tutor messages</h2>
          <Pill>Phase 8</Pill>
        </div>
        <p className="mt-2 text-scale-sm text-bb-muted-foreground">
          A place to send a tutor the exact step you are stuck on, with the mechanism attached,
          and get an answer back when they are next online. Messages are moderated. This tab
          opens once the tutoring logistics are decided and the Phase 8 server exists.
        </p>
      </Card>
    </div>
  );
}
