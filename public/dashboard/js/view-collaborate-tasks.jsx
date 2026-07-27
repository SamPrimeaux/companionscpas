function ticketApi(path, options = {}) {
  return fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Ticket request failed (${response.status})`);
    }
    return data;
  });
}

function ticketTags(ticket) {
  if (Array.isArray(ticket?.tags)) return ticket.tags;
  if (!ticket?.tags) return [];
  try {
    const parsed = JSON.parse(ticket.tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isTicketStarred(ticket) {
  return ticketTags(ticket).includes("starred");
}

function dueInputValue(unix) {
  if (!unix) return "";
  const date = new Date(Number(unix) * 1000);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dueFromInput(value) {
  if (!value) return null;
  const millis = new Date(value).getTime();
  return Number.isFinite(millis) ? Math.floor(millis / 1000) : null;
}

function formatTicketDate(unix, includeTime = true) {
  if (!unix) return null;
  const date = new Date(Number(unix) * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, includeTime
    ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric" }
  );
}

function displayProject(project) {
  if (!project) return "Companions CPAS";
  return String(project)
    .replace(/^proj_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function TicketCreateComposer({ projects, onCancel, onCreated }) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [project, setProject] = React.useState(projects[0] || "companionscpas");
  const [dueLocal, setDueLocal] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  async function submit(event) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const data = await ticketApi("/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          project: project || null,
          due_at: dueFromInput(dueLocal),
          status: "backlog",
          priority: "medium",
          tags: ["collaborate-task"],
        }),
      });
      await onCreated(data.ticket);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="collab-task-compose" onSubmit={submit}>
      <div className="collab-task-compose-leading" aria-hidden="true" />
      <div className="collab-task-compose-fields">
        <input
          autoFocus
          className="collab-task-compose-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Task title"
          aria-label="Task title"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add documentation or acceptance notes"
          rows="2"
          aria-label="Task documentation"
        />
        <div className="collab-task-compose-meta">
          <label>
            <span>Project</span>
            <input
              list="collab-task-projects"
              value={project}
              onChange={(event) => setProject(event.target.value)}
            />
          </label>
          <label>
            <span>Due</span>
            <input
              type="datetime-local"
              value={dueLocal}
              onChange={(event) => setDueLocal(event.target.value)}
            />
          </label>
          <div className="collab-task-compose-actions">
            <button type="button" className="collab-task-btn ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="collab-task-btn primary" disabled={saving || !title.trim()}>
              {saving ? "Creating…" : "Create task"}
            </button>
          </div>
        </div>
        {error ? <div className="collab-task-inline-error" role="alert">{error}</div> : null}
      </div>
    </form>
  );
}

function TicketRow({ ticket, busy, onOpen, onComplete, onToggleStar }) {
  const due = formatTicketDate(ticket.due_at, false);
  const starred = isTicketStarred(ticket);
  return (
    <article className="collab-task-row" data-ticket-id={ticket.id}>
      <button
        type="button"
        className="collab-task-check"
        aria-label={`Mark ${ticket.title} complete`}
        onClick={() => onComplete(ticket)}
        disabled={busy}
      >
        <span />
      </button>
      <button type="button" className="collab-task-row-body" onClick={() => onOpen(ticket.id)}>
        <strong>{ticket.title}</strong>
        <span className="collab-task-row-description">
          {ticket.description || "Open to add documentation, context, and acceptance notes."}
        </span>
        <span className="collab-task-row-meta">
          <span className="collab-task-project-pill">{displayProject(ticket.project)}</span>
          <span className={due ? "collab-task-due has-date" : "collab-task-due"}>
            {due || "Add date/time"}
          </span>
          <span className={`collab-task-priority priority-${String(ticket.priority || "medium").toLowerCase()}`}>
            {ticket.priority || "medium"}
          </span>
        </span>
      </button>
      <button
        type="button"
        className={starred ? "collab-task-star is-starred" : "collab-task-star"}
        aria-label={starred ? `Unstar ${ticket.title}` : `Star ${ticket.title}`}
        onClick={() => onToggleStar(ticket)}
        disabled={busy}
      >
        <Icon name="star" size={17} />
      </button>
    </article>
  );
}

function TasksSidebar({
  tickets,
  activeFilter,
  projectFilter,
  onFilter,
  onProject,
  onCreate,
}) {
  const openTickets = tickets.filter((ticket) => !["shipped", "abandoned"].includes(ticket.status));
  const starredCount = openTickets.filter(isTicketStarred).length;
  const projectCounts = openTickets.reduce((map, ticket) => {
    const key = ticket.project || "";
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());
  const projects = [...projectCounts.entries()].sort((a, b) => {
    if (!a[0]) return 1;
    if (!b[0]) return -1;
    return displayProject(a[0]).localeCompare(displayProject(b[0]));
  });

  return (
    <aside className="collab-tasks-sidebar" aria-label="Task lists">
      <button type="button" className="collab-tasks-create" onClick={onCreate}>
        <Icon name="plus" size={17} />
        <span>Create</span>
      </button>
      <nav className="collab-tasks-nav">
        <button
          type="button"
          className={activeFilter === "my" && projectFilter === null ? "is-active" : ""}
          onClick={() => onFilter("my")}
        >
          <Icon name="check" size={16} />
          <span>My Tasks</span>
          <small>{openTickets.length}</small>
        </button>
        <button
          type="button"
          className={activeFilter === "starred" ? "is-active" : ""}
          onClick={() => onFilter("starred")}
        >
          <Icon name="star" size={16} />
          <span>Starred</span>
          {starredCount ? <small>{starredCount}</small> : null}
        </button>
        <div className="collab-tasks-nav-heading">
          <Icon name="chevD" size={13} />
          <Icon name="folder" size={15} />
          <span>Project work</span>
        </div>
        {projects.map(([project, count]) => (
          <button
            type="button"
            key={project || "unassigned"}
            className={projectFilter === project ? "is-active is-project" : "is-project"}
            onClick={() => onProject(project)}
          >
            <Icon name="folder" size={14} />
            <span>{project ? displayProject(project) : "Unassigned"}</span>
            <small>{count}</small>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function TicketFocus({
  ticket,
  events,
  projects,
  busy,
  error,
  onClose,
  onSave,
  onComplete,
  onDelete,
  onToggleStar,
}) {
  const [title, setTitle] = React.useState(ticket.title || "");
  const [description, setDescription] = React.useState(ticket.description || "");
  const [status, setStatus] = React.useState(ticket.status || "backlog");
  const [priority, setPriority] = React.useState(ticket.priority || "medium");
  const [project, setProject] = React.useState(ticket.project || "");
  const [dueLocal, setDueLocal] = React.useState(dueInputValue(ticket.due_at));
  const dueRef = React.useRef(null);

  React.useEffect(() => {
    setTitle(ticket.title || "");
    setDescription(ticket.description || "");
    setStatus(ticket.status || "backlog");
    setPriority(ticket.priority || "medium");
    setProject(ticket.project || "");
    setDueLocal(dueInputValue(ticket.due_at));
  }, [ticket.id, ticket.updated_at]);

  async function save() {
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      project: project || null,
      due_at: dueFromInput(dueLocal),
      status,
    });
  }

  function schedule() {
    dueRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    dueRef.current?.focus();
  }

  const starred = isTicketStarred(ticket);
  return (
    <section className="collab-task-focus" aria-labelledby="collab-task-focus-title">
      <header className="collab-task-focus-topbar">
        <button type="button" className="collab-task-icon-btn" onClick={onClose} aria-label="Close task">
          <Icon name="close" size={20} />
        </button>
        <div className="collab-task-focus-top-actions">
          <button
            type="button"
            className={starred ? "collab-task-star is-starred" : "collab-task-star"}
            onClick={() => onToggleStar(ticket)}
            aria-label={starred ? "Unstar task" : "Star task"}
            disabled={busy}
          >
            <Icon name="star" size={19} />
          </button>
          <button type="button" className="collab-task-btn primary" onClick={save} disabled={busy || !title.trim()}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </header>
      <div className="collab-task-focus-scroll">
        <div className="collab-task-focus-inner">
          {error ? <div className="collab-task-error" role="alert">{error}</div> : null}
          <input
            id="collab-task-focus-title"
            className="collab-task-focus-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Task title"
          />
          <div className="collab-task-focus-pills">
            <label className={`status-${status}`}>
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="backlog">Backlog</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
                <option value="in_review">In review</option>
                <option value="shipped">Shipped</option>
                <option value="abandoned">Abandoned</option>
              </select>
            </label>
            <label>
              <span>Priority</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option value="P0">P0</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <span className="collab-task-focus-project-pill">
              <Icon name="folder" size={14} />
              {displayProject(project)}
            </span>
          </div>

          <section className="collab-task-focus-section">
            <label htmlFor="collab-task-documentation">Documentation</label>
            <p>Full context, acceptance criteria, links, client notes, and implementation details.</p>
            <textarea
              id="collab-task-documentation"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows="12"
              placeholder="Describe what done looks like, paste URLs, and capture client feedback."
            />
          </section>

          <section className="collab-task-focus-fields">
            <label>
              <span>Due date & time</span>
              <input
                ref={dueRef}
                type="datetime-local"
                value={dueLocal}
                onChange={(event) => setDueLocal(event.target.value)}
              />
            </label>
            <label>
              <span>Project</span>
              <input
                list="collab-task-projects"
                value={project}
                onChange={(event) => setProject(event.target.value)}
                placeholder="No project"
              />
            </label>
          </section>

          <section className="collab-task-focus-audit">
            <div><span>Created</span><strong>{formatTicketDate(ticket.created_at) || "Unknown"}</strong></div>
            <div><span>Updated</span><strong>{formatTicketDate(ticket.updated_at) || "Unknown"}</strong></div>
            <div><span>Requested by</span><strong>{ticket.requested_by || "Team workspace"}</strong></div>
          </section>

          <section className="collab-task-activity">
            <div className="collab-task-focus-section-heading">
              <span>Activity</span>
              <small>{events.length}</small>
            </div>
            {events.length ? events.map((event) => (
              <div className="collab-task-event" key={event.id}>
                <span className="collab-task-event-dot" />
                <div>
                  <strong>{String(event.event_type || "event").replace(/_/g, " ")}</strong>
                  {event.detail ? <p>{event.detail}</p> : null}
                  <small>{formatTicketDate(event.created_at)}</small>
                </div>
              </div>
            )) : <p className="collab-task-activity-empty">No activity has been recorded yet.</p>}
          </section>
        </div>
      </div>
      <footer className="collab-task-focus-footer">
        <button type="button" className="collab-task-btn outline" onClick={schedule} disabled={busy}>
          <Icon name="calendar" size={16} />
          Schedule on calendar
        </button>
        <button type="button" className="collab-task-btn outline" onClick={() => onComplete(ticket)} disabled={busy}>
          <Icon name="check" size={16} />
          Mark complete
        </button>
        <button type="button" className="collab-task-btn danger" onClick={() => onDelete(ticket)} disabled={busy}>
          <Icon name="trash" size={16} />
          Delete
        </button>
      </footer>
      <datalist id="collab-task-projects">
        {projects.map((item) => <option value={item} key={item}>{displayProject(item)}</option>)}
      </datalist>
    </section>
  );
}

function CollaborateTasksPane({ ticketId, onNavigate }) {
  const [tickets, setTickets] = React.useState([]);
  const [selectedTicket, setSelectedTicket] = React.useState(null);
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState(null);
  const [error, setError] = React.useState("");
  const [filter, setFilter] = React.useState("my");
  const [projectFilter, setProjectFilter] = React.useState(null);
  const [creating, setCreating] = React.useState(false);

  const loadTickets = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await ticketApi("/api/tickets?workable=1&limit=250");
      setTickets(data.tickets || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = React.useCallback(async (id) => {
    if (!id) {
      setSelectedTicket(null);
      setEvents([]);
      return;
    }
    setDetailLoading(true);
    setError("");
    try {
      const data = await ticketApi(`/api/tickets/${encodeURIComponent(id)}`);
      setSelectedTicket(data.ticket);
      setEvents(data.events || []);
    } catch (requestError) {
      setSelectedTicket(null);
      setEvents([]);
      setError(requestError.message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  React.useEffect(() => {
    loadDetail(ticketId);
  }, [ticketId, loadDetail]);

  const projects = React.useMemo(() => [...new Set(
    tickets.map((ticket) => ticket.project).filter(Boolean)
  )].sort(), [tickets]);

  const visibleTickets = React.useMemo(() => {
    if (filter === "starred") return tickets.filter(isTicketStarred);
    if (projectFilter !== null) {
      return tickets.filter((ticket) => (ticket.project || "") === projectFilter);
    }
    return tickets;
  }, [tickets, filter, projectFilter]);

  function openTicket(id) {
    onNavigate("collaborate", { seg: "tasks", ticket: id });
  }

  function closeTicket() {
    onNavigate("collaborate", { seg: "tasks" });
  }

  async function toggleStar(ticket) {
    const starred = isTicketStarred(ticket);
    const tags = ticketTags(ticket).filter((tag) => tag !== "starred");
    if (!starred) tags.push("starred");
    setBusyId(ticket.id);
    setError("");
    try {
      const data = await ticketApi(`/api/tickets/${encodeURIComponent(ticket.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ tags }),
      });
      setTickets((current) => current.map((item) => item.id === ticket.id ? data.ticket : item));
      if (selectedTicket?.id === ticket.id) setSelectedTicket(data.ticket);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId(null);
    }
  }

  async function completeTicket(ticket) {
    setBusyId(ticket.id);
    setError("");
    try {
      const data = await ticketApi(`/api/tickets/${encodeURIComponent(ticket.id)}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: "shipped",
          status_reason: "Completed from Collaborate Tasks",
        }),
      });
      setTickets((current) => current.filter((item) => item.id !== ticket.id));
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket(data.ticket);
        await loadDetail(ticket.id);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId(null);
    }
  }

  async function saveTicket(payload) {
    if (!selectedTicket) return;
    setBusyId(selectedTicket.id);
    setError("");
    try {
      const statusChanged = payload.status !== selectedTicket.status;
      const updatePayload = { ...payload };
      delete updatePayload.status;
      let data = await ticketApi(`/api/tickets/${encodeURIComponent(selectedTicket.id)}`, {
        method: "PATCH",
        body: JSON.stringify(updatePayload),
      });
      if (statusChanged) {
        data = await ticketApi(`/api/tickets/${encodeURIComponent(selectedTicket.id)}/status`, {
          method: "POST",
          body: JSON.stringify({ status: payload.status, status_reason: "Updated from task focus" }),
        });
      }
      setSelectedTicket(data.ticket);
      setTickets((current) => current.map((item) => item.id === data.ticket.id ? data.ticket : item));
      await loadDetail(data.ticket.id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTicket(ticket) {
    if (!window.confirm(`Delete "${ticket.title}" and its activity history?`)) return;
    setBusyId(ticket.id);
    setError("");
    try {
      await ticketApi(`/api/tickets/${encodeURIComponent(ticket.id)}`, { method: "DELETE" });
      setTickets((current) => current.filter((item) => item.id !== ticket.id));
      closeTicket();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId(null);
    }
  }

  async function created(ticket) {
    setCreating(false);
    setTickets((current) => [ticket, ...current]);
    openTicket(ticket.id);
  }

  function selectFilter(next) {
    setFilter(next);
    setProjectFilter(null);
    if (ticketId) closeTicket();
  }

  function selectProject(project) {
    setFilter("my");
    setProjectFilter(project);
    if (ticketId) closeTicket();
  }

  return (
    <div className="collab-tasks-layout">
      <TasksSidebar
        tickets={tickets}
        activeFilter={filter}
        projectFilter={projectFilter}
        onFilter={selectFilter}
        onProject={selectProject}
        onCreate={() => { setCreating(true); if (ticketId) closeTicket(); }}
      />
      <main className="collab-tasks-main">
        {ticketId ? (
          detailLoading && !selectedTicket ? (
            <div className="collab-tasks-loading" role="status">Loading live ticket…</div>
          ) : selectedTicket ? (
            <TicketFocus
              ticket={selectedTicket}
              events={events}
              projects={projects}
              busy={busyId === selectedTicket.id}
              error={error}
              onClose={closeTicket}
              onSave={saveTicket}
              onComplete={completeTicket}
              onDelete={deleteTicket}
              onToggleStar={toggleStar}
            />
          ) : (
            <div className="collab-tasks-error-state" role="alert">
              <Icon name="warning" size={22} />
              <strong>Ticket could not load</strong>
              <span>{error || "The requested ticket was not found."}</span>
              <button type="button" className="collab-task-btn outline" onClick={closeTicket}>Back to My Tasks</button>
            </div>
          )
        ) : (
          <section className="collab-task-list-stage">
            <header className="collab-task-list-header">
              <div>
                <h2>{filter === "starred" ? "Starred" : projectFilter !== null ? displayProject(projectFilter) : "My Tasks"}</h2>
                <span className="collab-task-list-project-label"><Icon name="folder" size={14} /> Project</span>
                <p>Connect tasks to a real project to track today’s work in context.</p>
              </div>
              <button type="button" className="collab-task-refresh" onClick={loadTickets} disabled={loading} aria-label="Refresh live tickets">
                <Icon name="refresh" size={17} />
              </button>
            </header>
            <button type="button" className="collab-task-add-row" onClick={() => setCreating(true)}>
              <Icon name="plus" size={17} />
              <span>Add a task</span>
            </button>
            {creating ? (
              <TicketCreateComposer projects={projects} onCancel={() => setCreating(false)} onCreated={created} />
            ) : null}
            {error ? <div className="collab-task-error" role="alert">{error}</div> : null}
            <div className="collab-task-rows" aria-live="polite">
              {loading ? (
                <div className="collab-tasks-loading" role="status">Loading live CPAS tickets…</div>
              ) : visibleTickets.length ? visibleTickets.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  busy={busyId === ticket.id}
                  onOpen={openTicket}
                  onComplete={completeTicket}
                  onToggleStar={toggleStar}
                />
              )) : (
                <div className="collab-task-empty">
                  <Icon name={filter === "starred" ? "star" : "check"} size={22} />
                  <strong>{filter === "starred" ? "No starred tasks" : "No open tasks in this list"}</strong>
                  <button type="button" className="collab-task-btn outline" onClick={() => setCreating(true)}>Create a task</button>
                </div>
              )}
            </div>
            <datalist id="collab-task-projects">
              {projects.map((item) => <option value={item} key={item}>{displayProject(item)}</option>)}
            </datalist>
          </section>
        )}
      </main>
    </div>
  );
}

window.CollaborateTasksPane = CollaborateTasksPane;
