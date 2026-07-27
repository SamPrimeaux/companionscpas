import { getAuthUser } from "./session_api.js";
import {
  TicketError,
  addTicketEvent,
  createTicket,
  deleteTicket,
  getTicket,
  listTicketEvents,
  listTickets,
  patchTicket,
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
  const match = pathname.match(/^\/api\/tickets\/([^/]+)(?:\/(status|events))?$/);
  if (!match) return null;
  return { id: decodeURIComponent(match[1]), action: match[2] || null };
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
    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (error) {
    if (error instanceof TicketError) {
      return json({ ok: false, error: error.message }, error.status);
    }
    console.error("[tickets-api]", error);
    return json({ ok: false, error: "Ticket operation failed" }, 500);
  }
}
