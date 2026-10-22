import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button, Icon, Overlay } from "./components/ui";
import {
  type AdvisorScope,
  applyAction,
  type CaseRecord,
  type ClientId,
  type ClientScope,
  type Country,
  createDemo,
  type DemoAction,
  DemoError,
  type DemoState,
  OBLIGATION_TYPES,
  type ObligationType,
  type Owner,
  pendingSections,
  type Queue,
  type ReviewCode,
  type SectionId,
  type Stage,
} from "./data/workspace";

export type Screen = "work" | "cases" | "compliance" | "review" | "not-found";
export type CaseTab = "active" | "mine" | "ready" | "verification" | "closed";
export type CasePanelTab = "overview" | "tasks" | "history" | "evidence";
export type Column =
  | "person"
  | "route"
  | "profile"
  | "application"
  | "action"
  | "advisor"
  | "id"
  | "deadline"
  | "deadlineType"
  | "expiry";
export const COLUMN_LABELS: Record<Column, string> = {
  person: "Person / client",
  route: "Route / country",
  profile: "Profile readiness",
  application: "Application",
  action: "Next action / waiting on",
  advisor: "Advisor",
  id: "Case ID",
  deadline: "Next deadline",
  deadlineType: "Deadline type",
  expiry: "Recorded visa expiry",
};
export const DEFAULT_COLUMNS: Column[] = [
  "person",
  "route",
  "profile",
  "application",
  "action",
  "advisor",
];
export type CaseSort =
  | "custom"
  | "name"
  | "name-desc"
  | "deadline"
  | "deadline-desc"
  | "advisor"
  | "advisor-desc";
export type CaseFilters = {
  advisor: AdvisorScope;
  country: Country | "all";
  readiness: ReviewCode[];
  search: string;
  routes: string[];
  stages: Stage[];
  owners: Owner[];
};
export function defaultFilters(): CaseFilters {
  return {
    advisor: "all",
    country: "all",
    readiness: [],
    search: "",
    routes: [],
    stages: [],
    owners: [],
  };
}

export type Surface =
  | { kind: "case"; caseId: string; tab: CasePanelTab }
  | { kind: "people" }
  | { kind: "person"; personId: string }
  | { kind: "clients" }
  | { kind: "client"; clientId: ClientId }
  | { kind: "employer"; clientId?: ClientId }
  | { kind: "obligation"; obligationId: string }
  | { kind: "day"; date: string }
  | { kind: "search" }
  | { kind: "history"; caseId: string }
  | {
      kind: "document";
      caseId: string;
      section: SectionId;
      documentIndex: number;
    }
  | { kind: "readiness"; caseId: string }
  | { kind: "approve"; caseId: string }
  | { kind: "conversation"; requestId: string; remind?: boolean }
  | {
      kind: "compose";
      caseId: string;
      section: SectionId;
      field?: string;
      text?: string;
    }
  | { kind: "assign"; caseId: string }
  | { kind: "action"; caseId: string; taskId?: string }
  | { kind: "deadline"; caseId: string }
  | { kind: "complete"; obligationId: string }
  | { kind: "preparation"; caseId: string }
  | { kind: "new"; renewalCaseId?: string }
  | { kind: "verify"; obligationId: string }
  | { kind: "planning"; obligationId?: string; clientId?: ClientId }
  | { kind: "policy" }
  | { kind: "policy-tasks"; caseIds: string[] }
  | { kind: "policy-message"; caseIds: string[] }
  | { kind: "columns" }
  | { kind: "more-filters" }
  | { kind: "readiness-filter" }
  | { kind: "save-view" }
  | { kind: "saved-views" }
  | { kind: "delete-view"; viewId: string }
  | { kind: "about" | "demo" | "user" | "reset" | "simulate" | "menu" };

export type Navigation = {
  screen: Screen;
  client: ClientScope;
  advisor: AdvisorScope;
  queue: Queue | null;
  reviewSort: "oldest" | "newest";
  caseTab: CaseTab;
  filters: CaseFilters;
  columns: Column[];
  sort: CaseSort;
  page: number;
  complianceMode: "list" | "calendar";
  category: "past" | "upcoming" | "passport" | "employer" | null;
  types: ObligationType[];
  month: string;
  selectedDay: string | null;
  expandedPast: boolean;
  reviewCaseId: string;
  section: SectionId;
  origin: "work" | "cases" | "compliance";
  overlays: (Surface & { key: string })[];
  returnTo?: Navigation;
  scrollY: number;
};
export type SavedView = {
  id: string;
  name: string;
  tab: CaseTab;
  filters: CaseFilters;
  columns: Column[];
  sort: CaseSort;
};
type Notice = { text: string; error: boolean; id: number };
type PendingDiscard = {
  proceed: () => void;
  scopes: string[];
  opener: HTMLElement | null;
};

function focusedElement(): HTMLElement | null {
  return document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
}

function dirtyScopes(keys: Iterable<string>): string[] {
  return [...new Set([...keys].map((key) => key.slice(0, key.indexOf(":"))))];
}

function retainsDraftScope(
  scope: string,
  current: Navigation,
  target: Navigation
): boolean {
  if (scope !== "screen") {
    return target.overlays.some(
      (surface) => scope === `surface-${surface.key}`
    );
  }
  return (
    current.screen === target.screen &&
    (current.screen !== "review" ||
      (current.reviewCaseId === target.reviewCaseId &&
        current.section === target.section))
  );
}

export function initialNavigation(): Navigation {
  return {
    screen: "work",
    client: "all",
    advisor: "all",
    queue: null,
    reviewSort: "oldest",
    caseTab: "active",
    filters: defaultFilters(),
    columns: [...DEFAULT_COLUMNS],
    sort: "custom",
    page: 1,
    complianceMode: "list",
    category: null,
    types: [...OBLIGATION_TYPES],
    month: "2026-10",
    selectedDay: null,
    expandedPast: false,
    reviewCaseId: "C01",
    section: "employment",
    origin: "work",
    overlays: [],
    scrollY: 0,
  };
}

const HASH_PREFIX = /^#\/?/;
const ROUTE_SEPARATOR = /[/?]/;
const CASE_ID_PATTERN = /^C\d+$/;

function navigationFromUrl(): Navigation {
  const nav = initialNavigation();
  const parts = window.location.hash
    .replace(HASH_PREFIX, "")
    .split(ROUTE_SEPARATOR);
  const screen = parts[0] || "work";
  const knownSection = [
    "personal",
    "immigration",
    "employment",
    "achievements",
    "evidence",
  ].includes(parts[2]);
  if (
    (screen === "work" || screen === "cases" || screen === "compliance") &&
    (parts.length === 1 || (parts.length === 2 && !parts[1]))
  ) {
    nav.screen = screen;
  } else if (
    screen === "review" &&
    CASE_ID_PATTERN.test(parts[1] ?? "") &&
    parts.length <= 3 &&
    (!parts[2] || knownSection)
  ) {
    nav.screen = "review";
    nav.reviewCaseId = parts[1];
    if (knownSection) {
      nav.section = parts[2] as SectionId;
    }
  } else {
    nav.screen = "not-found";
  }
  return nav;
}

function urlFor(nav: Navigation): string {
  return nav.screen === "review"
    ? `#/review/${nav.reviewCaseId}/${nav.section}`
    : `#/${nav.screen}`;
}

type NavigateOptions = { force?: boolean; replace?: boolean };
type WorkspaceApi = {
  demo: DemoState;
  nav: Navigation;
  savedViews: SavedView[];
  editEpoch: number;
  discarding: boolean;
  navigate: (patch: Partial<Navigation>, options?: NavigateOptions) => void;
  open: (surface: Surface) => void;
  replaceSurface: (surface: Surface, force?: boolean) => void;
  close: (force?: boolean) => void;
  openCase: (caseId: string, tab?: CasePanelTab) => void;
  openReview: (record: CaseRecord, section?: SectionId) => void;
  backFromReview: () => void;
  change: (action: DemoAction, message?: string) => DemoState | null;
  notify: (text: string, error?: boolean) => void;
  registerDirty: (id: string, value: boolean) => void;
  hasDirty: (scope?: string) => boolean;
  returnFocusFor: (key: string) => HTMLElement | null;
  saveView: (name: string) => void;
  deleteView: (id: string) => void;
  reset: () => void;
};
const Workspace = createContext<WorkspaceApi | null>(null);
export const DirtyScope = createContext("screen");

export function useWorkspace(): WorkspaceApi {
  const context = useContext(Workspace);
  if (!context) {
    throw new Error("Workspace components must be inside WorkspaceProvider.");
  }
  return context;
}

export function useDirty(value: boolean): void {
  const { registerDirty } = useWorkspace();
  const scope = useContext(DirtyScope);
  const id = `${scope}:${useId()}`;
  useEffect(() => {
    registerDirty(id, value);
    return () => registerDirty(id, false);
  }, [id, value, registerDirty]);
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState(createDemo);
  const demoRef = useRef(demo);
  const [nav, setNav] = useState(navigationFromUrl);
  const navRef = useRef(nav);
  const openers = useRef(new Map<string, HTMLElement | null>());
  const historyIndex = useRef<number>(
    typeof window.history.state?.waypointIndex === "number"
      ? window.history.state.waypointIndex
      : 0
  );
  const restoringTraversal = useRef<(() => void) | null>(null);
  const allowTraversal = useRef(false);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pendingDiscard, setPendingDiscard] = useState<PendingDiscard | null>(
    null
  );
  const [editEpoch, setEditEpoch] = useState(0);
  const dirty = useRef(new Map<string, boolean>());
  const [, setDirtyRevision] = useState(0);
  const registerDirty = useCallback((id: string, value: boolean) => {
    if (Boolean(dirty.current.get(id)) === value) {
      return;
    }
    if (value) {
      dirty.current.set(id, true);
    } else {
      dirty.current.delete(id);
    }
    setDirtyRevision((revision) => revision + 1);
  }, []);
  const hasDirty = useCallback(
    (scope?: string) =>
      [...dirty.current.entries()].some(
        ([id, value]) => value && (!scope || id.startsWith(`${scope}:`))
      ),
    []
  );
  const commitNavigation = useCallback((next: Navigation, replace = false) => {
    navRef.current = next;
    setNav(next);
    if (replace) {
      window.history.replaceState(
        { waypoint: next, waypointIndex: historyIndex.current },
        "",
        urlFor(next)
      );
    } else {
      historyIndex.current += 1;
      window.history.pushState(
        { waypoint: next, waypointIndex: historyIndex.current },
        "",
        urlFor(next)
      );
    }
  }, []);
  const guard = useCallback(
    (callback: () => void, scope?: string, target?: Navigation) => {
      const scopes = dirtyScopes(dirty.current.keys()).filter((candidate) =>
        scope
          ? candidate === scope
          : !(target && retainsDraftScope(candidate, navRef.current, target))
      );
      if (scopes.length) {
        setPendingDiscard({
          proceed: callback,
          scopes,
          opener: focusedElement(),
        });
      } else {
        callback();
      }
    },
    []
  );
  useEffect(() => {
    window.history.replaceState(
      { waypoint: navRef.current, waypointIndex: historyIndex.current },
      "",
      urlFor(navRef.current)
    );
    const pop = (event: PopStateEvent) => {
      if (restoringTraversal.current) {
        const restored = restoringTraversal.current;
        restoringTraversal.current = null;
        restored();
        return;
      }
      const target: Navigation = event.state?.waypoint ?? navigationFromUrl();
      const targetIndex =
        typeof event.state?.waypointIndex === "number"
          ? event.state.waypointIndex
          : historyIndex.current - 1;
      const apply = () => {
        navRef.current = target;
        historyIndex.current = targetIndex;
        setNav(target);
        window.history.replaceState(
          { waypoint: target, waypointIndex: targetIndex },
          "",
          urlFor(target)
        );
      };
      const scopes = dirtyScopes(dirty.current.keys()).filter(
        (scope) => !retainsDraftScope(scope, navRef.current, target)
      );
      if (scopes.length && !allowTraversal.current) {
        const delta = targetIndex - historyIndex.current;
        if (delta === 0) {
          window.history.replaceState(
            { waypoint: navRef.current, waypointIndex: historyIndex.current },
            "",
            urlFor(navRef.current)
          );
          setPendingDiscard({
            proceed: apply,
            scopes,
            opener: focusedElement(),
          });
          return;
        }
        // Restore the current entry while asking, without truncating Forward history.
        restoringTraversal.current = () =>
          setPendingDiscard({
            scopes,
            opener: focusedElement(),
            proceed: () => {
              allowTraversal.current = true;
              window.history.go(delta);
            },
          });
        window.history.go(-delta);
        return;
      }
      allowTraversal.current = false;
      apply();
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (!notice || notice.error) {
      return;
    }
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const blocked = nav.overlays.length > 0 || Boolean(pendingDiscard);
    document.body.style.overflow = blocked ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [nav.overlays.length, pendingDiscard]);
  const lastScreen = useRef(nav.screen);
  useEffect(() => {
    if (lastScreen.current !== nav.screen) {
      window.scrollTo({ top: nav.scrollY, behavior: "instant" });
      lastScreen.current = nav.screen;
    }
    document.title = `Waypoint | ${nav.screen === "work" ? "My work" : nav.screen === "review" ? "Profile review" : nav.screen === "cases" ? "Cases" : nav.screen === "compliance" ? "Compliance" : "Not found"}`;
  }, [nav.screen, nav.scrollY]);

  const notify = (text: string, error = false) =>
    setNotice({ text, error, id: Date.now() });
  const navigate = (patch: Partial<Navigation>, options?: NavigateOptions) => {
    const target = { ...navRef.current, overlays: [], scrollY: 0, ...patch };
    if (target.screen !== "review") {
      target.returnTo = undefined;
    }
    const callback = () => commitNavigation(target, options?.replace);
    if (options?.force) {
      callback();
    } else {
      guard(callback, undefined, target);
    }
  };
  const open = (surface: Surface) => {
    const current = navRef.current;
    const key = crypto.randomUUID();
    openers.current.set(key, focusedElement());
    commitNavigation({
      ...current,
      overlays: [...current.overlays, { ...surface, key }],
    });
  };
  const replaceSurface = (surface: Surface, force = false) => {
    const callback = () => {
      const current = navRef.current;
      const previous = current.overlays.at(-1);
      const key =
        previous?.kind === surface.kind ? previous.key : crypto.randomUUID();
      if (!openers.current.has(key)) {
        openers.current.set(
          key,
          (previous && openers.current.get(previous.key)) ?? focusedElement()
        );
      }
      commitNavigation({
        ...current,
        overlays: [
          ...current.overlays.slice(0, -1),
          {
            ...surface,
            key,
          },
        ],
      });
    };
    if (force) {
      callback();
    } else {
      guard(callback, `surface-${navRef.current.overlays.at(-1)?.key}`);
    }
  };
  const close = (force = false) => {
    const callback = () => {
      const current = navRef.current;
      commitNavigation({ ...current, overlays: current.overlays.slice(0, -1) });
    };
    if (force) {
      callback();
    } else {
      guard(callback, `surface-${navRef.current.overlays.at(-1)?.key}`);
    }
  };
  const change = (action: DemoAction, message?: string): DemoState | null => {
    try {
      const next = applyAction(demoRef.current, action);
      demoRef.current = next;
      setDemo(next);
      if (message) {
        notify(message);
      }
      return next;
    } catch (error) {
      if (!(error instanceof DemoError)) {
        throw error;
      }
      notify(error.message, true);
      return null;
    }
  };
  const openReview = (record: CaseRecord, section?: SectionId) => {
    const current = navRef.current;
    const origin =
      current.screen === "review" || current.screen === "not-found"
        ? current.origin
        : current.screen;
    const target: Navigation = {
      ...current,
      screen: "review",
      reviewCaseId: record.id,
      section:
        section ??
        (record.id === "C01"
          ? "employment"
          : (pendingSections(record)[0] ?? "personal")),
      origin,
      overlays: [],
      scrollY: 0,
      returnTo:
        current.screen === "review"
          ? current.returnTo
          : { ...current, overlays: [], scrollY: window.scrollY },
    };
    guard(
      () => {
        change({ type: "open-review", caseId: record.id });
        commitNavigation(target);
      },
      undefined,
      target
    );
  };
  const backFromReview = () =>
    navigate(nav.returnTo ?? { screen: nav.origin, overlays: [] });
  const reset = () => {
    const next = createDemo();
    demoRef.current = next;
    setDemo(next);
    setSavedViews([]);
    dirty.current.clear();
    openers.current.clear();
    setPendingDiscard(null);
    setEditEpoch((epoch) => epoch + 1);
    commitNavigation(initialNavigation(), true);
    notify("Demo reset. Initial fictional records restored.");
  };
  const saveView = (name: string) => {
    const current = navRef.current;
    setSavedViews((views) => [
      ...views,
      {
        id: crypto.randomUUID(),
        name,
        tab: current.caseTab,
        filters: structuredClone(current.filters),
        columns: [...current.columns],
        sort: current.sort,
      },
    ]);
    notify("View saved in demo.");
  };
  const api: WorkspaceApi = {
    demo,
    nav,
    savedViews,
    editEpoch,
    discarding: Boolean(pendingDiscard),
    navigate,
    open,
    replaceSurface,
    close,
    openCase: (caseId, tab = "overview") => open({ kind: "case", caseId, tab }),
    openReview,
    backFromReview,
    change,
    notify,
    registerDirty,
    hasDirty,
    returnFocusFor: (key) => openers.current.get(key) ?? null,
    saveView,
    deleteView: (id) => {
      setSavedViews((views) => views.filter((view) => view.id !== id));
      notify("Saved view deleted in demo.");
    },
    reset,
  };
  return (
    <Workspace.Provider value={api}>
      <div inert={Boolean(pendingDiscard)}>{children}</div>
      {notice && (
        <div
          aria-live={notice.error ? "assertive" : "polite"}
          className={`toast ${notice.error ? "error-toast" : ""}`}
          key={notice.id}
          role={notice.error ? "alert" : "status"}
        >
          <Icon name={notice.error ? "info" : "check"} />
          <span>{notice.text}</span>
          <button
            aria-label="Dismiss notification"
            className="icon-button"
            onClick={() => setNotice(null)}
            type="button"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {pendingDiscard && (
        <Overlay
          dismissOutside={false}
          index={100}
          onClose={() => setPendingDiscard(null)}
          returnFocus={pendingDiscard.opener}
          title="Discard unsaved changes?"
        >
          <p>Your unsaved edits have not been committed to the demo.</p>
          <div className="dialog-actions">
            <Button onClick={() => setPendingDiscard(null)}>
              Keep editing
            </Button>
            <Button
              onClick={() => {
                const { proceed, scopes } = pendingDiscard;
                for (const key of dirty.current.keys()) {
                  if (scopes.some((scope) => key.startsWith(`${scope}:`))) {
                    dirty.current.delete(key);
                  }
                }
                setPendingDiscard(null);
                if (scopes.includes("screen")) {
                  setEditEpoch((epoch) => epoch + 1);
                }
                proceed();
              }}
              primary
            >
              Discard
            </Button>
          </div>
        </Overlay>
      )}
    </Workspace.Provider>
  );
}
