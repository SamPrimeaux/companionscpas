/**
 * render_event_landing.js — reusable event landing section.
 *
 * ONE section_type ("event_landing") renders a full event page from data.
 *   cms_page_sections.config_json          = { campaign_id, event?: {...} }   (per-page overrides)
 *   fundraising_campaigns.config_json.event = { ...schema below }             (the event's content)
 *
 * Nothing in here is specific to one org or one event:
 *   - colors/fonts come from the brand tokens (--purple, --red-accent, --font-display, --font-body)
 *   - every block is omitted when its data is absent
 *   - ticket buttons use the site's existing donate modal (data-action="donate")
 *
 * event schema (all keys optional):
 *   kicker, where_line, title_accent, subtitle, tagline, intro, ornament ("stars"), facts[], poster_url,
 *   cta_label, secondary_label,
 *   schedule_title, schedule[{time,label,where}],
 *   tickets_eyebrow, tickets_title, tickets_intro, tickets[{key,label,price_cents,note,perk,cta}],
 *   pot{label,total,note},
 *   stops_eyebrow, stops_title, stops_intro, stops[{name,address,hours,tag}],
 *   rules_eyebrow, rules_title, rules[],
 *   references[{eyebrow,title,items[{name,desc}]}],
 *   why{eyebrow,quote,cards[{title,body}]},
 *   closing{title,body,cta},
 *   theme{ground,paper,ink}   (hex colors)
 */
import { escapeHtml, safeJson } from "./render_section.js";

function text(value) {
  return value == null ? "" : String(value).trim();
}

function esc(value) {
  return escapeHtml(value);
}

function hex(value, fallback = "") {
  const raw = text(value);
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw) ? raw : fallback;
}

function safeUrl(value, fallback = "") {
  const raw = text(value);
  if (!raw) return fallback;
  if (raw.startsWith("/")) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.toString();
  } catch {}
  return fallback;
}

function arr(value, max = 24) {
  return Array.isArray(value) ? value.filter((v) => v != null).slice(0, max) : [];
}

function money(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n) || n <= 0) return "";
  return "$" + (n / 100).toFixed(n % 100 ? 2 : 0);
}

function slug(value) {
  return text(value).replace(/[^a-z0-9_-]+/gi, "-") || "event";
}

async function loadCampaign(env, campaignId, tenantId) {
  if (!env?.DB || !campaignId) return null;
  const row = await env.DB.prepare(`
    SELECT fc.*,
           COALESCE(ca.public_url, ca.cdn_url, ca.pub_url) AS asset_cover_url
    FROM fundraising_campaigns fc
    LEFT JOIN cms_assets ca ON ca.id = fc.cover_asset_id
    WHERE fc.id = ? AND (? = '' OR fc.tenant_id = ? OR fc.organization_id = ?)
    LIMIT 1
  `).bind(campaignId, tenantId, tenantId, tenantId).first().catch(() => null);
  return row ? { ...row, config: safeJson(row.config_json, {}) } : null;
}

function titleWithAccent(title, accent) {
  const t = text(title);
  const a = text(accent);
  if (!a) return esc(t);
  const i = t.toLocaleLowerCase().indexOf(a.toLocaleLowerCase());
  if (i < 0) return esc(t);
  return `${esc(t.slice(0, i))}<em>${esc(t.slice(i, i + a.length))}</em>${esc(t.slice(i + a.length))}`;
}

const STAR = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7.3L12 17.8 5.7 21.5l1.7-7.3L2 9.5l7.1-.6L12 2z"/></svg>';

function css(S, theme) {
  const ground = hex(theme.ground)
    ? `--ev-ground:${hex(theme.ground)};`
    : "--ev-ground:#1a1024;--ev-ground:color-mix(in srgb,var(--purple,#7B2FBE) 16%,#0b0610);";
  const paper = hex(theme.paper, "#f7f2f9");
  const ink = hex(theme.ink, "#1a0a24");
  return `
${S}{--ev-primary:var(--purple,#7B2FBE);--ev-accent:var(--red-accent,#C8373A);${ground}--ev-paper:${paper};--ev-ink:${ink};--ev-muted:#5b4a66;--ev-soft:#f0e6fa;
  background:var(--ev-paper);color:var(--ev-ink);font-family:var(--font-body,'Inter',system-ui,sans-serif)}
${S} *{box-sizing:border-box}
${S} .ev-wrap{width:min(100%,1240px);margin:0 auto;padding:0 clamp(18px,4vw,32px)}
${S} .ev-eyebrow{margin:0;font-size:13px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ev-primary)}
${S} .ev-h2{margin:10px 0 0;color:var(--ev-ink);font-family:var(--font-display,'Playfair Display',Georgia,serif);font-weight:800;font-size:clamp(34px,4.6vw,60px);line-height:1.05;letter-spacing:-.02em}
${S} .ev-lede{max-width:640px;margin:14px 0 0;font-size:clamp(16px,1.4vw,18px);line-height:1.65;color:var(--ev-muted)}
${S} .ev-btn{min-height:52px;display:inline-flex;align-items:center;justify-content:center;padding:0 30px;border:1.5px solid transparent;border-radius:999px;font:inherit;font-size:16px;font-weight:700;text-decoration:none;cursor:pointer;transition:transform .15s,background .15s}
${S} .ev-btn:hover{transform:translateY(-1px)}
${S} .ev-btn--primary{background:var(--ev-accent);color:#fff}
${S} .ev-btn--solid{background:var(--ev-primary);color:#fff;width:100%}
${S} .ev-btn--ghost{border-color:rgba(255,255,255,.45);background:transparent;color:#fff}
${S} .ev-hero{background:var(--ev-ground);color:#fff;padding-top:clamp(40px,7vw,88px)}
${S} .ev-hero-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(32px,5vw,64px);align-items:center;padding-bottom:clamp(32px,5vw,56px)}
${S} .ev-hero-grid.ev-solo{grid-template-columns:minmax(0,1fr)}
${S} .ev-kickerrow{display:flex;flex-wrap:wrap;align-items:center;gap:12px;font-size:14px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--ev-soft)}
${S} .ev-badge{padding:7px 14px;border-radius:6px;background:var(--ev-accent);color:#fff}
${S} .ev-title{margin:26px 0 0;color:#fff;font-family:var(--font-display,'Playfair Display',Georgia,serif);font-weight:900;font-size:clamp(52px,8vw,112px);line-height:.95;letter-spacing:-.03em}
${S} .ev-title em{font-style:italic;color:var(--purple-light,#c47db0)}
${S} .ev-sub{display:flex;align-items:center;gap:16px;margin-top:12px;font-size:clamp(18px,2.2vw,28px);font-weight:800;letter-spacing:.3em;text-transform:uppercase}
${S} .ev-sub::after{content:"";flex:0 1 160px;height:2px;background:var(--ev-accent)}
${S} .ev-tagline{max-width:520px;margin:26px 0 0;font-family:var(--font-display,'Playfair Display',Georgia,serif);font-style:italic;font-weight:700;font-size:clamp(20px,2.4vw,26px);line-height:1.3;color:var(--ev-soft)}
${S} .ev-intro{max-width:540px;margin:14px 0 0;font-size:17px;line-height:1.65;color:#e6d9ee}
${S} .ev-actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:32px}
${S} .ev-facts{display:flex;flex-wrap:wrap;gap:10px 28px;margin:28px 0 0;padding:0;list-style:none;font-size:15px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ev-soft)}
${S} .ev-poster{margin:0;overflow:hidden;border-radius:22px;background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.45);transform:rotate(1.5deg)}
${S} .ev-poster img{display:block;width:100%;height:auto}
${S} .ev-stars{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;padding:0 20px 34px;color:var(--ev-accent)}
${S} .ev-stars svg{width:22px;height:22px}
${S} .ev-block{padding:clamp(48px,7vw,88px) 0}
${S} .ev-block--white{background:#fff}
${S} .ev-block--dark{background:var(--ev-ground);color:#fff}
${S} .ev-block--dark .ev-eyebrow{color:var(--purple-light,#c47db0)}
${S} .ev-block--dark .ev-lede{color:#e6d9ee}
${S} .ev-block--soft{background:var(--ev-soft)}
${S} .ev-schedule{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:24px;margin-top:22px}
${S} .ev-slot{padding-top:14px;border-top:4px solid var(--ev-primary)}
${S} .ev-slot-time{font-family:var(--font-display,'Playfair Display',Georgia,serif);font-weight:900;font-size:32px;line-height:1.1}
${S} .ev-slot-label{margin-top:8px;font-size:15px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ev-accent)}
${S} .ev-slot-where{margin-top:6px;font-size:15px;line-height:1.5;color:var(--ev-muted)}
${S} .ev-tickets-row{display:flex;flex-wrap:wrap;gap:28px;margin-top:40px;align-items:stretch}
${S} .ev-tickets{flex:1 1 620px;min-width:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px}
${S} .ev-ticket{display:flex;flex-direction:column;overflow:hidden;border-radius:18px;background:#fff;box-shadow:0 8px 28px rgba(26,10,36,.10)}
${S} .ev-ticket-top{flex:1;padding:26px 24px 20px}
${S} .ev-ticket-label{font-size:15px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--ev-accent)}
${S} .ev-ticket-price{margin-top:8px;font-family:var(--font-display,'Playfair Display',Georgia,serif);font-weight:900;font-size:68px;line-height:1;color:var(--ev-primary)}
${S} .ev-ticket-note{margin-top:12px;font-size:15px;line-height:1.5;color:var(--ev-muted)}
${S} .ev-ticket-perk{margin:0 18px;padding:14px 6px;border-top:2px dashed #d9c6e6;font-size:14px;font-weight:700}
${S} .ev-ticket-buy{padding:0 18px 20px}
${S} .ev-pot{flex:0 1 340px;min-width:260px;display:flex;flex-direction:column;gap:12px;padding:28px;border-radius:18px;background:var(--ev-ground);color:#fff}
${S} .ev-pot-total{font-family:var(--font-display,'Playfair Display',Georgia,serif);font-weight:900;font-size:52px;line-height:1.05;color:var(--purple-light,#c47db0)}
${S} .ev-pot p{margin:0;font-size:15px;line-height:1.6;color:#e6d9ee}
${S} .ev-stops{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px;margin-top:44px}
${S} .ev-stop{display:flex;flex-direction:column;gap:10px;padding:24px;border-radius:18px;background:#fff;color:var(--ev-ink)}
${S} .ev-stop-n{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:var(--ev-accent);color:#fff;font-size:20px;font-weight:800}
${S} .ev-stop-name{font-family:var(--font-display,'Playfair Display',Georgia,serif);font-weight:700;font-size:23px;line-height:1.2}
${S} .ev-stop-addr{font-size:15px;line-height:1.5;color:var(--ev-muted)}
${S} .ev-stop-hours{font-size:14px;font-weight:700;line-height:1.5}
${S} .ev-stop-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:10px}
${S} .ev-tag{padding:7px 12px;border-radius:999px;background:var(--ev-soft);color:#5a1f8c;font-size:13px;font-weight:700}
${S} .ev-dir{display:inline-flex;align-items:center;min-height:44px;color:var(--ev-primary);font-size:14px;font-weight:700;text-decoration:none}
${S} .ev-two{display:flex;flex-wrap:wrap;gap:48px;align-items:flex-start}
${S} .ev-col{flex:1 1 420px;min-width:0}
${S} .ev-rules{display:flex;flex-direction:column;gap:14px;margin:32px 0 0;padding:0;list-style:none;counter-reset:ev}
${S} .ev-rule{display:flex;gap:16px;align-items:flex-start;padding:18px 20px;border-radius:14px;background:#fff;box-shadow:0 4px 16px rgba(26,10,36,.06);font-size:16px;line-height:1.6}
${S} .ev-rule::before{counter-increment:ev;content:counter(ev);flex:none;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:var(--ev-primary);color:#fff;font-weight:800}
${S} .ev-ladder{margin:32px 0 0;padding:8px 24px;list-style:none;border-radius:18px;background:#fff;box-shadow:0 8px 28px rgba(26,10,36,.10);counter-reset:lad}
${S} .ev-rung{display:flex;align-items:center;gap:18px;padding:14px 0;border-bottom:1px solid #efe6f5}
${S} .ev-rung:last-child{border-bottom:0}
${S} .ev-rung::before{counter-increment:lad;content:counter(lad);flex:none;width:34px;font-size:26px;font-weight:800;color:var(--ev-accent)}
${S} .ev-rung-name{font-family:var(--font-display,'Playfair Display',Georgia,serif);font-weight:700;font-size:20px;line-height:1.2}
${S} .ev-rung-desc{margin-top:2px;font-size:14px;line-height:1.5;color:var(--ev-muted)}
${S} .ev-why{max-width:980px;margin:0 auto;text-align:center}
${S} .ev-quote{margin:18px 0 0;font-family:var(--font-display,'Playfair Display',Georgia,serif);font-style:italic;font-weight:700;font-size:clamp(24px,3vw,36px);line-height:1.35}
${S} .ev-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:44px;text-align:left}
${S} .ev-card{padding:24px;border-radius:16px;background:#fff}
${S} .ev-card h3{margin:0;font-size:16px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--ev-accent)}
${S} .ev-card p{margin:10px 0 0;font-size:16px;line-height:1.6}
${S} .ev-close{max-width:760px;margin:0 auto;text-align:center}
${S} .ev-close .ev-actions{justify-content:center}
@media(max-width:900px){${S} .ev-hero-grid{grid-template-columns:minmax(0,1fr)}${S} .ev-poster{transform:none}}
@media(max-width:640px){${S} .ev-actions .ev-btn{width:100%}}
`;
}

export async function renderEventLanding(section = {}, blocks = [], brand = {}, env = null) {
  const sectionConfig = safeJson(section?.config_json, {});
  const tenantId = text(section?.tenant_id);
  const campaignId = text(sectionConfig.campaign_id);
  const campaign = await loadCampaign(env, campaignId, tenantId);
  const campaignConfig = campaign?.config || {};
  const ev = { ...(campaignConfig.event || {}), ...(sectionConfig.event || {}) };

  const sectionKey = text(section.section_key) || "event_landing";
  const id = `ev-${slug(sectionKey)}`;
  const S = `#${id}`;

  const attachments = Array.isArray(campaignConfig.attachments) ? campaignConfig.attachments : [];
  const attachmentImage = attachments.find((a) => a?.type === "image" && a?.url)?.url;
  const poster = safeUrl(section.image_url || ev.poster_url || campaign?.asset_cover_url || campaignConfig.cover_url || attachmentImage);

  const heading = text(section.heading || campaign?.title) || "Event";
  const eyebrow = text(section.eyebrow);
  const tagline = text(ev.tagline || section.subheading);
  const intro = text(ev.intro || section.body);
  const facts = arr(ev.facts, 6).map(text).filter(Boolean);
  const schedule = arr(ev.schedule, 8);
  const tickets = arr(ev.tickets, 6).filter((t) => text(t?.label));
  const stops = arr(ev.stops, 12).filter((s) => text(s?.name));
  const rules = arr(ev.rules, 12).map(text).filter(Boolean);
  const references = arr(ev.references, 3);
  const why = ev.why && typeof ev.why === "object" ? ev.why : null;
  const closing = ev.closing && typeof ev.closing === "object" ? ev.closing : null;
  const pot = ev.pot && typeof ev.pot === "object" ? ev.pot : null;

  const campAttr = campaign?.id ? ` data-campaign-id="${esc(campaign.id)}"` : "";
  const ticketsId = `${id}-tickets`;
  const routeId = `${id}-route`;
  const primaryHref = tickets.length ? `#${ticketsId}` : "#";
  const primaryLabel = text(ev.cta_label || section.cta_label) || (tickets.length ? "Get tickets" : "Donate");
  const secondaryLabel = text(ev.secondary_label || section.cta_secondary_label) || "See the route";
  const level = Number(sectionConfig.heading_level) === 2 ? "h2" : "h1";

  const donateBtn = (label, opts = {}) => {
    const amount = opts.amount ? ` data-amount="${Number(opts.amount)}"` : "";
    const key = opts.key ? ` data-event-ticket="${esc(opts.key)}"` : "";
    return `<button type="button" class="ev-btn ${opts.cls || "ev-btn--primary"}" data-action="donate"${amount}${campAttr}${key}>${esc(label)}</button>`;
  };

  const hero = `
<div class="ev-hero">
  <div class="ev-wrap ev-hero-grid${poster ? "" : " ev-solo"}">
    <div>
      ${(text(ev.kicker) || text(ev.where_line) || eyebrow) ? `<div class="ev-kickerrow" data-cms-field="eyebrow">
        ${text(ev.kicker) ? `<span class="ev-badge">${esc(ev.kicker)}</span>` : ""}
        ${text(ev.where_line || eyebrow) ? `<span>${esc(ev.where_line || eyebrow)}</span>` : ""}
      </div>` : ""}
      <${level} class="ev-title" data-cms-field="heading">${titleWithAccent(heading, ev.title_accent)}</${level}>
      ${text(ev.subtitle) ? `<div class="ev-sub">${esc(ev.subtitle)}</div>` : ""}
      ${tagline ? `<p class="ev-tagline" data-cms-field="subheading">${esc(tagline)}</p>` : ""}
      ${intro ? `<p class="ev-intro">${esc(intro)}</p>` : ""}
      <div class="ev-actions">
        <a class="ev-btn ev-btn--primary" href="${esc(primaryHref)}">${esc(primaryLabel)}</a>
        ${stops.length ? `<a class="ev-btn ev-btn--ghost" href="#${esc(routeId)}">${esc(secondaryLabel)}</a>` : ""}
      </div>
      ${facts.length ? `<ul class="ev-facts">${facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
    </div>
    ${poster ? `<figure class="ev-poster"><img src="${esc(poster)}" alt="${esc(`${heading} flyer`)}" loading="eager" decoding="async"></figure>` : ""}
  </div>
  ${text(ev.ornament) === "stars" ? `<div class="ev-stars" aria-hidden="true">${Array.from({ length: 11 }, () => STAR).join("")}</div>` : ""}
</div>`;

  const scheduleHtml = schedule.length ? `
<div class="ev-block ev-block--white">
  <div class="ev-wrap">
    <p class="ev-eyebrow">${esc(text(ev.schedule_title) || "The day at a glance")}</p>
    <div class="ev-schedule">
      ${schedule.map((s) => `<div class="ev-slot">
        <div class="ev-slot-time">${esc(s?.time)}</div>
        <div class="ev-slot-label">${esc(s?.label)}</div>
        ${text(s?.where) ? `<div class="ev-slot-where">${esc(s.where)}</div>` : ""}
      </div>`).join("")}
    </div>
  </div>
</div>` : "";

  const ticketsHtml = tickets.length ? `
<div class="ev-block" id="${esc(ticketsId)}">
  <div class="ev-wrap">
    ${text(ev.tickets_eyebrow) ? `<p class="ev-eyebrow">${esc(ev.tickets_eyebrow)}</p>` : ""}
    <h2 class="ev-h2">${esc(text(ev.tickets_title) || "Tickets")}</h2>
    ${text(ev.tickets_intro) ? `<p class="ev-lede">${esc(ev.tickets_intro)}</p>` : ""}
    <div class="ev-tickets-row">
      <div class="ev-tickets">
        ${tickets.map((t) => {
          const price = money(t.price_cents);
          const label = text(t.cta) || (price ? `Pay ${price}` : "Choose");
          return `<div class="ev-ticket">
          <div class="ev-ticket-top">
            <div class="ev-ticket-label">${esc(t.label)}</div>
            ${price ? `<div class="ev-ticket-price">${esc(price)}</div>` : ""}
            ${text(t.note) ? `<div class="ev-ticket-note">${esc(t.note)}</div>` : ""}
          </div>
          ${text(t.perk) ? `<div class="ev-ticket-perk">${esc(t.perk)}</div>` : ""}
          <div class="ev-ticket-buy">${donateBtn(label, { amount: Number(t.price_cents) > 0 ? Number(t.price_cents) / 100 : 0, key: t.key, cls: "ev-btn--solid" })}</div>
        </div>`;
        }).join("")}
      </div>
      ${pot ? `<aside class="ev-pot">
        <p class="ev-eyebrow" style="color:var(--ev-soft)">${esc(text(pot.label) || "The pot")}</p>
        ${text(pot.total) ? `<div class="ev-pot-total">${esc(pot.total)}</div>` : ""}
        ${text(pot.note) ? `<p>${esc(pot.note)}</p>` : ""}
      </aside>` : ""}
    </div>
  </div>
</div>` : "";

  const stopsHtml = stops.length ? `
<div class="ev-block ev-block--dark" id="${esc(routeId)}">
  <div class="ev-wrap">
    ${text(ev.stops_eyebrow) ? `<p class="ev-eyebrow">${esc(ev.stops_eyebrow)}</p>` : ""}
    <h2 class="ev-h2">${esc(text(ev.stops_title) || "The route")}</h2>
    ${text(ev.stops_intro) ? `<p class="ev-lede">${esc(ev.stops_intro)}</p>` : ""}
    <div class="ev-stops">
      ${stops.map((s, i) => {
        const dir = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([text(s.name), text(s.address)].filter(Boolean).join(", "));
        return `<div class="ev-stop">
        <div class="ev-stop-n">${i + 1}</div>
        <div class="ev-stop-name">${esc(s.name)}</div>
        ${text(s.address) ? `<div class="ev-stop-addr">${esc(s.address)}</div>` : ""}
        ${text(s.hours) ? `<div class="ev-stop-hours">${esc(s.hours)}</div>` : ""}
        <div class="ev-stop-foot">
          ${text(s.tag) ? `<span class="ev-tag">${esc(s.tag)}</span>` : "<span></span>"}
          <a class="ev-dir" href="${esc(dir)}" target="_blank" rel="noopener noreferrer">Directions →</a>
        </div>
      </div>`;
      }).join("")}
    </div>
  </div>
</div>` : "";

  const rulesHtml = (rules.length || references.length) ? `
<div class="ev-block">
  <div class="ev-wrap ev-two">
    ${rules.length ? `<div class="ev-col">
      ${text(ev.rules_eyebrow) ? `<p class="ev-eyebrow">${esc(ev.rules_eyebrow)}</p>` : ""}
      <h2 class="ev-h2">${esc(text(ev.rules_title) || "The rules")}</h2>
      <ol class="ev-rules">${rules.map((r) => `<li class="ev-rule"><span>${esc(r)}</span></li>`).join("")}</ol>
    </div>` : ""}
    ${references.map((ref) => {
      const items = arr(ref?.items, 14).filter((it) => text(it?.name));
      if (!items.length) return "";
      return `<div class="ev-col">
      ${text(ref.eyebrow) ? `<p class="ev-eyebrow">${esc(ref.eyebrow)}</p>` : ""}
      <h2 class="ev-h2">${esc(text(ref.title) || "Good to know")}</h2>
      <ol class="ev-ladder">${items.map((it) => `<li class="ev-rung"><div><div class="ev-rung-name">${esc(it.name)}</div>${text(it.desc) ? `<div class="ev-rung-desc">${esc(it.desc)}</div>` : ""}</div></li>`).join("")}</ol>
    </div>`;
    }).join("")}
  </div>
</div>` : "";

  const whyHtml = why && (text(why.quote) || arr(why.cards).length) ? `
<div class="ev-block ev-block--soft">
  <div class="ev-wrap ev-why">
    ${text(why.eyebrow) ? `<p class="ev-eyebrow">${esc(why.eyebrow)}</p>` : ""}
    ${text(why.quote) ? `<p class="ev-quote">${esc(why.quote)}</p>` : ""}
    ${arr(why.cards, 4).length ? `<div class="ev-cards">${arr(why.cards, 4).map((c) => `<div class="ev-card"><h3>${esc(c?.title)}</h3><p>${esc(c?.body)}</p></div>`).join("")}</div>` : ""}
  </div>
</div>` : "";

  const closingHtml = closing && (text(closing.title) || text(closing.body)) ? `
<div class="ev-block ev-block--dark">
  <div class="ev-wrap ev-close">
    ${text(closing.title) ? `<h2 class="ev-h2">${esc(closing.title)}</h2>` : ""}
    ${text(closing.body) ? `<p class="ev-lede" style="margin-left:auto;margin-right:auto">${esc(closing.body)}</p>` : ""}
    <div class="ev-actions">
      ${tickets.length ? `<a class="ev-btn ev-btn--primary" href="${esc(primaryHref)}">${esc(primaryLabel)}</a>` : ""}
      ${text(closing.cta) ? donateBtn(closing.cta, { cls: "ev-btn--ghost" }) : ""}
    </div>
  </div>
</div>` : "";

  return `<section id="${esc(id)}" class="ev" data-section-key="${esc(sectionKey)}" data-cpas-section="${esc(sectionKey)}">
<style>${css(S, ev.theme && typeof ev.theme === "object" ? ev.theme : {})}</style>
${hero}
${scheduleHtml}
${ticketsHtml}
${stopsHtml}
${rulesHtml}
${whyHtml}
${closingHtml}
</section>`;
}
