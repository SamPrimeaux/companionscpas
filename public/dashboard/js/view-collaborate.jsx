// Collaborate shell — Calendar and Tasks panes are supplied by their owning lanes.
const COLLABORATE_SURFACES = [
  { key: "calendar", label: "Calendar", icon: "calendar" },
  { key: "tasks", label: "Tasks", icon: "check" },
  { key: "mail", label: "Mail", icon: "mail" },
];

function CollaboratePendingPane({ surface }) {
  const isCalendar = surface === "calendar";
  if (surface === "mail") {
    return React.createElement("section", { className: "collab-pending-main", role: "alert" },
      React.createElement("div", { className: "collab-pending-icon", "aria-hidden": "true" },
        React.createElement(Icon, { name: "mail", size: 24 })
      ),
      React.createElement("p", { className: "collab-pending-eyebrow" }, "Collaborate workspace"),
      React.createElement("h2", null, "Mail could not load"),
      React.createElement("p", null, "Reload the dashboard to restore the existing CPAS mailbox.")
    );
  }
  return React.createElement("div", { className: "collab-pending-layout" },
    React.createElement("aside", { className: "collab-pending-context", "aria-label": surface + " tools" },
      React.createElement("button", {
        type: "button",
        className: "collab-pending-create",
        disabled: true,
        title: surface === "calendar" ? "Calendar creation arrives with Swarm A" : "Task creation arrives with Swarm B",
      },
        React.createElement(Icon, { name: "plus", size: 16 }),
        isCalendar ? "Create event" : "Add a task"
      ),
      React.createElement("div", { className: "collab-pending-context-copy" },
        React.createElement("strong", null, isCalendar ? "Calendar tools" : "My Tasks"),
        React.createElement("span", null, isCalendar
          ? "Mini calendar and view controls mount here."
          : "Task lists and filters mount here.")
      )
    ),
    React.createElement("section", { className: "collab-pending-main", role: "status" },
      React.createElement("div", { className: "collab-pending-icon", "aria-hidden": "true" },
        React.createElement(Icon, { name: isCalendar ? "calendar" : "check", size: 24 })
      ),
      React.createElement("p", { className: "collab-pending-eyebrow" }, "Collaborate workspace"),
      React.createElement("h2", null, isCalendar ? "Calendar is coming online" : "Tasks are coming online"),
      React.createElement("p", null, isCalendar
        ? "The shell is ready for the live week, day, and month calendar pane."
        : "The shell is ready for the live tickets-backed task pane.")
    )
  );
}

function CollaborateView({ params = {}, onNavigate }) {
  const requested = params.seg || "calendar";
  const surface = COLLABORATE_SURFACES.some(function(item) { return item.key === requested; })
    ? requested
    : "calendar";
  const current = COLLABORATE_SURFACES.find(function(item) { return item.key === surface; });

  function go(nextSurface) {
    if (typeof onNavigate !== "function") return;
    onNavigate("collaborate", nextSurface === "calendar" ? {} : { seg: nextSurface });
  }

  function renderSurface() {
    if (surface === "mail") {
      return typeof EmailView === "function"
        ? React.createElement(EmailView, { embedded: true })
        : React.createElement(CollaboratePendingPane, { surface: "mail" });
    }
    const paneName = surface === "calendar" ? "CollaborateCalendarPane" : "CollaborateTasksPane";
    const Pane = window[paneName];
    if (typeof Pane === "function") {
      return React.createElement(Pane, {
        ticketId: surface === "tasks" ? params.ticket : undefined,
        onNavigate,
      });
    }
    return React.createElement(CollaboratePendingPane, { surface });
  }

  function tabs(className) {
    return React.createElement("nav", { className, "aria-label": "Collaborate sections" },
      COLLABORATE_SURFACES.map(function(item) {
        const active = item.key === surface;
        return React.createElement("button", {
          key: item.key,
          type: "button",
          className: active ? "is-active" : "",
          onClick: function() { go(item.key); },
          "aria-current": active ? "page" : undefined,
        },
          React.createElement(Icon, { name: item.icon, size: className.indexOf("mobile") >= 0 ? 18 : 15 }),
          React.createElement("span", null, item.label)
        );
      })
    );
  }

  return React.createElement("div", { className: "collab-work-shell", "data-surface": surface },
    React.createElement("header", { className: "collab-work-topbar" },
      React.createElement("div", { className: "collab-work-breadcrumb", "aria-label": "Breadcrumb" },
        React.createElement("span", null, "Collaborate"),
        React.createElement("span", { className: "collab-work-separator", "aria-hidden": "true" }, "/"),
        React.createElement("strong", null, current.label)
      ),
      tabs("collab-work-tabs"),
      React.createElement("span", { className: "collab-work-live" },
        React.createElement("span", { className: "collab-work-live-dot", "aria-hidden": "true" }),
        "Team workspace"
      )
    ),
    React.createElement("div", { className: "collab-work-body" }, renderSurface()),
    tabs("collab-work-mobile-tabs")
  );
}

Object.assign(window, {
  CollaborateView,
  CollaboratePendingPane,
  COLLABORATE_SURFACES,
});
