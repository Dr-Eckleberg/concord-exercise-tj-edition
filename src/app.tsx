import { useEffect, useMemo, useState } from "react";
import { Card } from "./components/card";
import { loadEmployees } from "./data/load-employees";
import {
  advisorOptions,
  comparePendingWork,
  compareWithoutVisa,
  isActionable,
  isFollowUp,
  isPendingWork,
  matchesAdvisor,
  needsAssignment,
  normaliseProfileStatus,
  type Row,
  UNASSIGNED,
} from "./data/prioritise";

type View = "pending" | "completed";

const PROFILE_LABEL = {
  completed: "Completed",
  "in progress": "In Progress",
  "not started": "Not Started",
} as const;

function rowKey(row: Row, index: number): string {
  return row.employee_id || `row-${index}-${row.email || row.full_name}`;
}

function App() {
  const [rows, setRows] = useState<Row[]>([]);
  const [view, setView] = useState<View>("pending");
  const [advisor, setAdvisor] = useState("");

  useEffect(() => {
    loadEmployees().then(setRows);
  }, []);

  const advisors = useMemo(() => advisorOptions(rows), [rows]);
  const filtered = useMemo(
    () => rows.filter((r) => matchesAdvisor(r, advisor)),
    [rows, advisor]
  );
  const pendingWork = useMemo(
    () => filtered
      .filter(isPendingWork)
      .sort(comparePendingWork),
    [filtered]
  );
  const completedWork = useMemo(
    () => filtered
      .filter((r) => !isPendingWork(r))
      .sort(compareWithoutVisa),
    [filtered]
  );
  const actionableCount = pendingWork.filter(isActionable).length;
  const visibleRows = view === "pending" ? pendingWork : completedWork;

  return (
    <div className="page">
      <h1>Visa Tracking</h1>
      <p className="subtitle">Advisor Dashboard</p>

      <div className="cards">
        <Card label="Action needed" value={actionableCount} />
      </div>

      <div className="toolbar">
        <div className="toggle">
          <button
            aria-pressed={view === "pending"}
            className={view === "pending" ? "active" : ""}
            onClick={() => setView("pending")}
            type="button"
          >
            Pending work ({pendingWork.length})
          </button>
          <button
            aria-pressed={view === "completed"}
            className={view === "completed" ? "active" : ""}
            onClick={() => setView("completed")}
            type="button"
          >
            Completed work ({completedWork.length})
          </button>
        </div>

        <label className="filter">
          Advisor{" "}
          <select onChange={(e) => setAdvisor(e.target.value)} value={advisor}>
            <option value="">All advisors</option>
            {advisors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
            <option value={UNASSIGNED}>Unassigned</option>
          </select>
        </label>
      </div>

      <table>
        <thead>
          <tr>
            <th>Priority</th>
            <th>ID</th>
            <th>Name</th>
            <th>Visa</th>
            <th>Profile</th>
            <th>Case status</th>
            <th>Completion</th>
            <th>Advisor</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, i) => {
            const actionable = isActionable(row);
            const followUp = isFollowUp(row);
            const unassigned = needsAssignment(row);
            const rowClasses = [
              actionable && "row-actionable",
              followUp && !actionable && "row-follow-up",
            ].filter(Boolean).join(" ");
            return (
              <tr className={rowClasses} key={rowKey(row, i)}>
                <td>
                  {actionable && (
                    <span className="badge badge-action">Action needed</span>
                  )}
                  {followUp && (
                    <span className="badge badge-follow-up">Follow up</span>
                  )}
                  {unassigned && (
                    <span className="badge badge-assignment">
                      Needs assignment
                    </span>
                  )}
                </td>
                <td>{row.employee_id || "—"}</td>
                <td>{row.full_name}</td>
                <td>{row.visa_type}</td>
                <td>
                  {PROFILE_LABEL[normaliseProfileStatus(row.profile_status)]}
                </td>
                <td>{row.case_status || "Not Filed"}</td>
                <td>
                  {row.profile_completion_pct !== ""
                    ? `${row.profile_completion_pct}%`
                    : "—"}
                </td>
                <td>{row.assigned_advisor || "Unassigned"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default App;
