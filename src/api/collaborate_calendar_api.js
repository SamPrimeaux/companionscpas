import { getAuthUser } from './session_api.js';

const TENANT = 'tenant_companionscpas';
const ROOT = '/api/collaborate/calendar';

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function newId(prefix) {
  return prefix + '_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}

function asEpoch(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value > 1e12 ? value / 1000 : value);
  }
  if (typeof value === 'string' && /^\d{9,13}$/.test(value.trim())) {
    const number = Number(value);
    return Math.floor(number > 1e12 ? number / 1000 : number);
  }
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
}

function epochIso(epoch) {
  return new Date(epoch * 1000).toISOString();
}

function jsonText(value, fallback) {
  if (value == null || value === '') return JSON.stringify(fallback);
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value));
    } catch {
      throw new Error('Invalid JSON value');
    }
  }
  return JSON.stringify(value);
}

function eventResponse(row) {
  if (!row) return null;
  let attendees = [];
  let metadata = {};
  try { attendees = JSON.parse(row.attendees_json || '[]'); } catch {}
  try { metadata = JSON.parse(row.metadata_json || '{}'); } catch {}
  return {
    ...row,
    starts_at_unix: Number(row.starts_at_unix),
    ends_at_unix: Number(row.ends_at_unix),
    all_day: Number(row.all_day) === 1,
    attendees,
    metadata,
  };
}

async function loadEvent(env, id) {
  return env.DB.prepare(
    `SELECT * FROM dashboard_calendar_events WHERE id = ? AND tenant_id = ? LIMIT 1`,
  ).bind(id, TENANT).first();
}

function notificationStatement(env, action, eventId, title, actor) {
  const id = newId('notif_calendar');
  return env.DB.prepare(`
    INSERT INTO dashboard_notifications
      (id, tenant_id, type, title, body, status, source, related_type, related_id,
       action_url, action_label, metadata_json, created_at)
    VALUES (?, ?, 'calendar', ?, ?, 'unread', 'collaborate_calendar',
            'calendar_event', ?, '/dashboard/collaborate', 'Open calendar', ?, datetime('now'))
  `).bind(
    id,
    TENANT,
    'Calendar event ' + action + ': ' + title,
    (actor || 'Dashboard user') + ' ' + action + ' this calendar event.',
    eventId,
    JSON.stringify({ action, actor: actor || null }),
  );
}

export async function collaborateCalendarApiRoutes(request, env, url) {
  const path = url.pathname.replace(/\/$/, '');
  if (!path.startsWith(ROOT)) return null;

  const session = await getAuthUser(request, env);
  if (!session) return json({ ok: false, error: 'Not authenticated' }, 401);
  if (!env.DB) return json({ ok: false, error: 'Calendar database unavailable' }, 503);

  const method = request.method.toUpperCase();
  const eventMatch = path.match(/^\/api\/collaborate\/calendar\/events\/([^/]+)$/);

  try {
    if (path === ROOT + '/meta' && method === 'GET') {
      return json({
        ok: true,
        timezone: 'America/Chicago',
        week_starts_on: 0,
        working_hours: { start: 0, end: 24 },
      });
    }

    if (path === ROOT + '/events' && method === 'GET') {
      const from = asEpoch(url.searchParams.get('from'));
      const to = asEpoch(url.searchParams.get('to'));
      if (!from || !to || from >= to) {
        return json({ ok: false, error: 'Valid from and to unix timestamps are required' }, 400);
      }
      const result = await env.DB.prepare(`
        SELECT * FROM dashboard_calendar_events
        WHERE tenant_id = ?
          AND starts_at_unix IS NOT NULL
          AND starts_at_unix < ?
          AND COALESCE(ends_at_unix, starts_at_unix) >= ?
        ORDER BY starts_at_unix ASC, title ASC
        LIMIT 500
      `).bind(TENANT, to, from).all();
      return json({ ok: true, events: (result.results || []).map(eventResponse) });
    }

    if (path === ROOT + '/events' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const title = String(body.title || '').trim();
      const startsAt = asEpoch(body.starts_at ?? body.starts_at_unix);
      const endsAt = asEpoch(body.ends_at ?? body.ends_at_unix);
      if (!title) return json({ ok: false, error: 'title is required' }, 400);
      if (!startsAt || !endsAt || endsAt <= startsAt) {
        return json({ ok: false, error: 'ends_at must be after starts_at' }, 400);
      }

      const id = newId('cal');
      const now = Math.floor(Date.now() / 1000);
      const attendeesJson = jsonText(body.attendees_json ?? body.attendees, []);
      const metadataJson = jsonText(body.metadata_json ?? body.metadata, {});
      const actor = session.user_id || session.email || 'dashboard';
      const insert = env.DB.prepare(`
        INSERT INTO dashboard_calendar_events
          (id, tenant_id, title, event_type, starts_at, ends_at, starts_at_unix, ends_at_unix,
           all_day, location, attendees_json, created_by, updated_at, source,
           external_event_id, metadata_json, platform, content, status, animal_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        id, TENANT, title, String(body.event_type || 'general'),
        epochIso(startsAt), epochIso(endsAt), startsAt, endsAt,
        body.all_day ? 1 : 0, body.location ? String(body.location) : null,
        attendeesJson, actor, now, 'local',
        null,
        metadataJson, body.platform ? String(body.platform) : null,
        body.content ? String(body.content) : null, String(body.status || 'scheduled'),
        body.animal_id ? String(body.animal_id) : null,
      );
      await env.DB.batch([insert, notificationStatement(env, 'created', id, title, actor)]);
      const event = await loadEvent(env, id);
      if (!event) throw new Error('Created calendar row could not be reloaded');
      return json({ ok: true, id, event: eventResponse(event) }, 201);
    }

    if (eventMatch && method === 'PATCH') {
      const id = decodeURIComponent(eventMatch[1]);
      const existing = await loadEvent(env, id);
      if (!existing) return json({ ok: false, error: 'Calendar event not found' }, 404);
      const body = await request.json().catch(() => ({}));
      const sets = [];
      const values = [];
      const textFields = ['title', 'event_type', 'location', 'content', 'status', 'animal_id'];
      for (const field of textFields) {
        if (body[field] !== undefined) {
          const value = body[field] == null ? null : String(body[field]).trim();
          if (field === 'title' && !value) return json({ ok: false, error: 'title cannot be empty' }, 400);
          sets.push(field + ' = ?');
          values.push(value);
        }
      }
      if (body.all_day !== undefined) {
        sets.push('all_day = ?');
        values.push(body.all_day ? 1 : 0);
      }
      if (body.attendees_json !== undefined || body.attendees !== undefined) {
        sets.push('attendees_json = ?');
        values.push(jsonText(body.attendees_json ?? body.attendees, []));
      }
      if (body.metadata_json !== undefined || body.metadata !== undefined) {
        sets.push('metadata_json = ?');
        values.push(jsonText(body.metadata_json ?? body.metadata, {}));
      }
      let startsAt = Number(existing.starts_at_unix);
      let endsAt = Number(existing.ends_at_unix);
      if (body.starts_at !== undefined || body.starts_at_unix !== undefined) {
        startsAt = asEpoch(body.starts_at ?? body.starts_at_unix);
        if (!startsAt) return json({ ok: false, error: 'Invalid starts_at' }, 400);
        sets.push('starts_at = ?', 'starts_at_unix = ?');
        values.push(epochIso(startsAt), startsAt);
      }
      if (body.ends_at !== undefined || body.ends_at_unix !== undefined) {
        endsAt = asEpoch(body.ends_at ?? body.ends_at_unix);
        if (!endsAt) return json({ ok: false, error: 'Invalid ends_at' }, 400);
        sets.push('ends_at = ?', 'ends_at_unix = ?');
        values.push(epochIso(endsAt), endsAt);
      }
      if (endsAt <= startsAt) return json({ ok: false, error: 'ends_at must be after starts_at' }, 400);
      if (!sets.length) return json({ ok: false, error: 'No supported changes supplied' }, 400);
      const now = Math.floor(Date.now() / 1000);
      sets.push('updated_at = ?');
      values.push(now, id, TENANT);
      const actor = session.user_id || session.email || 'dashboard';
      const update = env.DB.prepare(
        'UPDATE dashboard_calendar_events SET ' + sets.join(', ') + ' WHERE id = ? AND tenant_id = ?',
      ).bind(...values);
      const nextTitle = body.title !== undefined ? String(body.title).trim() : existing.title;
      await env.DB.batch([update, notificationStatement(env, 'updated', id, nextTitle, actor)]);
      const event = await loadEvent(env, id);
      if (!event || Number(event.updated_at) !== now) throw new Error('Calendar update did not persist');
      return json({ ok: true, id, event: eventResponse(event) });
    }

    if (eventMatch && method === 'DELETE') {
      const id = decodeURIComponent(eventMatch[1]);
      const existing = await loadEvent(env, id);
      if (!existing) return json({ ok: false, error: 'Calendar event not found' }, 404);
      const actor = session.user_id || session.email || 'dashboard';
      await env.DB.batch([
        env.DB.prepare('DELETE FROM dashboard_calendar_events WHERE id = ? AND tenant_id = ?').bind(id, TENANT),
        notificationStatement(env, 'deleted', id, existing.title, actor),
      ]);
      const remaining = await loadEvent(env, id);
      if (remaining) throw new Error('Calendar event delete did not persist');
      return json({ ok: true, id, deleted: true });
    }

    return json({ ok: false, error: 'Calendar route not found' }, 404);
  } catch (error) {
    console.error('[collaborate-calendar]', error);
    return json({ ok: false, error: error?.message || 'Calendar operation failed' }, 500);
  }
}
