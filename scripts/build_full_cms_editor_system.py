from pathlib import Path
import re

def write(path, content):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)
    print("wrote", path)

def patch_file(path, patches):
    p = Path(path)
    s = p.read_text()
    o = s
    for find, repl in patches:
        if find not in s:
            print("skip missing pattern", path, find[:80])
            continue
        s = s.replace(find, repl, 1)
    if s != o:
        p.write_text(s)
        print("patched", path)

cms_api = r'''
const TENANT_ID = "tenant_companionscpas";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function id(prefix = "cms") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

function safeJson(value, fallback) {
  try { return JSON.parse(value || ""); } catch { return fallback; }
}

export async function cmsRoutes(request, env, url, sessionUser = null) {
  const path = url.pathname;
  const method = request.method;

  if (!env.DB) return json({ error: "DB binding missing" }, 500);

  if (path === "/api/cms/bootstrap" && method === "GET") {
    const [pages, assets, brand, nav, themes] = await Promise.all([
      env.DB.prepare("SELECT * FROM cms_pages WHERE tenant_id = ? ORDER BY sort_order, route_path").bind(TENANT_ID).all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT * FROM cms_assets WHERE tenant_id = ? AND status != 'archived' ORDER BY updated_at DESC, created_at DESC LIMIT 200").bind(TENANT_ID).all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT * FROM cms_brand_settings WHERE tenant_id = ? LIMIT 1").bind(TENANT_ID).first().catch(() => null),
      env.DB.prepare("SELECT * FROM cms_navigation_items WHERE tenant_id = ? ORDER BY sort_order, label").bind(TENANT_ID).all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT * FROM cms_themes WHERE tenant_id = ? ORDER BY is_active DESC, updated_at DESC LIMIT 20").bind(TENANT_ID).all().catch(() => ({ results: [] })),
    ]);

    return json({
      success: true,
      tenant_id: TENANT_ID,
      pages: pages.results || [],
      assets: assets.results || [],
      brand,
      nav: nav.results || [],
      themes: themes.results || []
    });
  }

  if (path === "/api/cms/page" && method === "GET") {
    const route = url.searchParams.get("route") || "/";
    const page = await env.DB.prepare("SELECT * FROM cms_pages WHERE tenant_id = ? AND route_path = ? LIMIT 1")
      .bind(TENANT_ID, route).first();

    if (!page) return json({ error: "Page not found", route }, 404);

    const sections = await env.DB.prepare("SELECT * FROM cms_page_sections WHERE tenant_id = ? AND page_route = ? ORDER BY sort_order, section_key")
      .bind(TENANT_ID, route).all().catch(() => ({ results: [] }));

    const blocks = await env.DB.prepare("SELECT * FROM cms_page_content_blocks WHERE tenant_id = ? AND page_route = ? ORDER BY sort_order, section_key, block_key")
      .bind(TENANT_ID, route).all().catch(() => ({ results: [] }));

    return json({ success: true, page, sections: sections.results || [], blocks: blocks.results || [] });
  }

  if (path === "/api/cms/section/save" && method === "POST") {
    const data = await body(request);
    const section = data.section || data;

    const page_route = section.page_route || data.page_route || "/";
    const section_key = section.section_key || data.section_key || id("section");

    await env.DB.prepare(`
      INSERT INTO cms_page_sections
      (id, tenant_id, page_route, section_key, section_type, eyebrow, heading, subheading, body,
       image_url, cta_label, cta_href, cta_secondary_label, cta_secondary_href, sort_order,
       is_visible, config_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(tenant_id, page_route, section_key) DO UPDATE SET
        section_type = excluded.section_type,
        eyebrow = excluded.eyebrow,
        heading = excluded.heading,
        subheading = excluded.subheading,
        body = excluded.body,
        image_url = excluded.image_url,
        cta_label = excluded.cta_label,
        cta_href = excluded.cta_href,
        cta_secondary_label = excluded.cta_secondary_label,
        cta_secondary_href = excluded.cta_secondary_href,
        sort_order = excluded.sort_order,
        is_visible = excluded.is_visible,
        config_json = excluded.config_json,
        updated_at = datetime('now')
    `).bind(
      section.id || id("section"),
      TENANT_ID,
      page_route,
      section_key,
      section.section_type || "content",
      section.eyebrow || "",
      section.heading || section.title || "",
      section.subheading || "",
      section.body || "",
      section.image_url || "",
      section.cta_label || "",
      section.cta_href || "",
      section.cta_secondary_label || "",
      section.cta_secondary_href || "",
      Number(section.sort_order || 50),
      section.is_visible === 0 ? 0 : 1,
      typeof section.config_json === "string" ? section.config_json : JSON.stringify(section.config_json || {})
    ).run();

    await env.DB.prepare("UPDATE cms_pages SET status = 'draft', updated_at = datetime('now') WHERE tenant_id = ? AND route_path = ?")
      .bind(TENANT_ID, page_route).run().catch(() => {});

    return json({ success: true, page_route, section_key });
  }

  if (path === "/api/cms/block/save" && method === "POST") {
    const data = await body(request);
    const block = data.block || data;

    const page_route = block.page_route || data.page_route || "/";
    const section_key = block.section_key || data.section_key || "main";
    const block_key = block.block_key || data.block_key || id("block");

    await env.DB.prepare(`
      INSERT INTO cms_page_content_blocks
      (id, tenant_id, page_route, section_key, block_key, block_type, eyebrow, title, subtitle, body,
       image_url, alt_text, href, action_label, action_type, action_value, sort_order, is_visible,
       config_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(tenant_id, page_route, section_key, block_key) DO UPDATE SET
        block_type = excluded.block_type,
        eyebrow = excluded.eyebrow,
        title = excluded.title,
        subtitle = excluded.subtitle,
        body = excluded.body,
        image_url = excluded.image_url,
        alt_text = excluded.alt_text,
        href = excluded.href,
        action_label = excluded.action_label,
        action_type = excluded.action_type,
        action_value = excluded.action_value,
        sort_order = excluded.sort_order,
        is_visible = excluded.is_visible,
        config_json = excluded.config_json,
        updated_at = datetime('now')
    `).bind(
      block.id || id("block"),
      TENANT_ID,
      page_route,
      section_key,
      block_key,
      block.block_type || "text",
      block.eyebrow || "",
      block.title || "",
      block.subtitle || "",
      block.body || "",
      block.image_url || "",
      block.alt_text || "",
      block.href || "",
      block.action_label || "",
      block.action_type || "",
      block.action_value || "",
      Number(block.sort_order || 50),
      block.is_visible === 0 ? 0 : 1,
      typeof block.config_json === "string" ? block.config_json : JSON.stringify(block.config_json || {})
    ).run();

    return json({ success: true, page_route, section_key, block_key });
  }

  if (path === "/api/cms/page/save" && method === "POST") {
    const data = await body(request);
    const page = data.page || data;
    const route_path = page.route_path || "/";
    const slug = page.slug || (route_path === "/" ? "home" : route_path.replace(/^\//, ""));

    await env.DB.prepare(`
      INSERT INTO cms_pages
      (id, tenant_id, route_path, slug, title, status, seo_title, meta_description, og_image_url,
       page_type, template_key, sort_order, is_homepage, show_header, show_footer, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(tenant_id, route_path) DO UPDATE SET
        slug = excluded.slug,
        title = excluded.title,
        status = excluded.status,
        seo_title = excluded.seo_title,
        meta_description = excluded.meta_description,
        og_image_url = excluded.og_image_url,
        page_type = excluded.page_type,
        template_key = excluded.template_key,
        sort_order = excluded.sort_order,
        is_homepage = excluded.is_homepage,
        show_header = excluded.show_header,
        show_footer = excluded.show_footer,
        updated_at = datetime('now')
    `).bind(
      page.id || id("page"),
      TENANT_ID,
      route_path,
      slug,
      page.title || "Untitled Page",
      page.status || "draft",
      page.seo_title || page.title || "",
      page.meta_description || "",
      page.og_image_url || "",
      page.page_type || "standard",
      page.template_key || "default",
      Number(page.sort_order || 50),
      page.is_homepage ? 1 : 0,
      page.show_header === 0 ? 0 : 1,
      page.show_footer === 0 ? 0 : 1
    ).run();

    return json({ success: true, route_path });
  }

  if (path === "/api/cms/publish" && method === "POST") {
    const data = await body(request);
    const route = data.route_path || data.route || "/";

    await env.DB.prepare(`
      UPDATE cms_pages
      SET status = 'published',
          published_at = datetime('now'),
          updated_at = datetime('now'),
          published_by = ?
      WHERE tenant_id = ? AND route_path = ?
    `).bind(sessionUser?.email || sessionUser?.id || "dashboard", TENANT_ID, route).run();

    return json({
      success: true,
      route_path: route,
      preview_url: route === "/" ? "/" : route,
      message: "Page marked published. Static page regeneration can be wired after the client approves the build."
    });
  }

  return null;
}
'''

cms_view = r'''
function CMSView({ onNavigate }) {
  const { useEffect, useMemo, useState } = React;
  const [boot, setBoot] = useState({ pages:[], assets:[], nav:[], themes:[], brand:null });
  const [route, setRoute] = useState("/");
  const [pageData, setPageData] = useState({ page:null, sections:[], blocks:[] });
  const [selectedKey, setSelectedKey] = useState(null);
  const [mode, setMode] = useState("desktop");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const loadBoot = async () => {
    const res = await fetch("/api/cms/bootstrap", { credentials:"include" });
    const data = await res.json();
    if (data.success) setBoot(data);
  };

  const loadPage = async (nextRoute = route) => {
    const res = await fetch(`/api/cms/page?route=${encodeURIComponent(nextRoute)}`, { credentials:"include" });
    const data = await res.json();
    if (data.success) {
      setPageData(data);
      setSelectedKey((data.sections || [])[0]?.section_key || null);
    }
  };

  useEffect(() => { loadBoot(); }, []);
  useEffect(() => { loadPage(route); }, [route]);

  const pages = boot.pages?.length ? boot.pages : [
    { route_path:"/", title:"Homepage", status:"published" },
    { route_path:"/about", title:"About", status:"published" },
    { route_path:"/adopt", title:"Adopt", status:"published" },
    { route_path:"/services", title:"Services", status:"published" },
    { route_path:"/donate", title:"Donate", status:"published" },
  ];

  const selected = useMemo(
    () => (pageData.sections || []).find(s => s.section_key === selectedKey) || (pageData.sections || [])[0] || null,
    [pageData, selectedKey]
  );

  const setSelectedField = (key, val) => {
    if (!selected) return;
    setPageData(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.section_key === selected.section_key ? { ...s, [key]: val } : s)
    }));
  };

  const saveSection = async () => {
    if (!selected) return;
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch("/api/cms/section/save", {
        method:"POST",
        credentials:"include",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify({ section:selected })
      });
      const data = await res.json();
      setNotice(data.success ? "Saved draft section." : (data.error || "Save failed."));
      await loadBoot();
      await loadPage(route);
    } catch(e) {
      setNotice("Save failed: " + e.message);
    }
    setBusy(false);
  };

  const publishPage = async () => {
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch("/api/cms/publish", {
        method:"POST",
        credentials:"include",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify({ route_path:route })
      });
      const data = await res.json();
      setNotice(data.success ? "Published page status." : (data.error || "Publish failed."));
      await loadBoot();
      await loadPage(route);
    } catch(e) {
      setNotice("Publish failed: " + e.message);
    }
    setBusy(false);
  };

  const openPreview = () => window.open(route === "/" ? "/" : route, "_blank");

  const previewWidth = mode === "mobile" ? 390 : mode === "tablet" ? 760 : "100%";

  const pageTitle = pageData.page?.title || pages.find(p => p.route_path === route)?.title || "Page";

  const sectionCard = (s) => React.createElement("button", {
    key:s.section_key,
    onClick:()=>setSelectedKey(s.section_key),
    style:{
      width:"100%", textAlign:"left", padding:"12px 13px", borderRadius:14,
      border:`1px solid ${selectedKey===s.section_key ? C.primary : C.border}`,
      background:selectedKey===s.section_key ? "rgba(124,58,237,.22)" : C.card,
      color:C.text, cursor:"pointer", marginBottom:8
    }
  },
    React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center" }},
      React.createElement("b", { style:{ fontSize:13 } }, s.heading || s.title || s.section_key),
      React.createElement("span", { style:{ color:s.is_visible===0 ? C.textSec : C.good, fontSize:11 } }, s.is_visible===0 ? "Hidden" : "Visible")
    ),
    React.createElement("div", { style:{ color:C.textSec, fontSize:11, marginTop:5 } }, `${s.section_type || "section"} · ${s.section_key}`)
  );

  const emptyState = React.createElement(Card, { style:{ padding:30, textAlign:"center" }},
    React.createElement("h3", { style:{ margin:"0 0 8px" } }, "No sections yet"),
    React.createElement("p", { style:{ color:C.textSec, margin:0 } }, "Seed cms_page_sections or add a section template next.")
  );

  return React.createElement(Page, {
    title:"CMS Website",
    subtitle:"Shopify-style no-code editor for public pages, sections, assets, and publishing.",
    action: React.createElement("div", { style:{ display:"flex", gap:10 }},
      React.createElement(Btn,{variant:"secondary",size:"sm",icon:"eye",onClick:openPreview},"Preview Site"),
      React.createElement(Btn,{size:"sm",icon:"check2",onClick:publishPage,disabled:busy},"Publish Changes")
    )
  },
    notice && React.createElement("div", {
      style:{ marginBottom:14, padding:"10px 12px", border:`1px solid ${C.border}`, borderRadius:14, color:C.good, background:"rgba(0,212,143,.08)" }
    }, notice),

    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"260px minmax(420px, 1fr) 340px", gap:16, alignItems:"start" }},

      React.createElement(Card, { style:{ padding:12, position:"sticky", top:12 }},
        React.createElement("div",{style:{fontSize:11,letterSpacing:".12em",textTransform:"uppercase",color:C.textSec,fontWeight:800,margin:"6px 8px 12px"}},"Pages"),
        pages.map(p => React.createElement("button", {
          key:p.route_path,
          onClick:()=>setRoute(p.route_path),
          style:{
            width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"12px 11px", borderRadius:12, marginBottom:6,
            border:"1px solid transparent",
            background:p.route_path===route ? "rgba(124,58,237,.28)" : "transparent",
            color:p.route_path===route ? C.text : C.textSec,
            cursor:"pointer", fontWeight:700
          }
        },
          React.createElement("span", null, p.title),
          React.createElement("span", { style:{ fontSize:10, padding:"3px 7px", borderRadius:99, background:C.pill, color:C.textSec } }, p.status || "draft")
        )),

        React.createElement("div",{style:{height:1,background:C.border,margin:"14px 0"}}),
        React.createElement("div",{style:{fontSize:11,letterSpacing:".12em",textTransform:"uppercase",color:C.textSec,fontWeight:800,margin:"6px 8px 12px"}},"Sections"),
        (pageData.sections || []).length ? pageData.sections.map(sectionCard) : React.createElement("p",{style:{color:C.textSec,fontSize:12,padding:8}},"No editable sections found.")
      ),

      React.createElement("div", null,
        React.createElement(Card, { style:{ padding:14, marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }},
          React.createElement("div", null,
            React.createElement("div",{style:{fontSize:12,color:C.textSec}},"Currently editing"),
            React.createElement("h2",{style:{margin:"2px 0 0",fontSize:22}}, pageTitle)
          ),
          React.createElement("div",{style:{display:"flex",gap:8}},
            ["desktop","tablet","mobile"].map(m => React.createElement(Btn,{
              key:m, size:"sm", variant:mode===m ? "primary" : "secondary", onClick:()=>setMode(m)
            }, m[0].toUpperCase()+m.slice(1)))
          )
        ),

        React.createElement(Card, { style:{ padding:14, minHeight:560, overflow:"hidden" }},
          React.createElement("div", {
            style:{
              width:previewWidth, maxWidth:"100%", margin:"0 auto", minHeight:520,
              border:`1px solid ${C.border}`, borderRadius:22, overflow:"hidden",
              background:"linear-gradient(135deg,#090d16,#121b2b 55%,#102b34)"
            }
          },
            React.createElement("div",{style:{padding:18,borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}},
              React.createElement("img",{src:"/logo.png",style:{width:84,height:50,objectFit:"contain"}}),
              React.createElement("div",{style:{display:"flex",gap:16,color:C.textSec,fontWeight:800,fontSize:12}}, "Home", "About", "Adopt", "Donate")
            ),
            (pageData.sections || []).length ? pageData.sections.map(s => React.createElement("section", {
              key:s.section_key,
              onClick:()=>setSelectedKey(s.section_key),
              style:{
                padding:24, borderBottom:`1px solid ${C.border}`, cursor:"pointer",
                outline:selectedKey===s.section_key ? `2px solid ${C.primary}` : "none",
                background:selectedKey===s.section_key ? "rgba(124,58,237,.08)" : "transparent"
              }
            },
              s.eyebrow && React.createElement("div",{style:{color:"#ff4d5e",fontSize:11,fontWeight:900,letterSpacing:".18em",textTransform:"uppercase",marginBottom:10}},s.eyebrow),
              React.createElement("h1",{style:{fontSize:mode==="mobile"?32:46,lineHeight:".95",letterSpacing:"-.055em",margin:"0 0 12px"}},s.heading || s.title || s.section_key),
              s.subheading && React.createElement("p",{style:{fontSize:18,color:"#c7c6d6",lineHeight:1.5,maxWidth:720}},s.subheading),
              s.body && React.createElement("p",{style:{color:"#a9a7bd",lineHeight:1.6,maxWidth:740}},s.body),
              s.image_url && React.createElement("img",{src:s.image_url,style:{width:"100%",maxHeight:260,objectFit:"cover",borderRadius:20,marginTop:14}}),
              (s.cta_label || s.cta_secondary_label) && React.createElement("div",{style:{display:"flex",gap:10,marginTop:16}},
                s.cta_label && React.createElement("span",{style:{padding:"10px 14px",borderRadius:12,background:C.primary,color:"#fff",fontWeight:800}},s.cta_label),
                s.cta_secondary_label && React.createElement("span",{style:{padding:"10px 14px",borderRadius:12,background:C.card,border:`1px solid ${C.border}`,fontWeight:800}},s.cta_secondary_label)
              )
            )) : emptyState
          )
        )
      ),

      React.createElement(Card, { style:{ padding:16, position:"sticky", top:12 }},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}},
          React.createElement("div", null,
            React.createElement("div",{style:{fontSize:11,color:C.textSec,textTransform:"uppercase",letterSpacing:".12em",fontWeight:900}},"Inspector"),
            React.createElement("h3",{style:{margin:"4px 0 0"}}, selected ? (selected.heading || selected.section_key) : "Select section")
          ),
          selected && React.createElement("label",{style:{fontSize:12,color:C.textSec,display:"flex",gap:6,alignItems:"center"}},
            React.createElement("input",{type:"checkbox",checked:selected.is_visible!==0,onChange:e=>setSelectedField("is_visible",e.target.checked?1:0)}),
            "Visible"
          )
        ),

        selected ? React.createElement("div", { style:{ display:"grid", gap:10 }},
          Field("Eyebrow", selected.eyebrow || "", v=>setSelectedField("eyebrow",v)),
          Field("Heading", selected.heading || selected.title || "", v=>setSelectedField("heading",v)),
          Field("Subheading", selected.subheading || "", v=>setSelectedField("subheading",v)),
          TextArea("Body", selected.body || "", v=>setSelectedField("body",v)),
          Field("Image URL", selected.image_url || "", v=>setSelectedField("image_url",v)),
          Field("Primary CTA Label", selected.cta_label || "", v=>setSelectedField("cta_label",v)),
          Field("Primary CTA Link", selected.cta_href || "", v=>setSelectedField("cta_href",v)),
          Field("Secondary CTA Label", selected.cta_secondary_label || "", v=>setSelectedField("cta_secondary_label",v)),
          Field("Secondary CTA Link", selected.cta_secondary_href || "", v=>setSelectedField("cta_secondary_href",v)),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:6}},
            React.createElement(Btn,{variant:"secondary",icon:"eye",onClick:openPreview},"Preview"),
            React.createElement(Btn,{icon:"check2",onClick:saveSection,disabled:busy},busy?"Saving...":"Save Draft")
          ),
          React.createElement("button",{
            onClick:()=>window.dispatchEvent(new Event("agentsam:open")),
            style:{marginTop:8,padding:12,borderRadius:14,border:`1px solid ${C.border}`,background:"rgba(124,58,237,.12)",color:C.text,fontWeight:800,cursor:"pointer"}
          },"Ask Agent Sam to improve this section")
        ) : React.createElement("p",{style:{color:C.textSec}},"Select a section from the left or center preview.")
      )
    )
  );
}

function Field(label, value, onChange) {
  return React.createElement("label", { style:{ display:"grid", gap:6, color:C.textSec, fontSize:12, fontWeight:800 }},
    label,
    React.createElement("input", {
      value:value || "",
      onChange:e=>onChange(e.target.value),
      style:{ width:"100%", padding:"11px 12px", borderRadius:12, border:`1px solid ${C.border}`, background:C.input, color:C.text, outline:"none" }
    })
  );
}

function TextArea(label, value, onChange) {
  return React.createElement("label", { style:{ display:"grid", gap:6, color:C.textSec, fontSize:12, fontWeight:800 }},
    label,
    React.createElement("textarea", {
      value:value || "",
      rows:5,
      onChange:e=>onChange(e.target.value),
      style:{ width:"100%", padding:"11px 12px", borderRadius:12, border:`1px solid ${C.border}`, background:C.input, color:C.text, outline:"none", resize:"vertical", fontFamily:"inherit" }
    })
  );
}

window.CMSView = CMSView;
'''

agentsam_seed = r'''
INSERT OR REPLACE INTO agentsam_mcp_tools
(id, tenant_id, tool_key, tool_name, display_name, tool_category, description, input_schema, output_schema, intent_tags, modes_json, handler_type, handler_config, provider, requires_auth, requires_secret_keys, safety_level, is_enabled, sort_order)
VALUES
('tool_cms_update_section','tenant_companionscpas','cms_update_section','cms_update_section','Update CMS Section','cms','Updates editable CMS section content for a draft page.',
'{"type":"object","required":["page_route","section_key"],"properties":{"page_route":{"type":"string"},"section_key":{"type":"string"},"heading":{"type":"string"},"subheading":{"type":"string"},"body":{"type":"string"},"cta_label":{"type":"string"},"cta_href":{"type":"string"}}}',
'{"type":"object","properties":{"success":{"type":"boolean"}}}',
'["cms","website","section","edit"]','["agent","debug"]','http','{"method":"POST","path":"/api/cms/section/save"}','internal',1,'[]','standard',1,10),

('tool_cms_update_block','tenant_companionscpas','cms_update_block','cms_update_block','Update CMS Block','cms','Updates repeatable CMS blocks such as cards, stories, animals, or impact items.',
'{"type":"object","required":["page_route","section_key","block_key"],"properties":{"page_route":{"type":"string"},"section_key":{"type":"string"},"block_key":{"type":"string"},"title":{"type":"string"},"body":{"type":"string"},"image_url":{"type":"string"},"action_label":{"type":"string"},"action_value":{"type":"string"}}}',
'{"type":"object","properties":{"success":{"type":"boolean"}}}',
'["cms","website","block","edit"]','["agent","debug"]','http','{"method":"POST","path":"/api/cms/block/save"}','internal',1,'[]','standard',1,20),

('tool_cms_publish_page','tenant_companionscpas','cms_publish_page','cms_publish_page','Publish CMS Page','cms','Publishes a CMS page after human approval.',
'{"type":"object","required":["route_path"],"properties":{"route_path":{"type":"string"}}}',
'{"type":"object","properties":{"success":{"type":"boolean"},"preview_url":{"type":"string"}}}',
'["cms","website","publish"]','["agent","debug"]','http','{"method":"POST","path":"/api/cms/publish"}','internal',1,'[]','high',1,30);

INSERT OR REPLACE INTO agentsam_commands
(id, tenant_id, command_key, command_name, command_category, description, prompt_template, input_schema, output_schema, allowed_roles, allowed_modes, provider_strategy, default_model, is_enabled, safety_level, sort_order)
VALUES
('cmd_cms_rewrite_section','tenant_companionscpas','cms_rewrite_section','Rewrite CMS Section','cms','Improve a selected page section for clarity, warmth, and conversion without changing facts.',
'Rewrite this CMS section for Companions of CPAS. Keep it truthful, warm, local, and action-oriented. Preserve EIN/contact facts. Return draft copy only.',
'{"type":"object","properties":{"page_route":{"type":"string"},"section_key":{"type":"string"},"current_copy":{"type":"string"}}}',
'{"type":"object","properties":{"draft_copy":{"type":"string"}}}',
'["owner","developer","admin"]','["ask","plan","agent"]','auto',NULL,1,'standard',10),

('cmd_cms_conversion_review','tenant_companionscpas','cms_conversion_review','Review Page Conversion','cms','Reviews a public page for adoption, foster, and donation conversion improvements.',
'Review this page for nonprofit conversion. Suggest concise improvements for adoption, fostering, donations, trust, and accessibility.',
'{"type":"object","properties":{"page_route":{"type":"string"},"page_content":{"type":"string"}}}',
'{"type":"object","properties":{"recommendations":{"type":"array"}}}',
'["owner","developer","admin"]','["ask","plan","agent"]','auto',NULL,1,'standard',20);

INSERT OR REPLACE INTO agentsam_mcp_workflows
(id, tenant_id, workflow_key, workflow_name, description, steps_json, trigger_type, allowed_roles, execution_mode, retry_policy, safety_level, is_enabled, requires_human_approval, max_tool_calls, max_estimated_cost_usd)
VALUES
('wf_cms_assisted_edit','tenant_companionscpas','cms_assisted_edit','Assisted CMS Edit','Agent Sam drafts copy, saves it to a CMS section, and waits for human publish approval.',
'[{"step_key":"review_section","tool_key":"llm.generate"},{"step_key":"save_section","tool_key":"cms_update_section"},{"step_key":"request_approval","tool_key":"approval.request"}]',
'manual','["owner","developer","admin"]','sequential','{"retries":1}','standard',1,1,6,0.05),

('wf_cms_publish_after_approval','tenant_companionscpas','cms_publish_after_approval','Publish CMS Page After Approval','Publishes a CMS page only after a human approves the draft.',
'[{"step_key":"verify_page","tool_key":"cms_update_section"},{"step_key":"publish_page","tool_key":"cms_publish_page"}]',
'manual','["owner","developer","admin"]','sequential','{"retries":1}','high',1,1,4,0.03);
'''

write("src/api/cms_api.js", cms_api.strip() + "\n")
write("public/dashboard/js/view-cms.jsx", cms_view.strip() + "\n")
write("db/seed_agentsam_cms_tools.sql", agentsam_seed.strip() + "\n")

# Patch src/index.js imports/routes
idx = Path("src/index.js")
s = idx.read_text()
if "cms_api.js" not in s:
    s = s.replace("import { agentsamRoutes } from './api/agentsam_api.js';", "import { agentsamRoutes } from './api/agentsam_api.js';\nimport { cmsRoutes } from './api/cms_api.js';")
if 'url.pathname.startsWith("/api/cms/")' not in s:
    s = s.replace(
'''    if (url.pathname.startsWith("/api/agentsam/")) {
      const agentResult = await agentsamRoutes(request, env, url, session);
      if (agentResult) return agentResult;
    }''',
'''    if (url.pathname.startsWith("/api/agentsam/")) {
      const agentResult = await agentsamRoutes(request, env, url, session);
      if (agentResult) return agentResult;
    }

    if (url.pathname.startsWith("/api/cms/")) {
      const cmsResult = await cmsRoutes(request, env, url, session);
      if (cmsResult) return cmsResult;
    }'''
    )
idx.write_text(s)
print("patched src/index.js")

# Patch dashboard script tags
for html in ["public/dashboard.html", "public/dashboard/index.html"]:
    p = Path(html)
    if not p.exists(): continue
    h = p.read_text()
    if "/dashboard/js/view-cms.jsx" not in h:
        h = h.replace(
            '<script type="text/babel" src="/dashboard/js/view-admin.jsx"></script>',
            '<script type="text/babel" src="/dashboard/js/view-admin.jsx"></script>\n<script type="text/babel" src="/dashboard/js/view-cms.jsx"></script>'
        )
        p.write_text(h)
        print("patched", html)

print("done: CMS editor system files installed")
