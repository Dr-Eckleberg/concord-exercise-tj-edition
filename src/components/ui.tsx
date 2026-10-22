import {
  type ButtonHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
} from "react";
import {
  ADVISORS,
  type AdvisorScope,
  initials,
  REVIEW_LABELS,
  type ReviewCode,
} from "../data/workspace";

const ICON_PATHS = {
  work: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  cases: "M4 5h16 M4 12h16 M4 19h16",
  compliance: "M12 3v9h9 M20.5 15a9 9 0 1 1-11-11.5",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  close: "M6 6l12 12 M6 18 18 6",
  plus: "M12 5v14 M5 12h14",
  left: "M19 12H5 M11 6l-6 6 6 6",
  right: "M5 12h14 M13 6l6 6-6 6",
  chevron: "m6 9 6 6 6-6",
  check: "m5 12 4 4L19 6",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  document: "M14 2H5v20h14V7z M14 2v6h5 M8 12h8 M8 16h8",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 3a4 4 0 1 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  building:
    "M4 21V3h16v18 M2 21h20 M8 7h1 M15 7h1 M8 11h1 M15 11h1 M10 21v-5h4v5",
  calendar: "M3 5h18v16H3z M7 2v6 M17 2v6 M3 10h18",
  filter: "M3 4h18l-7 8v7l-4 2v-9z",
  info: "M12 11v6 M12 7h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
} as const;
export type IconName = keyof typeof ICON_PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
      width={size}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

export function Button({
  children,
  className = "",
  primary = false,
  small = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  primary?: boolean;
  small?: boolean;
}) {
  return (
    <button
      className={`btn ${primary ? "primary" : ""} ${small ? "small" : ""} ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`text-link ${className}`} type="button" {...props}>
      {children}
    </button>
  );
}

export function Select({
  label,
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return (
    <label className={`select-control ${className}`} htmlFor={id}>
      <span className="sr-only">{label}</span>
      <select id={id} {...props}>
        {children}
      </select>
      <Icon name="chevron" size={13} />
    </label>
  );
}

export function Avatar({
  name,
  large = false,
  tint = "",
}: {
  name: string;
  large?: boolean;
  tint?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`avatar ${large ? "large" : ""} ${tint}`}
    >
      {initials(name)}
    </span>
  );
}

export function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: "gray" | "green" | "amber" | "blue" | "red";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function ReviewBadge({ code }: { code: ReviewCode }) {
  return (
    <Badge
      tone={
        code === "P"
          ? "green"
          : code === "Q"
            ? "blue"
            : code === "U" || code === "C"
              ? "amber"
              : "gray"
      }
    >
      {REVIEW_LABELS[code]}
    </Badge>
  );
}

export function AdvisorFilter({
  value,
  onChange,
  prefix = false,
}: {
  value: AdvisorScope;
  onChange: (value: AdvisorScope) => void;
  prefix?: boolean;
}) {
  return (
    <Select
      label="Advisor"
      onChange={(event) => onChange(event.target.value as AdvisorScope)}
      value={value}
    >
      <option value="all">{prefix ? "Advisor: All" : "All advisors"}</option>
      <option value="AS">
        {prefix ? "Advisor: A. Singh" : "Assigned to me"}
      </option>
      <option value="JP">{ADVISORS.JP}</option>
      <option value="ML">{ADVISORS.ML}</option>
      <option value="">Unassigned</option>
    </Select>
  );
}

export function Count({ children }: { children: ReactNode }) {
  return <span className="count">{children}</span>;
}

export function Empty({
  title,
  children,
  onClear,
}: {
  title: string;
  children?: ReactNode;
  onClear?: () => void;
}) {
  return (
    <div className="empty-state">
      <Icon name="search" size={24} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {onClear && <LinkButton onClick={onClear}>Clear filters</LinkButton>}
    </div>
  );
}

export function Tabs<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      aria-label={label}
      className="tabs"
      onKeyDown={(event) => {
        const index = items.findIndex((item) => item.value === value);
        let next = index;
        if (event.key === "ArrowRight") {
          next = (index + 1) % items.length;
        } else if (event.key === "ArrowLeft") {
          next = (index - 1 + items.length) % items.length;
        } else if (event.key === "Home") {
          next = 0;
        } else if (event.key === "End") {
          next = items.length - 1;
        } else {
          return;
        }
        event.preventDefault();
        onChange(items[next].value);
        event.currentTarget
          .querySelectorAll<HTMLButtonElement>('[role="tab"]')
          [next]?.focus();
      }}
      role="tablist"
    >
      {items.map((item) => (
        <button
          aria-selected={item.value === value}
          className={`tab ${item.value === value ? "active" : ""}`}
          key={item.value}
          onClick={() => onChange(item.value)}
          role="tab"
          tabIndex={item.value === value ? 0 : -1}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

const FOCUSABLE =
  'button:not([disabled]):not([tabindex="-1"]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

export function Overlay({
  title,
  children,
  onClose,
  drawer = false,
  wide = false,
  active = true,
  index = 0,
  dismissOutside = true,
  returnFocus,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  drawer?: boolean;
  wide?: boolean;
  active?: boolean;
  index?: number;
  dismissOutside?: boolean;
  returnFocus?: HTMLElement | null;
}) {
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<Element | null>(null);
  useLayoutEffect(() => {
    opener.current = returnFocus ?? document.activeElement;
    return () => {
      const target = opener.current;
      queueMicrotask(() => {
        if (panel.current?.isConnected) {
          return;
        }
        if (
          target instanceof HTMLElement &&
          target !== document.body &&
          target.isConnected &&
          !target.closest("[inert]")
        ) {
          target.focus();
        } else {
          const fallback =
            document.querySelector<HTMLElement>(
              '[role="dialog"][aria-modal="true"]'
            ) ?? document.getElementById("workspace-content");
          fallback?.focus();
        }
      });
    };
  }, [returnFocus]);
  useEffect(() => {
    if (!active) {
      return;
    }
    const element = panel.current;
    if (!element) {
      return;
    }
    if (!element.contains(document.activeElement)) {
      const target =
        element.querySelector<HTMLElement>("[data-autofocus]") ??
        element.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? element).focus();
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
      if (event.key !== "Tab") {
        return;
      }
      const elements = [
        ...element.querySelectorAll<HTMLElement>(FOCUSABLE),
      ].filter((item) => item.getClientRects().length > 0);
      const first = elements[0];
      const last = elements.at(-1);
      if (!(first && last)) {
        event.preventDefault();
        element.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first ||
          !element.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !element.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown, true);
    return () => document.removeEventListener("keydown", keydown, true);
  }, [active, onClose]);
  return (
    <div
      className={`overlay ${drawer ? "drawer-overlay" : ""} ${active ? "" : "inactive-overlay"}`}
      inert={!active}
      style={{ zIndex: 100 + index * 2 }}
    >
      <button
        aria-label="Dismiss panel"
        className="backdrop"
        disabled={!(dismissOutside && active)}
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <section
        aria-labelledby={titleId}
        aria-modal={active}
        className={`dialog ${drawer ? "drawer" : ""} ${wide ? "wide-dialog" : ""}`}
        ref={panel}
        role="dialog"
        tabIndex={-1}
      >
        <header className="dialog-heading">
          <h2 id={titleId}>{title}</h2>
          <button
            aria-label={`Close ${title}`}
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="dialog-content">{children}</div>
      </section>
    </div>
  );
}
