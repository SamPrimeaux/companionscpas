// shared.js — helpers + constants extracted from dashboard_api.js
// (tkt_cpas_mod_dashboard_api_20260818) Verbatim logic, re-exported for the route modules.

import { getAuthUser } from "../session_api.js";
import { syncAnimalPhotoUsage } from "../cms_asset_usages.js";

export { getAuthUser, syncAnimalPhotoUsage };

export const TENANT = 'tenant_companionscpas';
export const FOSTER_TENANT = TENANT;
export const ORG = 'org_companionscpas';

export function safeJson(value, fallback) {
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function nowIso() { return new Date().toISOString(); }

export function animalId(name) {
  return 'animal_' + String(name).toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40)
    + '_' + Date.now();
}

export const CDN_ORIGIN = "https://assets.companionsofcaddo.org";

export function safeFilename(name) {
  return String(name || "file")
    .normalize("NFC")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120) || "file";
}

export function taskId() { return 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }
export function postId()  { return 'post_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

export function guessAnimalNameFromFilename(filename) {
  const base = String(filename || '').replace(/\.[^.]+$/, '');
  const vaccMatch = base.match(/Vaccination[-_ ]?Certificate[-_ ]?([A-Za-z]+)/i)
    || base.match(/VaccinationCertificate([A-Za-z]+)/i);
  if (vaccMatch?.[1]) {
    const name = vaccMatch[1];
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }
  const nameBeforeDate = base.match(/([A-Za-z]+)[-_]?\d{4}$/);
  if (nameBeforeDate?.[1] && nameBeforeDate[1].length > 2) {
    const name = nameBeforeDate[1];
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }
  const kennelMatch = base.match(/KennelCard.*?([A-Za-z]{3,})/i);
  if (kennelMatch?.[1]) {
    const name = kennelMatch[1];
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }
  return base.replace(/[_-]+/g, ' ').trim() || 'Unknown';
}

export function matchAnimalByFilename(animals, filename) {
  const guess = guessAnimalNameFromFilename(filename).toLowerCase();
  return (animals || []).find((row) => String(row.name || '').toLowerCase() === guess) || null;
}

export function inferMedicalDocType(label) {
  const text = String(label || '').toLowerCase();
  if (text.includes('vaccination')) return 'Vaccination Certificate';
  if (text.includes('certificate')) return 'Certificate';
  return 'Medical Document';
}


// Normalize a raw animal_profiles row into the API shape
export function normalizeAnimal(a) {
  return {
    ...a,
    photo:       a.asset_cdn_url || a.photo_url || null,
    tags:        safeJson(a.tags_json, []),
    metadata:    safeJson(a.metadata_json, {}),
    foster_needed:  a.foster_needed  ? 1 : 0,
    public_visible: a.public_visible ? 1 : 0,
    featured:       a.featured       ? 1 : 0,
    status: (a.status || 'available').toLowerCase(),
  };
}

export function normalizeCampaign(row) {
  if (!row) return null;
  const config = safeJson(row.config_json, {});
  return {
    ...row,
    goal_cents: Number(row.goal_amount_cents ?? row.goal_cents ?? 0),
    raised_cents: Number(row.raised_amount_cents ?? row.raised_cents ?? 0),
    donors: Number(row.donor_count || 0),
    category: row.campaign_type || row.category || 'fundraiser',
    config,
    cover_url: row.cover_url || config.cover_url || null,
  };
}

export async function invalidateDonatePageCache(env) {
  try {
    const { publishRoute } = await import('./cms_pipeline.js');
    await publishRoute(env, '/donate', 'donate_cache_warm');
  } catch (err) {
    console.warn('[donate-cache] publish warm failed:', err?.message || err);
    if (env?.CMS_CACHE) await env.CMS_CACHE.delete('page:/donate').catch(() => {});
  }
}

/** Live Stripe totals for campaign list cards (denormalized columns can lag). */
export async function loadCampaignLiveStats(env) {
  const rows = await env.DB.prepare(`
    SELECT campaign_id,
           COALESCE(SUM(amount_cents), 0) AS raised_cents,
           COUNT(*) AS gift_count,
           COUNT(DISTINCT COALESCE(donor_id, stripe_payment_intent_id, id)) AS donor_count
    FROM donations
    WHERE campaign_id IS NOT NULL
      AND status = 'succeeded'
      AND payment_provider = 'stripe'
      AND stripe_payment_intent_id LIKE 'pi_%'
    GROUP BY campaign_id
  `).all().catch(() => ({ results: [] }));
  const map = new Map();
  for (const row of rows.results || []) {
    map.set(String(row.campaign_id), {
      raised_cents: Number(row.raised_cents) || 0,
      gift_count: Number(row.gift_count) || 0,
      donor_count: Number(row.donor_count) || 0,
    });
  }
  return map;
}

/** Bust public /adopt (and related) so Visible/Featured/status edits show up promptly. */
export async function invalidateAdoptSurfaces(env) {
  if (!env?.CMS_CACHE) return;
  await Promise.all([
    env.CMS_CACHE.delete('page:/adopt').catch(() => {}),
    env.CMS_CACHE.delete('page:/').catch(() => {}),
  ]);
}

export function donorLabel(raw) {
  const s = String(raw || '').trim();
  if (!s || s === 'a supporter') return 'a supporter';
  if (s.includes('@')) {
    const local = s.split('@')[0];
    return local.length >= 2 ? local : 'a supporter';
  }
  return s;
}

/** Parse D1 timestamps that mix "YYYY-MM-DD HH:MM:SS" (UTC) and ISO "…T…Z". */
export function activityEpochMs(raw) {
  if (!raw) return 0;
  const s = String(raw).trim();
  if (!s) return 0;
  let normalized = s;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    normalized = s;
  } else if (/T/.test(s)) {
    normalized = s.endsWith('Z') ? s : s + 'Z';
  } else {
    // SQLite datetime('now') → UTC without zone
    normalized = s.replace(' ', 'T') + 'Z';
  }
  const t = Date.parse(normalized);
  return Number.isFinite(t) ? t : 0;
}

/** Emit ISO UTC so the dashboard never parses SQLite space-times as local. */
export function toActivityIso(raw) {
  const ms = activityEpochMs(raw);
  return ms ? new Date(ms).toISOString() : (raw || null);
}

export function isSameMonthPrefix(raw, monthPrefix) {
  if (!raw || !monthPrefix) return false;
  const s = String(raw).trim();
  // "2026-07-20 …" or "2026-07-20T…"
  return s.slice(0, 7) === monthPrefix;
}

export function buildFinancialBreakdownMtd(donations) {
  const DEFAULT_COLORS = ['#7c3aed', '#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#a78bfa'];
  const totals = {};
  for (const row of donations || []) {
    const label = String(row.campaign_title || 'General').trim() || 'General';
    const cents = Number(row.amount_cents || 0);
    if (!(cents > 0)) continue;
    totals[label] = (totals[label] || 0) + cents;
  }
  const entries = Object.entries(totals).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
  if (!entries.length) {
    return { labels: [], values: [], colors: [], total_cents: 0 };
  }
  return {
    labels: entries.map(([label]) => label),
    values: entries.map(([, cents]) => Math.round(cents / 100)),
    colors: entries.map((_, i) => DEFAULT_COLORS[i % DEFAULT_COLORS.length]),
    total_cents: entries.reduce((sum, [, cents]) => sum + cents, 0),
  };
}

/** Prefer donations + applications; only surface animal *adds* (not mass updates). */
export function buildOverviewActivity({ animals, apps, donations }) {
  const items = [];

  for (const d of (donations || []).slice(0, 20)) {
    const when = d.donated_at || d.created_at;
    if (!when) continue;
    const dollars = Math.round(Number(d.amount_cents || 0) / 100);
    const campaign = d.campaign_title ? ` · ${d.campaign_title}` : '';
    items.push({
      id: `don_${d.stripe_payment_intent_id || d.id || when}_${dollars}`,
      type: 'donation',
      text: `Donation received — $${dollars.toLocaleString()} from ${donorLabel(d.donor_name)}${campaign}`,
      at: toActivityIso(when),
      link: 'fundraising',
      priority: 3,
      _ts: activityEpochMs(when),
    });
  }

  for (const a of (apps || []).slice(0, 12)) {
    const when = a.submitted_at || a.created_at;
    if (!when) continue;
    const name = a.applicant_name || [a.first_name, a.last_name].filter(Boolean).join(' ') || 'Applicant';
    const status = String(a.review_status || 'new').replace(/_/g, ' ');
    items.push({
      id: `app_${a.id}`,
      type: 'application',
      text: `Foster application — ${name} (${status})`,
      at: toActivityIso(when),
      link: 'applications',
      priority: 2,
      _ts: activityEpochMs(when),
    });
  }

  // Animal adds only — batch "updated" rows drown out real activity
  const adds = (animals || [])
    .filter((a) => a.created_at)
    .slice()
    .sort((a, b) => activityEpochMs(b.created_at) - activityEpochMs(a.created_at))
    .slice(0, 6);
  for (const a of adds) {
    items.push({
      id: `animal_add_${a.id}`,
      type: 'animal',
      text: `Animal added — ${a.name}`,
      at: toActivityIso(a.created_at),
      link: 'animals',
      priority: 1,
      _ts: activityEpochMs(a.created_at),
    });
  }

  items.sort((a, b) => {
    const t = (b._ts || 0) - (a._ts || 0);
    if (t !== 0) return t;
    return (b.priority || 0) - (a.priority || 0);
  });

  return items.slice(0, 8).map(({ priority, _ts, ...rest }) => rest);
}

export const CAMPAIGN_SELECT = `
  SELECT fc.*,
         fc.goal_amount_cents AS goal_cents,
         fc.raised_amount_cents AS raised_cents,
         COALESCE(fc.campaign_type, 'fundraiser') AS category,
         COALESCE(ca.public_url, ca.cdn_url, ca.pub_url) AS cover_url
  FROM fundraising_campaigns fc
  LEFT JOIN cms_assets ca ON ca.id = fc.cover_asset_id
`;

export async function fetchCampaignById(env, id) {
  const row = await env.DB.prepare(`${CAMPAIGN_SELECT} WHERE fc.id = ? LIMIT 1`)
    .bind(id).first().catch(() => null);
  return normalizeCampaign(row);
}

export async function saveCampaignRecord(env, b, existingId = null) {
  const title = String(b.title || '').trim();
  if (!title) throw new Error('Campaign title is required');
  const now = nowIso();
  const slug = String(b.slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'campaign';
  const id = existingId || b.id || `campaign_${slug}_${Date.now()}`;
  const configJson = typeof b.config_json === 'string'
    ? b.config_json
    : JSON.stringify(b.config_json || b.config || {});
  const goalCents = Math.max(0, Number(b.goal_amount_cents || 0));
  const isPublic = b.is_public === 0 || b.is_public === false ? 0 : 1;
  const shortDesc = String(b.short_description || b.description || '').slice(0, 240);

  if (existingId) {
    await env.DB.prepare(`
      UPDATE fundraising_campaigns SET
        title = ?, slug = ?, description = ?, short_description = ?,
        goal_amount_cents = ?, status = ?, starts_at = ?, ends_at = ?,
        is_public = ?, campaign_type = ?, cover_asset_id = ?, config_json = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      title, slug, b.description || '', shortDesc,
      goalCents, b.status || 'active', b.starts_at || null, b.ends_at || null,
      isPublic, b.campaign_type || 'fundraiser', b.cover_asset_id || null, configJson,
      now, existingId
    ).run();
    return id;
  }

  await env.DB.prepare(`
    INSERT INTO fundraising_campaigns
      (id, tenant_id, organization_id, title, slug, description, short_description,
       goal_amount_cents, raised_amount_cents, status, starts_at, ends_at, is_public,
       campaign_type, cover_asset_id, config_json, donor_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).bind(
    id, TENANT, TENANT, title, slug, b.description || '', shortDesc,
    goalCents, b.status || 'draft', b.starts_at || null, b.ends_at || null,
    isPublic, b.campaign_type || 'fundraiser', b.cover_asset_id || null, configJson,
    now, now
  ).run().catch(async () => {
    await env.DB.prepare(`
      INSERT INTO fundraising_campaigns
        (id, organization_id, title, slug, description, short_description,
         goal_amount_cents, raised_amount_cents, status, starts_at, ends_at, is_public,
         campaign_type, donor_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(
      id, TENANT, title, slug, b.description || '', shortDesc,
      goalCents, b.status || 'draft', b.starts_at || null, b.ends_at || null,
      isPublic, b.campaign_type || 'fundraiser', now, now
    ).run();
  });
  return id;
}
