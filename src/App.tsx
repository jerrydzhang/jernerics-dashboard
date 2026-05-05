import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { getToken, setToken } from "./api/client";
import { MetricCurves } from "./components/MetricCurves";
import { ObjectiveScatter } from "./components/ObjectiveScatter";
import { ObjectiveToolbar } from "./components/ObjectiveToolbar";
import { TrialTable } from "./components/TrialTable";
import { useObjective } from "./hooks/useObjective";
import { useProjects, useSweeps } from "./hooks/useProjects";
import {
  useMetricData,
  useMetricKeys,
  useTrialData,
} from "./hooks/useTrialData";
import { parseStudyName } from "./queries/studyName";

const queryClient = new QueryClient();

export default function App() {
  const [token, setTok] = useState(getToken());

  if (!token) {
    return (
      <AuthPrompt
        onAuth={(t) => {
          setToken(t);
          setTok(t);
        }}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function AuthPrompt({ onAuth }: { onAuth: (t: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex h-screen items-center justify-center bg-deep">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAuth(val);
        }}
        className="bg-surface p-8"
      >
        <label htmlFor="api-key" className="mb-2 block text-sm text-muted">
          API Key
        </label>
        <input
          id="api-key"
          type="password"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="mb-4 block w-64 bg-raised px-3 py-2 text-primary"
        />
        <button
          type="submit"
          className="bg-raised px-4 py-2 text-sm text-primary"
        >
          Connect
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard layout: sidebar + main content
// ---------------------------------------------------------------------------

function Dashboard() {
  const [project, setProject] = useState<string | null>(null);
  const [selectedSweeps, setSelectedSweeps] = useState<Set<string>>(new Set());

  const handleSelectProject = useCallback((p: string | null) => {
    setProject(p);
    setSelectedSweeps(new Set());
  }, []);

  const handleToggleSweep = useCallback((s: string) => {
    setSelectedSweeps((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }, []);

  const sweepNames = Array.from(selectedSweeps);

  return (
    <div className="flex h-screen bg-deep">
      <Sidebar
        project={project}
        onSelectProject={handleSelectProject}
        selectedSweeps={selectedSweeps}
        onToggleSweep={handleToggleSweep}
      />
      <div className="flex-1 overflow-y-auto">
        {!project || selectedSweeps.size === 0 ? (
          <div className="flex h-full items-center justify-center text-muted">
            Select a project and sweeps to begin
          </div>
        ) : (
          <StudyView project={project} sweepNames={sweepNames} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar: project list + sweep list
// ---------------------------------------------------------------------------

function Sidebar({
  project,
  onSelectProject,
  selectedSweeps,
  onToggleSweep,
}: {
  project: string | null;
  onSelectProject: (p: string | null) => void;
  selectedSweeps: Set<string>;
  onToggleSweep: (s: string) => void;
}) {
  const projects = useProjects();
  const sweepList = useSweeps(project);

  return (
    <aside className="hidden h-screen w-[260px] flex-shrink-0 flex-col bg-surface md:flex">
      {/* Projects */}
      <div className="border-b border-deep p-3">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
          Projects
        </h2>
        {projects.data?.map((p) => (
          <button
            key={p.project}
            type="button"
            onClick={() =>
              onSelectProject(project === p.project ? null : p.project)
            }
            className={`mb-0.5 w-full cursor-pointer px-2 py-1.5 text-left text-sm ${
              project === p.project
                ? "bg-raised text-bright"
                : "text-primary hover:bg-raised"
            }`}
          >
            {p.project}
          </button>
        ))}
      </div>

      {/* Sweeps */}
      <div className="flex-1 overflow-y-auto p-3">
        {!project ? (
          <p className="text-sm text-muted">Select a project</p>
        ) : (
          <>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              Sweeps
            </h2>
            {sweepList.data?.map((s) => {
              const parsed = parseStudyName(s.studyName);
              const isSelected = selectedSweeps.has(s.studyName);
              return (
                <button
                  key={s.studyName}
                  type="button"
                  onClick={() => onToggleSweep(s.studyName)}
                  className={`mb-0.5 w-full cursor-pointer px-2 py-1.5 text-left text-sm ${
                    isSelected
                      ? "bg-raised text-bright"
                      : "text-primary hover:bg-raised"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate font-mono text-[13px]">
                      {parsed?.configStem ?? s.studyName}
                    </span>
                    {s.hasActive && (
                      <span className="ml-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green" />
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <span>
                      {parsed?.startedDate.toLocaleDateString() ??
                        s.startedDate.toLocaleDateString()}
                    </span>
                    <span>{s.trialCount} trials</span>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Study view — charts go here (Optuna-style fixed layout)
// ---------------------------------------------------------------------------

function StudyView({
  project,
  sweepNames,
}: {
  project: string;
  sweepNames: string[];
}) {
  const { objectives, set: setObjectives } = useObjective(project);
  const trialData = useTrialData(project, sweepNames);
  const metricKeys = useMetricKeys(project, sweepNames);
  const [selectedMetricKey, setSelectedMetricKey] = useState<string | null>(
    null,
  );
  const metricData = useMetricData(project, sweepNames, selectedMetricKey);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Auto-select first metric key when keys arrive
  const handleMetricKeys = metricKeys.data;
  if (!selectedMetricKey && handleMetricKeys && handleMetricKeys.length > 0) {
    setSelectedMetricKey(handleMetricKeys[0] ?? "");
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium text-bright">
          {sweepNames.length === 1
            ? sweepNames[0]
            : `${sweepNames.length} sweeps selected`}
        </h1>
        <ObjectiveToolbar
          project={project}
          sweepNames={sweepNames}
          objectives={objectives}
          onSetObjectives={setObjectives}
        />
      </div>

      {(!objectives || objectives.length === 0) && (
        <p className="mt-3 text-sm text-muted">
          Configure objectives above to see analysis.
        </p>
      )}

      {/* Objective scatter */}
      {objectives && objectives.length > 0 && (
        <div className="mt-4">
          <ObjectiveScatter
            trials={trialData.data ?? []}
            objectives={objectives}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
          />
        </div>
      )}

      {/* Metric curves */}
      {metricKeys.data && metricKeys.data.length > 0 && (
        <div className="mt-4">
          <MetricCurves
            series={metricData.data ?? []}
            trials={trialData.data ?? []}
            metricKeys={metricKeys.data}
            selectedMetricKey={selectedMetricKey}
            onMetricChange={setSelectedMetricKey}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
          />
        </div>
      )}

      {/* Trial table */}
      {trialData.data && trialData.data.length > 0 && (
        <div className="mt-4">
          <TrialTable
            trials={trialData.data}
            objectives={objectives ?? []}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
          />
        </div>
      )}
    </div>
  );
}
