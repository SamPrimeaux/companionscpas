/** cms_asset_usages — where library assets are referenced / live on the site */

const TENANT_ID = "tenant_companionscpas";

export function normalizeAssetUrl(url) {
  return String(url || "")
    .trim()
    .split("?")[0]
    .replace(/\/+$/, "")
    .toLowerCase();
}

function usageId(parts) {
  return `usage_${parts.join("_")}`.replace(/[^a-zA-Z0-9_:-]/g, "_").slice(0, 120);
}

async function upsertUsage(env, row) {
  const id = usageId([
    row.asset_id,
    row.surface,
    row.entity_type || "",
    row.entity_id || "",
    row.field || "primary",
  ]);
  await env.DB.prepare(
    `INSERT INTO cms_asset_usages
       (id, tenant_id, asset_id, surface, entity_type, entity_id, entity_label, field, is_live, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(tenant_id, asset_id, surface, entity_type, entity_id, field) DO UPDATE SET
       entity_label = excluded.entity_label,
       is_live = excluded.is_live,
       updated_at = datetime('now')`
  ).bind(
    id,
    TENANT_ID,
    row.asset_id,
    row.surface,
    row.entity_type || "",
    row.entity_id || "",
    row.entity_label || null,
    row.field || "primary",
    row.is_live ? 1 : 0
  ).run().catch(() => {});
}

async function findAssetIdByUrl(env, url, urlIndex) {
  const key = normalizeAssetUrl(url);
  if (!key) return null;
  if (urlIndex?.has(key)) return urlIndex.get(key);
  const row = await env.DB.prepare(
    `SELECT id FROM cms_assets
     WHERE tenant_id = ?
       AND (
         lower(trim(COALESCE(public_url,''))) = ?
         OR lower(trim(COALESCE(cdn_url,''))) = ?
         OR lower(trim(COALESCE(pub_url,''))) = ?
       )
     LIMIT 1`
  ).bind(TENANT_ID, key, key, key).first().catch(() => null);
  return row?.id || null;
}

async function buildUrlIndex(env) {
  const rows = await env.DB.prepare(
    `SELECT id, public_url, cdn_url, pub_url FROM cms_assets
     WHERE tenant_id = ? AND status != 'archived'`
  ).bind(TENANT_ID).all().catch(() => ({ results: [] }));
  const map = new Map();
  for (const r of rows.results || []) {
    for (const u of [r.public_url, r.cdn_url, r.pub_url]) {
      const key = normalizeAssetUrl(u);
      if (key && !map.has(key)) map.set(key, r.id);
    }
  }
  return map;
}

/** Full rebuild from animals + campaigns (+ asset_key animal links). */
export async function rebuildCmsAssetUsages(env) {
  await env.DB.prepare(`DELETE FROM cms_asset_usages WHERE tenant_id = ?`)
    .bind(TENANT_ID).run().catch(() => {});

  const urlIndex = await buildUrlIndex(env);
  let inserted = 0;

  const animals = await env.DB.prepare(
    `SELECT id, name, photo_url, public_visible, status
     FROM animal_profiles WHERE tenant_id = ?`
  ).bind(TENANT_ID).all().catch(() => ({ results: [] }));

  for (const a of animals.results || []) {
    const isLive = Number(a.public_visible) === 1
      && /^(available|foster|pending)$/i.test(String(a.status || ""));
    let assetId = await findAssetIdByUrl(env, a.photo_url, urlIndex);
    if (!assetId) {
      const byKey = await env.DB.prepare(
        `SELECT id FROM cms_assets WHERE tenant_id = ? AND asset_key = ? AND status != 'archived' LIMIT 1`
      ).bind(TENANT_ID, a.id).first().catch(() => null);
      assetId = byKey?.id || null;
    }
    if (!assetId) continue;
    await upsertUsage(env, {
      asset_id: assetId,
      surface: "animal_profile",
      entity_type: "animal",
      entity_id: a.id,
      entity_label: a.name || "Animal",
      field: "photo_url",
      is_live: isLive,
    });
    inserted += 1;
    if (isLive) {
      await upsertUsage(env, {
        asset_id: assetId,
        surface: "adopt_gallery",
        entity_type: "animal",
        entity_id: a.id,
        entity_label: a.name || "Animal",
        field: "photo_url",
        is_live: 1,
      });
      inserted += 1;
    }
  }

  const campaigns = await env.DB.prepare(
    `SELECT id, title, cover_asset_id, is_public, status
     FROM fundraising_campaigns
     WHERE cover_asset_id IS NOT NULL AND cover_asset_id != ''`
  ).all().catch(() => ({ results: [] }));

  for (const c of campaigns.results || []) {
    const isLive = Number(c.is_public) === 1;
    await upsertUsage(env, {
      asset_id: c.cover_asset_id,
      surface: "campaign_cover",
      entity_type: "campaign",
      entity_id: c.id,
      entity_label: c.title || "Campaign",
      field: "cover_asset_id",
      is_live: isLive,
    });
    inserted += 1;
  }

  const entries = await env.DB.prepare(
    `SELECT ce.id, ce.dog_name, ce.asset_id, ce.photo_url, ce.payment_status,
            ce.submission_status, ce.is_approved, ce.campaign_id, ce.archived_at,
            fc.title AS campaign_title
     FROM competition_entries ce
     LEFT JOIN fundraising_campaigns fc ON fc.id = ce.campaign_id
     WHERE ce.tenant_id = ?
       AND (ce.asset_id IS NOT NULL OR (ce.photo_url IS NOT NULL AND ce.photo_url != ''))`
  ).bind(TENANT_ID).all().catch(() => ({ results: [] }));

  for (const e of entries.results || []) {
    let assetId = e.asset_id || null;
    if (!assetId) assetId = await findAssetIdByUrl(env, e.photo_url, urlIndex);
    if (!assetId) continue;
    const archived = !!(e.archived_at && String(e.archived_at).trim());
    const paid = String(e.payment_status || "").toLowerCase() === "paid"
      || String(e.submission_status || "").toLowerCase() === "paid";
    const approved = Number(e.is_approved) === 1;
    // Live only when paid + not archived (public competition gallery)
    const isLive = !archived && paid && (approved || String(e.submission_status || "").toLowerCase() === "paid");
    const dog = e.dog_name || "Entry";
    const camp = e.campaign_title || "Competition";
    const label = archived
      ? `Archived · ${dog} · ${camp}`
      : `${dog} · ${camp}`;
    await upsertUsage(env, {
      asset_id: assetId,
      surface: "competition_entry",
      entity_type: "competition_entry",
      entity_id: e.id,
      entity_label: label,
      field: "asset_id",
      is_live: isLive,
    });
    inserted += 1;
  }

  return { ok: true, usages: inserted };
}

/** Sync one animal's profile photo usage after PATCH. */
export async function syncAnimalPhotoUsage(env, animal) {
  if (!animal?.id) return;
  await env.DB.prepare(
    `DELETE FROM cms_asset_usages
     WHERE tenant_id = ? AND entity_type = 'animal' AND entity_id = ?
       AND surface IN ('animal_profile', 'adopt_gallery')`
  ).bind(TENANT_ID, animal.id).run().catch(() => {});

  const urlIndex = await buildUrlIndex(env);
  let assetId = await findAssetIdByUrl(env, animal.photo_url, urlIndex);
  if (!assetId) {
    const byKey = await env.DB.prepare(
      `SELECT id FROM cms_assets WHERE tenant_id = ? AND asset_key = ? AND status != 'archived' LIMIT 1`
    ).bind(TENANT_ID, animal.id).first().catch(() => null);
    assetId = byKey?.id || null;
  }
  if (!assetId) return;

  const isLive = Number(animal.public_visible) === 1
    && /^(available|foster|pending)$/i.test(String(animal.status || ""));

  await upsertUsage(env, {
    asset_id: assetId,
    surface: "animal_profile",
    entity_type: "animal",
    entity_id: animal.id,
    entity_label: animal.name || "Animal",
    field: "photo_url",
    is_live: isLive,
  });
  if (isLive) {
    await upsertUsage(env, {
      asset_id: assetId,
      surface: "adopt_gallery",
      entity_type: "animal",
      entity_id: animal.id,
      entity_label: animal.name || "Animal",
      field: "photo_url",
      is_live: 1,
    });
  }
}

export async function loadUsagesByAssetIds(env, assetIds) {
  const ids = [...new Set((assetIds || []).filter(Boolean))];
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => "?").join(", ");
  const rows = await env.DB.prepare(
    `SELECT asset_id, surface, entity_type, entity_id, entity_label, field, is_live
     FROM cms_asset_usages
     WHERE tenant_id = ? AND asset_id IN (${placeholders})
     ORDER BY is_live DESC, surface ASC, entity_label ASC`
  ).bind(TENANT_ID, ...ids).all().catch(() => ({ results: [] }));

  const map = new Map();
  for (const r of rows.results || []) {
    if (!map.has(r.asset_id)) map.set(r.asset_id, []);
    map.get(r.asset_id).push({
      surface: r.surface,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      entity_label: r.entity_label,
      field: r.field,
      is_live: Number(r.is_live) === 1,
      label: usageDisplayLabel(r),
    });
  }
  return map;
}

export function usageDisplayLabel(u) {
  const name = u.entity_label || u.entity_id || "";
  if (u.surface === "adopt_gallery") return name ? `Adopt · ${name}` : "Adopt gallery";
  if (u.surface === "animal_profile") return name ? `Animal · ${name}` : "Animal profile";
  if (u.surface === "campaign_cover") return name ? `Campaign · ${name}` : "Campaign";
  if (u.surface === "competition_entry") {
    if (!name) return "Competition entry";
    if (Number(u.is_live) === 1 || u.is_live === true) {
      return name.startsWith("Live ·") ? name : `Live · ${name}`;
    }
    if (name.startsWith("Archived ·") || name.startsWith("Entry ·")) return name;
    return `Entry · ${name}`;
  }
  if (u.surface === "cms_page") return name ? `Page · ${name}` : "CMS page";
  return name || u.surface || "Used";
}
