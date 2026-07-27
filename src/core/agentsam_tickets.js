const TICKET_STATUSES = new Set([
  "backlog",
  "active",
  "blocked",
  "in_review",
  "shipped",
  "abandoned",
]);

const PRIORITIES = new Map([
  ["p0", "P0"],
  ["p1", "P1"],
  ["p2", "P2"],
  ["p3", "P3"],
  ["high", "high"],
  ["medium", "medium"],
  ["low", "low"],
]);

export class TicketError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "TicketError";
    this.status = status;
  }
}

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

function ticketId() {
  return `tkt_${crypto.randomUUID()}`;
}

function eventId() {
  return `tktevt_${crypto.randomUUID()}`;
}

function cleanOptional(value, max = 10000) {
  if (value === null || value === undefined) return null;
  const next = String(value).trim();
  return next ? next.slice(0, max) : null;
}

function normalizeStatus(value, fallback = "backlog") {
  const next = String(value || fallback).trim().toLowerCase();
  if (!TICKET_STATUSES.has(next)) {
    throw new TicketError(`Invalid status: ${value}`);
  }
  return next;
}

function normalizePriority(value, fallback = "medium") {
  const raw = String(value || fallback).trim().toLowerCase();
  const next = PRIORITIES.get(raw);
  if (!next) throw new TicketError(`Invalid priority: ${value}`);
  return next;
}

function normalizeDueAt(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new TicketError("due_at must be a unix timestamp");
  }
  return Math.floor(number);
}

export function parseTicketTags(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 50);
  }
  if (!value) return [];
  try {
    return parseTicketTags(JSON.parse(String(value)));
  } catch {
    return String(value)
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 50);
  }
}

function encodeTags(value) {
  return JSON.stringify(parseTicketTags(value));
}

export function parseTicketAttachments(value) {
  let list = [];
  if (Array.isArray(value)) {
    list = value;
  } else if (value) {
    try {
      const parsed = JSON.parse(String(value));
      list = Array.isArray(parsed) ? parsed : [];
    } catch {
      list = [];
    }
  }
  const out = [];
  const seen = new Set();
  for (const item of list.slice(0, 40)) {
    if (!item || typeof item !== "object") continue;
    const url = String(item.url || item.pub_url || "").trim();
    if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    out.push({
      id: String(item.id || item.asset_key || `att_${out.length + 1}`).slice(0, 120),
      url,
      asset_key: item.asset_key ? String(item.asset_key).slice(0, 240) : null,
      name: item.name ? String(item.name).slice(0, 240) : (url.split("/").pop() || "attachment"),
      mime: item.mime || item.mime_type || null,
      source: item.source === "upload" || item.source === "library" || item.source === "url"
        ? item.source
        : (item.asset_key ? "library" : "url"),
      linked_at: Number(item.linked_at) || null,
    });
  }
  return out;
}

function encodeAttachments(value) {
  return JSON.stringify(parseTicketAttachments(value));
}

function normalizeTicketRow(row) {
  if (!row) return null;
  return {
    ...row,
    tags: parseTicketTags(row.tags),
    attachments: parseTicketAttachments(row.attachments_json),
    due_at: row.due_at === null || row.due_at === undefined ? null : Number(row.due_at),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
    closed_at: row.closed_at === null || row.closed_at === undefined ? null : Number(row.closed_at),
  };
}

function eventStatement(env, {
  ticketId: id,
  eventType,
  fromStatus = null,
  toStatus = null,
  detail = null,
  actorId = null,
  now = unixNow(),
}) {
  return env.DB.prepare(`
    INSERT INTO agentsam_ticket_events (
      id, ticket_id, event_type, from_status, to_status, detail,
      commit_sha, actor_type, actor_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'user', ?, ?)
  `).bind(
    eventId(),
    id,
    cleanOptional(eventType, 80),
    cleanOptional(fromStatus, 40),
    cleanOptional(toStatus, 40),
    cleanOptional(detail, 10000),
    cleanOptional(actorId, 200),
    now,
  );
}

export async function listTickets(env, filters = {}) {
  const clauses = [];
  const params = [];
  if (filters.status) {
    const statuses = String(filters.status)
      .split(",")
      .map((value) => normalizeStatus(value))
      .slice(0, 6);
    if (statuses.length) {
      clauses.push(`status IN (${statuses.map(() => "?").join(", ")})`);
      params.push(...statuses);
    }
  } else if (String(filters.workable || "") === "1") {
    clauses.push("status IN ('backlog', 'active', 'blocked', 'in_review')");
  }
  if (filters.project) {
    clauses.push("project = ?");
    params.push(String(filters.project));
  }
  if (filters.search) {
    clauses.push("(title LIKE ? OR description LIKE ? OR project LIKE ?)");
    const term = `%${String(filters.search).slice(0, 120)}%`;
    params.push(term, term, term);
  }
  const requestedLimit = Number(filters.limit || 200);
  const limit = Math.min(250, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 200));
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { results = [] } = await env.DB.prepare(`
    SELECT * FROM agentsam_tickets
    ${where}
    ORDER BY
      CASE status
        WHEN 'active' THEN 0
        WHEN 'in_review' THEN 1
        WHEN 'blocked' THEN 2
        WHEN 'backlog' THEN 3
        ELSE 4
      END,
      CASE priority
        WHEN 'P0' THEN 0 WHEN 'high' THEN 1 WHEN 'P1' THEN 1
        WHEN 'P2' THEN 2 WHEN 'medium' THEN 2
        WHEN 'P3' THEN 3 WHEN 'low' THEN 3
        ELSE 4
      END,
      updated_at DESC
    LIMIT ?
  `).bind(...params, limit).all();
  return results.map(normalizeTicketRow);
}

export async function getTicket(env, id) {
  const row = await env.DB.prepare(
    "SELECT * FROM agentsam_tickets WHERE id = ? LIMIT 1"
  ).bind(id).first();
  return normalizeTicketRow(row);
}

export async function createTicket(env, input, actorId) {
  const title = cleanOptional(input.title, 500);
  if (!title) throw new TicketError("title is required");
  const status = normalizeStatus(input.status, "backlog");
  const priority = normalizePriority(input.priority, "medium");
  const id = ticketId();
  const now = unixNow();
  const dueAt = normalizeDueAt(input.due_at);
  const tags = encodeTags(input.tags);
  const attachments = encodeAttachments(input.attachments ?? input.attachments_json ?? []);
  const insert = env.DB.prepare(`
    INSERT INTO agentsam_tickets (
      id, title, description, status, status_reason, project, subsystem,
      tags, priority, requested_by, doc_path, due_at, attachments_json, created_at, updated_at, closed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    title,
    cleanOptional(input.description),
    status,
    cleanOptional(input.status_reason, 1000),
    cleanOptional(input.project, 240),
    cleanOptional(input.subsystem, 240),
    tags,
    priority,
    cleanOptional(input.requested_by, 240) || cleanOptional(actorId, 240),
    cleanOptional(input.doc_path, 1000),
    dueAt,
    attachments,
    now,
    now,
    status === "shipped" || status === "abandoned" ? now : null,
  );
  await env.DB.batch([
    insert,
    eventStatement(env, {
      ticketId: id,
      eventType: "created",
      toStatus: status,
      detail: "Ticket created from Collaborate Tasks",
      actorId,
      now,
    }),
  ]);
  return getTicket(env, id);
}

const PATCH_FIELDS = {
  title: { column: "title", normalize: (value) => {
    const next = cleanOptional(value, 500);
    if (!next) throw new TicketError("title is required");
    return next;
  } },
  description: { column: "description", normalize: (value) => cleanOptional(value) },
  project: { column: "project", normalize: (value) => cleanOptional(value, 240) },
  subsystem: { column: "subsystem", normalize: (value) => cleanOptional(value, 240) },
  tags: { column: "tags", normalize: encodeTags },
  attachments: { column: "attachments_json", normalize: encodeAttachments },
  attachments_json: { column: "attachments_json", normalize: encodeAttachments },
  priority: { column: "priority", normalize: normalizePriority },
  requested_by: { column: "requested_by", normalize: (value) => cleanOptional(value, 240) },
  doc_path: { column: "doc_path", normalize: (value) => cleanOptional(value, 1000) },
  due_at: { column: "due_at", normalize: normalizeDueAt },
};

export async function patchTicket(env, id, input, actorId) {
  const existing = await getTicket(env, id);
  if (!existing) throw new TicketError("Ticket not found", 404);
  const sets = [];
  const params = [];
  const changed = [];
  for (const [field, config] of Object.entries(PATCH_FIELDS)) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) continue;
    const value = config.normalize(input[field]);
    const previous = field === "tags"
      ? JSON.stringify(existing.tags)
      : field === "attachments" || field === "attachments_json"
        ? JSON.stringify(existing.attachments || [])
        : existing[field];
    if (String(previous ?? "") === String(value ?? "")) continue;
    sets.push(`${config.column} = ?`);
    params.push(value);
    changed.push(field);
  }
  if (!sets.length) return existing;
  const now = unixNow();
  sets.push("updated_at = ?");
  params.push(now, id);
  await env.DB.batch([
    env.DB.prepare(`UPDATE agentsam_tickets SET ${sets.join(", ")} WHERE id = ?`).bind(...params),
    eventStatement(env, {
      ticketId: id,
      eventType: "updated",
      detail: `Updated fields: ${changed.join(", ")}`,
      actorId,
      now,
    }),
  ]);
  return getTicket(env, id);
}

export async function setTicketStatus(env, id, input, actorId) {
  const existing = await getTicket(env, id);
  if (!existing) throw new TicketError("Ticket not found", 404);
  const status = normalizeStatus(input.status);
  const reason = cleanOptional(input.status_reason, 1000);
  const now = unixNow();
  const closedAt = status === "shipped" || status === "abandoned" ? now : null;
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE agentsam_tickets
      SET status = ?, status_reason = ?, closed_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(status, reason, closedAt, now, id),
    eventStatement(env, {
      ticketId: id,
      eventType: "status_changed",
      fromStatus: existing.status,
      toStatus: status,
      detail: reason || `Status changed to ${status}`,
      actorId,
      now,
    }),
  ]);
  return getTicket(env, id);
}

export async function deleteTicket(env, id, actorId) {
  const existing = await getTicket(env, id);
  if (!existing) throw new TicketError("Ticket not found", 404);
  const events = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM agentsam_ticket_events WHERE ticket_id = ?"
  ).bind(id).first();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM agentsam_ticket_events WHERE ticket_id = ?").bind(id),
    env.DB.prepare("DELETE FROM agentsam_tickets WHERE id = ?").bind(id),
  ]);
  return {
    id,
    deleted: true,
    deleted_event_count: Number(events?.count || 0),
    actor_id: actorId || null,
  };
}

export async function listTicketEvents(env, id) {
  const ticket = await getTicket(env, id);
  if (!ticket) throw new TicketError("Ticket not found", 404);
  const { results = [] } = await env.DB.prepare(`
    SELECT * FROM agentsam_ticket_events
    WHERE ticket_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT 250
  `).bind(id).all();
  return results.map((event) => ({ ...event, created_at: Number(event.created_at) }));
}

export async function addTicketEvent(env, id, input, actorId) {
  const ticket = await getTicket(env, id);
  if (!ticket) throw new TicketError("Ticket not found", 404);
  const eventType = cleanOptional(input.event_type, 80);
  if (!eventType) throw new TicketError("event_type is required");
  const now = unixNow();
  await eventStatement(env, {
    ticketId: id,
    eventType,
    detail: input.detail,
    actorId,
    now,
  }).run();
  const events = await listTicketEvents(env, id);
  return events.find((event) => event.created_at === now && event.event_type === eventType) || events[0];
}

export async function ticketAnalytics(env) {
  const [statusRows, projectRows] = await Promise.all([
    env.DB.prepare(`
      SELECT status, COUNT(*) AS count
      FROM agentsam_tickets
      GROUP BY status
      ORDER BY count DESC
    `).all(),
    env.DB.prepare(`
      SELECT COALESCE(NULLIF(project, ''), 'Unassigned') AS project, COUNT(*) AS count
      FROM agentsam_tickets
      WHERE status IN ('backlog', 'active', 'blocked', 'in_review')
      GROUP BY COALESCE(NULLIF(project, ''), 'Unassigned')
      ORDER BY count DESC, project ASC
    `).all(),
  ]);
  return {
    by_status: statusRows.results || [],
    by_project: projectRows.results || [],
  };
}

export { normalizePriority, normalizeStatus };
