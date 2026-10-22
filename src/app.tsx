import { SurfaceHost } from "./components/surfaces";
import { Avatar, Button, Icon, LinkButton, Select } from "./components/ui";
import { CLIENTS, type ClientScope } from "./data/workspace";
import { CaseRegister } from "./screens/cases";
import { Compliance } from "./screens/compliance";
import { ProfileReview } from "./screens/review";
import { MyWork } from "./screens/work";
import { useWorkspace, WorkspaceProvider } from "./workspace-context";

function Sidebar() {
  const { nav, navigate, open } = useWorkspace();
  const active = nav.screen === "review" ? nav.origin : nav.screen;
  return (
    <aside aria-label="Main navigation" className="sidebar">
      <button
        aria-label="Waypoint, go to My work"
        className="brand"
        onClick={() => navigate({ screen: "work" })}
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="none"
          height="21"
          viewBox="0 0 24 24"
          width="21"
        >
          <path
            d="m12 2 10 10-10 10L2 12Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path d="m12 7 5 5-5 5-5-5Z" fill="currentColor" />
        </svg>
        waypoint
      </button>
      <div className="navlabel">Workspace</div>
      <nav>
        {(["work", "cases", "compliance"] as const).map((screen) => (
          <button
            aria-current={active === screen ? "page" : undefined}
            className={`navitem ${active === screen ? "active" : ""}`}
            key={screen}
            onClick={() => navigate({ screen })}
            type="button"
          >
            <Icon name={screen} />
            <span>
              {screen === "work"
                ? "My work"
                : screen === "cases"
                  ? "Cases"
                  : "Compliance"}
            </span>
          </button>
        ))}
      </nav>
      <div className="navlabel directory-label">Directory</div>
      <nav>
        <button
          className="navitem directory-item"
          onClick={() => open({ kind: "people" })}
          type="button"
        >
          People
        </button>
        <button
          className="navitem directory-item"
          onClick={() => open({ kind: "clients" })}
          type="button"
        >
          Clients
        </button>
      </nav>
      <div className="sidebar-bottom">
        <button
          className="user-button"
          onClick={() => open({ kind: "user" })}
          type="button"
        >
          <Avatar name="A. Singh" />
          <span>
            A. Singh
            <span className="muted tiny user-role">Immigration advisor</span>
          </span>
        </button>
      </div>
    </aside>
  );
}

function Topbar() {
  const { demo, nav, navigate, open, openCase } = useWorkspace();
  const record = demo.cases.find((item) => item.id === nav.reviewCaseId);
  return (
    <header
      className={`topbar ${nav.screen === "review" ? "review-topbar" : ""}`}
    >
      <Button
        className="mobile-menu-button"
        onClick={() => open({ kind: "menu" })}
      >
        <Icon name="menu" />
        <span className="sr-only">Menu</span>
      </Button>
      {nav.screen === "review" && record ? (
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <LinkButton
            onClick={() => open({ kind: "client", clientId: record.client })}
          >
            {CLIENTS[record.client]}
          </LinkButton>
          <span aria-hidden="true">/</span>
          <LinkButton onClick={() => openCase(record.id)}>
            {record.route}
          </LinkButton>
          <span aria-hidden="true">/</span>
          <span>Profile review</span>
        </nav>
      ) : (
        <>
          <Select
            className="client-selector"
            label="Client scope"
            onChange={(event) =>
              navigate({ client: event.target.value as ClientScope, page: 1 })
            }
            value={nav.client}
          >
            <option value="all">All clients</option>
            {Object.entries(CLIENTS).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
          <button
            aria-label="Search people, cases, or clients"
            className="global-search-trigger"
            onClick={() => open({ kind: "search" })}
            type="button"
          >
            <Icon name="search" size={15} />
            <span className="desktop-search-label">
              Search people, cases, or clients...
            </span>
            <span className="mobile-search-label">Search</span>
          </button>
        </>
      )}
      <div className="topbar-meta">
        {nav.screen === "compliance" && (
          <span className="as-of">As of 18 Oct 2026</span>
        )}
        <button
          className="demo-indicator"
          onClick={() => open({ kind: "demo" })}
          type="button"
        >
          <span aria-hidden="true" className="demo-dot" />
          Demo <span className="demo-detail">- fictional data</span>
          <Icon name="chevron" size={11} />
        </button>
      </div>
    </header>
  );
}

function WorkspaceShell() {
  const { nav, navigate } = useWorkspace();
  return (
    <>
      <div className="app-shell" inert={nav.overlays.length > 0}>
        <button
          className="skip-link"
          onClick={() => document.getElementById("workspace-content")?.focus()}
          type="button"
        >
          Skip to content
        </button>
        <Sidebar />
        <div className="main-column">
          <Topbar />
          <div id="workspace-content" tabIndex={-1}>
            {nav.screen === "work" && <MyWork />}
            {nav.screen === "cases" && <CaseRegister />}
            {nav.screen === "compliance" && <Compliance />}
            {nav.screen === "review" && <ProfileReview />}
            {nav.screen === "not-found" && (
              <main className="content not-found">
                <Icon name="search" size={32} />
                <h1>That destination isn&apos;t here.</h1>
                <p>Let&apos;s get you back to your advisor workspace.</p>
                <Button onClick={() => navigate({ screen: "work" })} primary>
                  Go to My work
                </Button>
              </main>
            )}
          </div>
        </div>
      </div>
      <SurfaceHost />
    </>
  );
}

export default function App() {
  return (
    <WorkspaceProvider>
      <WorkspaceShell />
    </WorkspaceProvider>
  );
}
