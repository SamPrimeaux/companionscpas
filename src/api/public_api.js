// Public API — server-filtered, allowlisted fields only

const TENANT = "tenant_companionscpas";
const PUBLIC_ANIMAL_STATUSES = ["available", "foster", "pending"];

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}

function safeJson(value, fallback) {
  try { return JSON.parse(value || ""); } catch { return fallback; }
}

function normalizePublicAnimal(row) {
  const photo = row.asset_cdn_url || row.asset_public_url || row.photo_url || null;
  return {
    id: row.id,
    name: row.name,
    species: row.species || "Dog",
    breed: row.breed || null,
    sex: row.sex || null,
    age_label: row.age_label || null,
    weight_label: row.weight_label || null,
    energy_level: row.energy_level || null,
    status: (row.status || "available").toLowerCase(),
    bio: row.bio || null,
    good_with_dogs: row.good_with_dogs || null,
    good_with_cats: row.good_with_cats || null,
    good_with_kids: row.good_with_kids || null,
    foster_needed: row.foster_needed ? 1 : 0,
    featured: row.featured ? 1 : 0,
    photo,
    asset_cdn_url: row.asset_cdn_url || null,
    photo_url: row.photo_url || null,
    tags: safeJson(row.tags_json, []),
  };
}

export async function publicApiRoutes(request, env, url) {
  if (request.method !== "GET") return null;

  if (url.pathname === "/api/public/animals") {
    const rows = await env.DB.prepare(`
      SELECT
        ap.id, ap.name, ap.species, ap.breed, ap.sex, ap.age_label, ap.weight_label,
        ap.energy_level, ap.status, ap.bio,
        ap.good_with_dogs, ap.good_with_cats, ap.good_with_kids,
        ap.foster_needed, ap.featured, ap.tags_json, ap.photo_url,
        ca.cdn_url AS asset_cdn_url, ca.public_url AS asset_public_url
      FROM animal_profiles ap
      LEFT JOIN cms_assets ca ON ca.asset_key = ap.id AND ca.tenant_id = ?
      WHERE ap.tenant_id = ?
        AND ap.public_visible = 1
        AND lower(ap.status) IN ('available', 'foster', 'pending')
      ORDER BY ap.featured DESC, ap.sort_order ASC, ap.updated_at DESC
    `).bind(TENANT, TENANT).all().catch(() => ({ results: [] }));

    const animals = (rows.results || [])
      .map(normalizePublicAnimal)
      .filter((a) => PUBLIC_ANIMAL_STATUSES.includes(a.status));

    return json({ animals, count: animals.length });
  }

  return null;
}
