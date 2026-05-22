from pathlib import Path
import re

root = Path(".")
js_dir = root / "public/dashboard/js"
api_dir = root / "src/api"
db_dir = root / "db"
js_dir.mkdir(parents=True, exist_ok=True)
api_dir.mkdir(parents=True, exist_ok=True)
db_dir.mkdir(parents=True, exist_ok=True)

# 1) DB alignment
(db_dir / "agentsam_drawer_bootstrap.sql").write_text(r'''
CREATE TABLE IF NOT EXISTS agentsam_sessions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  user_id TEXT,
  session_title TEXT DEFAULT 'Dashboard Assistant',
  route_path TEXT,
  mode TEXT DEFAULT 'ask',
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS agentsam_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_companionscpas',
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(session_id) REFERENCES agentsam_sessions(id)
);

INSERT OR IGNORE INTO agentsam_ai_models
(id, provider, model_key, display_name, role, runtime, base_url, is_local, is_enabled, priority, notes)
VALUES
('model_workers_gemma_4_26b','workers_ai','@cf/google/gemma-4-26b-a4b-it','Workers AI Gemma 4 26B','fallback','cloudflare_workers_ai',NULL,0,1,20,'Low-cost/free-tier dashboard assistant fallback.'),
('model_openai_gpt_4_1_mini','openai','gpt-4.1-mini','GPT-4.1 Mini','fast_reasoning','openai_responses',NULL,0,1,40,'Fast assistant, CMS, email, and dashboard support.'),
('model_openai_gpt_4_1','openai','gpt-4.1','GPT-4.1','long_context','openai_responses',NULL,0,1,50,'Long-context planning and structured analysis.'),
('model_openai_gpt_5_4_nano','openai','gpt-5.4-nano','GPT-5.4 Nano','fast_reasoning','openai_responses',NULL,0,1,35,'Fast low-cost OpenAI fallback.'),
('model_openai_gpt_5_4_pro','openai','gpt-5.4-pro','GPT-5.4 Pro','agent','openai_responses',NULL,0,1,80,'Heavy agent/debug workflow when approved.'),
('model_openai_gpt_image_2','openai','gpt-image-2','GPT Image 2','image_generation','openai_images',NULL,0,1,70,'Campaign, social, and website image generation.'),
('model_anthropic_haiku_4_5','anthropic','claude-haiku-4.5','Claude Haiku 4.5','fast_reasoning','anthropic',NULL,0,1,45,'Fast drafting/planning fallback.'),
('model_anthropic_opus_4_7','anthropic','claude-opus-4.7','Claude Opus 4.7','deep_reasoning','anthropic',NULL,0,1,90,'High-quality reasoning when explicitly enabled.'),
('model_gemini_flash_lite','google','gemini-3.1-flash-lite','Gemini 3.1 Flash Lite','fast_reasoning','google',NULL,0,1,30,'Fast lightweight fallback.'),
('model_gemini_flash','google','gemini-3-flash','Gemini 3 Flash','fast_reasoning','google',NULL,0,1,42,'General assistant fallback.'),
('model_gemini_pro','google','gemini-3.1-pro','Gemini 3.1 Pro','deep_reasoning','google',NULL,0,1,75,'Long-context planning/test model.'),
('model_local_ollama_qwen','ollama','qwen2.5-coder:7b','Local Qwen 2.5 Coder 7B','local_dev','local_ollama','http://127.0.0.1:11434',1,1,10,'Local dev/coding assistant when bridge is available.');

INSERT OR IGNORE INTO agentsam_commands
(id, tenant_id, command_key, command_name, command_category, description, prompt_template, provider_strategy, default_model, safety_level, sort_order)
VALUES
('cmd_cpas_review_applications','tenant_companionscpas','review_foster_applications','Review Foster Applications','applications','Summarize new foster applications, flag follow-ups, and draft professional responses.','Review the latest CPAS foster applications and recommend next actions.','auto','gpt-4.1-mini','standard',10),
('cmd_cpas_write_campaign','tenant_companionscpas','write_fundraising_campaign','Write Fundraising Campaign','fundraising','Create donor-facing campaign copy, email copy, and social content.','Create a fundraising campaign for Companions of CPAS.','auto','gpt-4.1-mini','standard',20),
('cmd_cpas_update_website','tenant_companionscpas','update_website_content','Update Website Content','cms','Help edit CMS-driven website copy and page sections.','Help update the Companions of CPAS website content.','auto','gpt-4.1','approval_required',30),
('cmd_cpas_generate_social','tenant_companionscpas','generate_social_post','Generate Social Post','social','Generate captions and image prompts for Facebook/Instagram.','Generate social media content for Companions of CPAS.','auto','gpt-4.1-mini','standard',40);

INSERT OR IGNORE INTO agentsam_mcp_workflows
(id, tenant_id, workflow_key, workflow_name, description, steps_json, trigger_type, allowed_roles, model_policy_json, budget_policy_json, safety_level, max_estimated_cost_usd, requires_human_approval)
VALUES
('wf_cpas_application_response','tenant_companionscpas','foster_application_response','Foster Application Response','Review a foster application, create internal notes, and draft a Resend email response.',
 '[{"step_key":"summarize_application","tool_key":"db.read.cpas_foster_applications"},{"step_key":"draft_email","tool_key":"email.resend.draft"},{"step_key":"log_event","tool_key":"db.write.cpas_application_events"}]',
 'manual','["owner","developer","admin"]',
 '{"default":"gpt-4.1-mini","fallback":["@cf/google/gemma-4-26b-a4b-it","gpt-5.4-nano"]}',
 '{"max_estimated_cost_usd":0.05,"max_total_tokens":8000,"max_workers_ai_neurons":200000}',
 'standard',0.05,0),

('wf_cpas_campaign_assistant','tenant_companionscpas','campaign_assistant','Campaign Assistant','Generate fundraiser copy, donor email, and social post drafts.',
 '[{"step_key":"analyze_need","tool_key":"db.read.fundraising_campaigns"},{"step_key":"write_copy","tool_key":"llm.generate"},{"step_key":"save_todo","tool_key":"db.write.agentsam_todo"}]',
 'manual','["owner","developer","admin"]',
 '{"default":"gpt-4.1-mini","fallback":["@cf/google/gemma-4-26b-a4b-it"]}',
 '{"max_estimated_cost_usd":0.05,"max_total_tokens":8000}',
 'standard',0.05,0);
''')

# 2) Backend API
(api_dir / "agentsam_api.js").write_text(r'''
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

function sse(data, event = "message") {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function readJson(request) {
  try { return await request.json(); } catch { return {}; }
}

function pickModel(mode) {
  if (mode === "debug") return { provider:"openai", model:"gpt-4.1" };
  if (mode === "agent") return { provider:"openai", model:"gpt-4.1-mini" };
  if (mode === "plan") return { provider:"openai", model:"gpt-4.1-mini" };
  return { provider:"workers_ai", model:"@cf/google/gemma-4-26b-a4b-it" };
}

async function getRecentContext(env) {
  const animals = await env.DB.prepare(`
    SELECT name, status, species, breed, bio
    FROM animal_profiles
    WHERE tenant_id='tenant_companionscpas'
    ORDER BY updated_at DESC
    LIMIT 8
  `).all().catch(() => ({ results: [] }));

  const apps = await env.DB.prepare(`
    SELECT first_name, last_name, email, review_status, submitted_at, internal_notes
    FROM cpas_foster_applications
    ORDER BY submitted_at DESC
    LIMIT 5
  `).all().catch(() => ({ results: [] }));

  const fosters = await env.DB.prepare(`
    SELECT f.foster_name, f.status, f.foster_type, a.name AS animal_name
    FROM foster_records f
    LEFT JOIN animal_profiles a ON a.id=f.animal_id
    ORDER BY f.created_at DESC
    LIMIT 5
  `).all().catch(() => ({ results: [] }));

  return { animals: animals.results || [], applications: apps.results || [], fosters: fosters.results || [] };
}

async function runOpenAI(env, prompt, mode, context) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  const { model } = pickModel(mode);
  const chosen = model.startsWith("gpt-") ? model : "gpt-4.1-mini";

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: chosen,
      input: [
        {
          role: "system",
          content: "You are Agent Sam for Companions of CPAS. Be practical, concise, professional, nonprofit-aware, and action-oriented. Help manage foster applications, animals, fundraising, CMS copy, and operational tasks. Never claim you completed external actions unless a tool/API actually did it."
        },
        {
          role: "user",
          content: `Dashboard context:\n${JSON.stringify(context, null, 2)}\n\nUser request:\n${prompt}`
        }
      ]
    })
  });

  if (!res.ok) throw new Error(`OpenAI failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.output_text || data.output?.map(o => o.content?.map(c => c.text).join("\n")).join("\n") || "I processed that request.";
}

async function runWorkersAI(env, prompt, mode, context) {
  if (!env.AI) throw new Error("Workers AI binding missing");
  const model = "@cf/google/gemma-4-26b-a4b-it";
  const result = await env.AI.run(model, {
    messages: [
      {
        role: "system",
        content: "You are Agent Sam for Companions of CPAS. Be concise, practical, and professional."
      },
      {
        role: "user",
        content: `Context:\n${JSON.stringify(context).slice(0, 7000)}\n\nRequest:\n${prompt}`
      }
    ]
  });
  return result.response || result.text || JSON.stringify(result);
}

export async function agentsamRoutes(request, env, url, sessionUser = null) {
  const path = url.pathname;

  if (path === "/api/agentsam/bootstrap" && request.method === "GET") {
    const commands = await env.DB.prepare(`
      SELECT command_key, command_name, command_category, description, safety_level
      FROM agentsam_commands
      WHERE tenant_id='tenant_companionscpas' AND is_enabled=1
      ORDER BY sort_order ASC
      LIMIT 50
    `).all().catch(() => ({ results: [] }));

    const models = await env.DB.prepare(`
      SELECT provider, model_key, display_name, role, runtime, is_local, is_enabled, priority
      FROM agentsam_ai_models
      WHERE is_enabled=1
      ORDER BY priority ASC
      LIMIT 50
    `).all().catch(() => ({ results: [] }));

    return json({ commands: commands.results || [], models: models.results || [] });
  }

  if (path === "/api/agentsam/chat" && request.method === "POST") {
    const body = await readJson(request);
    const prompt = String(body.prompt || "").trim();
    const mode = String(body.mode || "ask");
    const routePath = String(body.route_path || "/dashboard");

    if (!prompt) return json({ error: "Prompt required" }, 400);

    const runId = crypto.randomUUID();
    const sessionId = body.session_id || crypto.randomUUID();
    const started = Date.now();

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (payload, event = "message") => controller.enqueue(enc.encode(sse(payload, event)));

        try {
          send({ run_id: runId, status: "started", mode }, "status");
          send({ title: "Reading dashboard context", status: "running" }, "step");

          await env.DB.prepare(`
            INSERT OR IGNORE INTO agentsam_sessions (id, tenant_id, user_id, route_path, mode, updated_at)
            VALUES (?, 'tenant_companionscpas', ?, ?, ?, datetime('now'))
          `).bind(sessionId, sessionUser?.id || sessionUser?.user_id || null, routePath, mode).run().catch(() => {});

          await env.DB.prepare(`
            INSERT INTO agentsam_messages (id, session_id, tenant_id, role, content)
            VALUES (?, ?, 'tenant_companionscpas', 'user', ?)
          `).bind(crypto.randomUUID(), sessionId, prompt).run().catch(() => {});

          const context = await getRecentContext(env);
          send({ title: "Selecting model", status: "running" }, "step");

          let provider = "workers_ai";
          let model_key = "@cf/google/gemma-4-26b-a4b-it";
          let answer = "";

          try {
            if (mode === "ask") {
              answer = await runWorkersAI(env, prompt, mode, context);
            } else {
              provider = "openai";
              model_key = mode === "debug" ? "gpt-4.1" : "gpt-4.1-mini";
              answer = await runOpenAI(env, prompt, mode, context);
            }
          } catch (err) {
            send({ title: "Primary model unavailable, using fallback", status: "running", detail: String(err.message || err) }, "step");
            provider = "openai";
            model_key = "gpt-4.1-mini";
            answer = await runOpenAI(env, prompt, mode, context);
          }

          send({ title: "Writing response", status: "running" }, "step");

          await env.DB.prepare(`
            INSERT INTO agentsam_messages (id, session_id, tenant_id, role, content, metadata_json)
            VALUES (?, ?, 'tenant_companionscpas', 'assistant', ?, ?)
          `).bind(crypto.randomUUID(), sessionId, answer, JSON.stringify({ provider, model_key, run_id: runId })).run().catch(() => {});

          await env.DB.prepare(`
            INSERT INTO agentsam_analytics
            (id, tenant_id, user_id, session_id, run_group_id, provider, model_key, runtime_location, mode, status, latency_ms, input_chars, output_chars, metadata_json, started_at, completed_at)
            VALUES (?, 'tenant_companionscpas', ?, ?, ?, ?, ?, 'cloudflare', ?, 'completed', ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).bind(
            crypto.randomUUID(),
            sessionUser?.id || sessionUser?.user_id || null,
            sessionId,
            runId,
            provider,
            model_key,
            mode,
            Date.now() - started,
            prompt.length,
            answer.length,
            JSON.stringify({ route_path: routePath })
          ).run().catch(() => {});

          send({ content: answer, provider, model_key, session_id: sessionId }, "answer");
          send({ run_id: runId, status: "completed" }, "done");
        } catch (err) {
          await env.DB.prepare(`
            INSERT INTO agentsam_analytics
            (id, tenant_id, user_id, session_id, run_group_id, provider, model_key, mode, status, latency_ms, error_message, started_at, completed_at)
            VALUES (?, 'tenant_companionscpas', ?, ?, ?, 'system', 'none', ?, 'failed', ?, ?, datetime('now'), datetime('now'))
          `).bind(crypto.randomUUID(), sessionUser?.id || null, sessionId, runId, mode, Date.now() - started, String(err.message || err)).run().catch(() => {});
          send({ error: String(err.message || err) }, "error");
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });
  }

  return null;
}
''')

# 3) Frontend Agent drawer
(js_dir / "agentsam.jsx").write_text(r'''
function AgentSamDrawer() {
  const [open, setOpen] = React.useState(true);
  const [mode, setMode] = React.useState("ask");
  const [prompt, setPrompt] = React.useState("");
  const [messages, setMessages] = React.useState([
    { role:"assistant", content:"Agent Sam is ready. I can help review applications, draft donor updates, improve animal bios, plan campaigns, and guide CMS edits." }
  ]);
  const [steps, setSteps] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [sessionId, setSessionId] = React.useState(null);

  async function sendPrompt() {
    const text = prompt.trim();
    if (!text || busy) return;
    setPrompt("");
    setBusy(true);
    setMessages(m => [...m, { role:"user", content:text }]);
    setSteps([]);

    try {
      const res = await fetch("/api/agentsam/chat", {
        method:"POST",
        credentials:"include",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ prompt:text, mode, session_id:sessionId, route_path:location.pathname + location.search })
      });

      if (!res.ok || !res.body) throw new Error("Agent Sam request failed.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream:true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const eventLine = chunk.split("\n").find(l => l.startsWith("event:"));
          const dataLine = chunk.split("\n").find(l => l.startsWith("data:"));
          if (!dataLine) continue;

          const event = eventLine ? eventLine.replace("event:", "").trim() : "message";
          const data = JSON.parse(dataLine.replace("data:", "").trim());

          if (event === "step") setSteps(s => [...s, data]);
          if (event === "answer") {
            if (data.session_id) setSessionId(data.session_id);
            setMessages(m => [...m, { role:"assistant", content:data.content, meta:`${data.provider} · ${data.model_key}` }]);
          }
          if (event === "error") setMessages(m => [...m, { role:"assistant", content:`Agent Sam hit an error: ${data.error}` }]);
        }
      }
    } catch (err) {
      setMessages(m => [...m, { role:"assistant", content:String(err.message || err) }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return React.createElement("aside", { style:{ width:56, borderLeft:`1px solid ${C.border}`, background:C.bg2, display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:18 } },
      React.createElement("button", {
        onClick:()=>setOpen(true),
        title:"Open Agent Sam",
        style:{ width:38, height:38, borderRadius:12, border:`1px solid ${C.border}`, background:C.raised, color:C.purple, cursor:"pointer" }
      }, React.createElement(Icon, { name:"sparkles", size:18 }))
    );
  }

  return React.createElement("aside", { style:{ width:330, borderLeft:`1px solid ${C.border}`, background:C.bg2, display:"flex", flexDirection:"column", minHeight:0 } },
    React.createElement("div", { style:{ padding:16, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 } },
      React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:10 } },
        React.createElement("div", { style:{ width:34, height:34, borderRadius:12, background:"linear-gradient(135deg,#7c3aed,#a78bfa)", display:"grid", placeItems:"center", color:"#fff" } },
          React.createElement(Icon, { name:"sparkles", size:17 })
        ),
        React.createElement("div", null,
          React.createElement("div", { style:{ fontWeight:800, color:C.text } }, "Agent Sam"),
          React.createElement("div", { style:{ fontSize:11, color:C.textSec } }, busy ? "Working..." : "Dashboard assistant")
        )
      ),
      React.createElement("button", { onClick:()=>setOpen(false), style:{ background:"transparent", border:"none", color:C.textSec, cursor:"pointer" } },
        React.createElement(Icon, { name:"panel-right-close", size:18 })
      )
    ),

    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, padding:12, borderBottom:`1px solid ${C.border}` } },
      ["ask","plan","agent","debug"].map(m =>
        React.createElement("button", {
          key:m,
          onClick:()=>setMode(m),
          style:{ padding:"8px 0", borderRadius:10, border:`1px solid ${mode===m ? C.purple : C.border}`, background:mode===m ? "rgba(124,58,237,.18)" : C.raised, color:mode===m ? C.text : C.textSec, textTransform:"capitalize", cursor:"pointer", fontSize:12, fontWeight:700 }
        }, m)
      )
    ),

    React.createElement("div", { style:{ flex:1, overflow:"auto", padding:14, display:"flex", flexDirection:"column", gap:10 } },
      steps.length > 0 && React.createElement("div", { style:{ border:`1px solid ${C.border}`, borderRadius:14, padding:10, background:C.raised } },
        React.createElement("div", { style:{ fontWeight:800, fontSize:12, marginBottom:8, color:C.text } }, "Live steps"),
        steps.slice(-5).map((s,i) =>
          React.createElement("div", { key:i, style:{ display:"flex", gap:8, color:C.textSec, fontSize:12, marginTop:6 } },
            React.createElement(Icon, { name:"check", size:13 }),
            React.createElement("span", null, s.title || "Working")
          )
        )
      ),
      messages.map((m,i) =>
        React.createElement("div", { key:i, style:{ alignSelf:m.role==="user" ? "flex-end" : "flex-start", maxWidth:"92%" } },
          React.createElement("div", { style:{ padding:"10px 12px", borderRadius:14, background:m.role==="user" ? "rgba(124,58,237,.28)" : C.raised, border:`1px solid ${C.border}`, color:C.text, fontSize:13, lineHeight:1.5, whiteSpace:"pre-wrap" } }, m.content),
          m.meta && React.createElement("div", { style:{ color:C.textSec, fontSize:10, marginTop:4 } }, m.meta)
        )
      )
    ),

    React.createElement("div", { style:{ padding:12, borderTop:`1px solid ${C.border}` } },
      React.createElement("div", { style:{ display:"flex", gap:8, marginBottom:8 } },
        React.createElement("button", { title:"Attach file", style:{ width:34, height:34, borderRadius:10, border:`1px solid ${C.border}`, background:C.raised, color:C.textSec } },
          React.createElement(Icon, { name:"paperclip", size:15 })
        ),
        React.createElement("button", { title:"Image tools", style:{ width:34, height:34, borderRadius:10, border:`1px solid ${C.border}`, background:C.raised, color:C.textSec } },
          React.createElement(Icon, { name:"image", size:15 })
        ),
        React.createElement("button", { title:"Website edit", style:{ width:34, height:34, borderRadius:10, border:`1px solid ${C.border}`, background:C.raised, color:C.textSec } },
          React.createElement(Icon, { name:"edit", size:15 })
        )
      ),
      React.createElement("textarea", {
        value:prompt,
        onChange:e=>setPrompt(e.target.value),
        onKeyDown:e=>{ if(e.key==="Enter" && (e.metaKey || e.ctrlKey)) sendPrompt(); },
        placeholder:"Ask Agent Sam to review applications, write a campaign, improve bios...",
        style:{ width:"100%", minHeight:74, resize:"vertical", borderRadius:14, border:`1px solid ${C.border}`, background:C.bg, color:C.text, padding:10, outline:"none", fontFamily:"inherit" }
      }),
      React.createElement("button", {
        onClick:sendPrompt,
        disabled:busy || !prompt.trim(),
        style:{ marginTop:8, width:"100%", height:38, borderRadius:12, border:"none", background:busy ? C.raised : "linear-gradient(135deg,#7c3aed,#a78bfa)", color:"#fff", fontWeight:800, cursor:busy ? "not-allowed" : "pointer" }
      }, busy ? "Agent Sam is working..." : "Send to Agent Sam")
    )
  );
}
''')

# 4) Include script in dashboard HTML
for html in [root / "public/dashboard.html", root / "public/dashboard/index.html"]:
    if html.exists():
        s = html.read_text()
        if "/dashboard/js/agentsam.jsx" not in s:
            s = s.replace(
                '<script type="text/babel" src="/dashboard/js/app.jsx"></script>',
                '<script type="text/babel" src="/dashboard/js/agentsam.jsx"></script>\n<script type="text/babel" src="/dashboard/js/app.jsx"></script>'
            )
        html.write_text(s)

# 5) Patch index imports/routes
idx = root / "src/index.js"
s = idx.read_text()
if "agentsamRoutes" not in s:
    s = s.replace("import { sessionRoutes } from './api/session_api.js';", "import { sessionRoutes } from './api/session_api.js';\nimport { agentsamRoutes } from './api/agentsam_api.js';")

# Insert before dashboard API routes or before asset handling
if "agentsamRoutes(request, env, url" not in s:
    marker = "    const sessionResult = await route(request, env, url);"
    if marker in s:
        s = s.replace(marker, '''    if (url.pathname.startsWith("/api/agentsam/")) {
      const session = await getSession(request, env);
      if (!session) return new Response(JSON.stringify({ error:"Not authenticated" }), { status:401, headers:{ "Content-Type":"application/json" } });
      const agentResult = await agentsamRoutes(request, env, url, session);
      if (agentResult) return agentResult;
    }

''' + marker)
    else:
        # fallback: put right after URL parse if recognizable
        s = s.replace("const url = new URL(request.url);", '''const url = new URL(request.url);

    if (url.pathname.startsWith("/api/agentsam/")) {
      const session = await getSession(request, env);
      if (!session) return new Response(JSON.stringify({ error:"Not authenticated" }), { status:401, headers:{ "Content-Type":"application/json" } });
      const agentResult = await agentsamRoutes(request, env, url, session);
      if (agentResult) return agentResult;
    }''')
idx.write_text(s)

# 6) Replace overview right sidebar block with AgentSamDrawer if possible
ov = js_dir / "view-overview.jsx"
s = ov.read_text()
# append a harmless global replacement: right sidebar usually has My Tasks text; replace section from My Tasks aside if structure is simple
if "AgentSamDrawer" not in s:
    s = re.sub(
        r'React\.createElement\("aside",\s*\{[\s\S]*?My Tasks[\s\S]*?Quick Actions[\s\S]*?\)\s*\)\s*\)\s*\)\s*;?\s*\n?\s*\}',
        'React.createElement(AgentSamDrawer, null)\n}',
        s,
        count=1
    )
ov.write_text(s)

print("AgentSam drawer installer complete.")
