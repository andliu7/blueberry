/** "#/app/admin/tasks": the task board as a page. Staff only, mounted from AdminViewer behind AdminGate. */
import TaskBoard from "./TaskBoard";

export default function TaskBoardPage() {
  return (
    <div className="tb-page">
      <TaskBoard />
    </div>
  );
}
