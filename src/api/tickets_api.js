import { getAuthUser } from "./session_api.js";
import { sendResendEmail } from "./email_api.js";
import {
  TicketError,
  addTicketEvent,
  createTicket,
  deleteTicket,
  getTicket,
  listTicketEvents,
  listTickets,
  patchTicket,
  parseTicketAttachments,
  setTicketStatus,
  ticketAnalytics,
} from "../core/agentsam_tickets.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function requestBody(request) {
  try {
    return await request.json();
  } catch {
    throw new TicketError("Invalid JSON body");
  }
}

function actorId(session) {
  return session?.user_id || session?.email || null;
}

function ticketRoute(pathname) {
  const match = pathname.match(/^\/api\/tickets\/([^/]+)(?:\/(status|events|share))?$/);
  if (!match) return null;
  return { id: decodeURIComponent(match[1]), action: match[2] || null };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function taskShareHtml(ticket, {
  message,
  actor,
  deepLink,
}) {
  const attachments = parseTicketAttachments(ticket.attachments || ticket.attachments_json || []);
  const docs = String(ticket.description || "").trim();
  const note = String(message || "").trim();
  const images = attachments
    .filter((item) => !item.mime || String(item.mime).startsWith("image/"))
    .slice(0, 12)
    .map((item) => `
      <a href="${escapeHtml(item.url)}" style="display:inline-block;margin:0 8px 8px 0;text-decoration:none;">
        <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.name)}" width="140" height="140"
          style="object-fit:cover;border-radius:10px;border:1px solid #e5e0d6;display:block;" />
      </a>`).join("");
  const links = attachments
    .map((item) => `<li><a href="${escapeHtml(item.url)}">${escapeHtml(item.name)}</a></li>`)
    .join("");

  return `
  <div style="font-family:'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif;color:#1a1622;line-height:1.5;max-width:640px;">
    <p style="margin:0 0 12px;font-size:13px;color:#5a5046;">Shared from Companions Collaborate Tasks</p>
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:600;letter-spacing:-0.01em;">${escapeHtml(ticket.title)}</h1>
    <p style="margin:0 0 16px;font-size:13px;color:#3d3529;">
      <strong>${escapeHtml(ticket.status || "active")}</strong>
      · ${escapeHtml(ticket.priority || "medium")}
      · ${escapeHtml(ticket.project || "Unassigned")}
    </p>
    ${note ? `<p style="margin:0 0 16px;padding:12px 14px;background:#f5f1e8;border-radius:10px;font-size:14px;">${escapeHtml(note).replace(/\n/g, "<br>")}</p>` : ""}
    ${docs ? `<div style="margin:0 0 16px;"><div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#5a5046;margin-bottom:6px;">Documentation</div><div style="font-size:14px;white-space:pre-wrap;">${escapeHtml(docs)}</div></div>` : ""}
    ${images ? `<div style="margin:0 0 16px;">${images}</div>` : ""}
    ${links ? `<div style="margin:0 0 16px;"><div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#5a5046;margin-bottom:6px;">Linked files</div><ul style="margin:0;padding-left:18px;font-size:13px;">${links}</ul></div>` : ""}
    <p style="margin:18px 0 0;">
      <a href="${escapeHtml(deepLink)}"
        style="display:inline-block;padding:11px 16px;border-radius:8px;background:#8664b7;color:#fff;text-decoration:none;font-weight:600;font-size:13px;">
        Open task in Collaborate
      </a>
    </p>
    <p style="margin:14px 0 0;font-size:12px;color:#5a5046;">Shared by ${escapeHtml(actor || "team")}</p>
  </div>`;
}

async function shareTicket(env, ticket, body, session) {
  const to = String(body.to || "").trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new TicketError("A valid recipient email is required");
  }
  const message = String(body.message || "").trim().slice(0, 4000);
  const subject = String(body.subject || "").trim()
    || `Task: ${ticket.title}`;
  const deepLink = `https://companionsofcaddo.org/dashboard/collaborate?seg=tasks&ticket=${encodeURIComponent(ticket.id)}`;
  const actor = actorId(session);
  const html = taskShareHtml(ticket, { message, actor, deepLink });
  const result = await sendResendEmail(env, {
    to,
    subject,
    html,
    type: "task_share",
    related_type: "ticket",
    related_id: ticket.id,
  });
  if (!result.ok) {
    throw new TicketError(result.error || "Email send failed", result.status || 500);
  }
  await addTicketEvent(env, ticket.id, {
    event_type: "shared",
    detail: `Shared by email to ${to}${message ? ` — ${message.slice(0, 240)}` : ""}`,
  }, actor);
  return {
    ok: true,
    to,
    subject,
    email_id: result.id || null,
    log_id: result.log_id || null,
    deep_link: deepLink,
  };
}

export async function ticketsApiRoutes(request, env, url) {
  if (url.pathname !== "/api/tickets" && !url.pathname.startsWith("/api/tickets/")) return null;
  const session = await getAuthUser(request, env);
  if (!session) return json({ ok: false, error: "Not authenticated" }, 401);

  try {
    if (url.pathname === "/api/tickets" && request.method === "GET") {
      const tickets = await listTickets(env, {
        status: url.searchParams.get("status"),
        project: url.searchParams.get("project"),
        workable: url.searchParams.get("workable"),
        search: url.searchParams.get("search"),
        limit: url.searchParams.get("limit"),
      });
      return json({ ok: true, tickets, count: tickets.length });
    }
    if (url.pathname === "/api/tickets" && request.method === "POST") {
      const ticket = await createTicket(env, await requestBody(request), actorId(session));
      return json({ ok: true, ticket }, 201);
    }
    if (url.pathname === "/api/tickets/analytics" && request.method === "GET") {
      return json({ ok: true, analytics: await ticketAnalytics(env) });
    }

    const route = ticketRoute(url.pathname);
    if (!route) return json({ ok: false, error: "Ticket route not found" }, 404);

    if (!route.action && request.method === "GET") {
      const ticket = await getTicket(env, route.id);
      if (!ticket) throw new TicketError("Ticket not found", 404);
      return json({ ok: true, ticket, events: await listTicketEvents(env, route.id) });
    }
    if (!route.action && request.method === "PATCH") {
      return json({
        ok: true,
        ticket: await patchTicket(env, route.id, await requestBody(request), actorId(session)),
      });
    }
    if (!route.action && request.method === "DELETE") {
      return json({ ok: true, ...(await deleteTicket(env, route.id, actorId(session))) });
    }
    if (route.action === "status" && request.method === "POST") {
      return json({
        ok: true,
        ticket: await setTicketStatus(env, route.id, await requestBody(request), actorId(session)),
      });
    }
    if (route.action === "events" && request.method === "GET") {
      return json({ ok: true, events: await listTicketEvents(env, route.id) });
    }
    if (route.action === "events" && request.method === "POST") {
      return json({
        ok: true,
        event: await addTicketEvent(env, route.id, await requestBody(request), actorId(session)),
      }, 201);
    }
    if (route.action === "share" && request.method === "POST") {
      const ticket = await getTicket(env, route.id);
      if (!ticket) throw new TicketError("Ticket not found", 404);
      return json(await shareTicket(env, ticket, await requestBody(request), session));
    }
    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (error) {
    if (error instanceof TicketError) {
      return json({ ok: false, error: error.message }, error.status);
    }
    console.error("[tickets-api]", error);
    return json({ ok: false, error: "Ticket operation failed" }, 500);
  }
}
