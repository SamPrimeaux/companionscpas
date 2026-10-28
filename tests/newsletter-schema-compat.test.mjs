import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { paymentsEmailRoutes } from "../src/api/payments_email.js";

// Small D1-compatible adapter backed by actual SQLite. All Resend calls are
// intercepted: these tests never send messages or touch production contacts.
function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE newsletter_subscribers (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, first_name TEXT,
      last_name TEXT, status TEXT NOT NULL DEFAULT 'pending',
      source_type TEXT NOT NULL DEFAULT 'form', source_ref TEXT, source_path TEXT,
      consent_text TEXT, consent_ip_hash TEXT, confirm_token_hash TEXT,
      confirmed_at TEXT, subscribed_at TEXT, unsubscribed_at TEXT,
      unsubscribe_token TEXT NOT NULL UNIQUE, tags_json TEXT NOT NULL DEFAULT '[]',
      metadata_json TEXT NOT NULL DEFAULT '{}', last_event_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')), provider_contact_id TEXT
    );
    CREATE TABLE email_logs (
      id TEXT PRIMARY KEY, tenant_id TEXT, recipient_email TEXT,
      recipient_name TEXT, subject TEXT, email_type TEXT, from_email TEXT,
      provider_message_id TEXT, status TEXT, related_type TEXT, related_id TEXT,
      error_message TEXT, sent_at TEXT, body_html TEXT, body_text TEXT, preview_text TEXT
    );
    CREATE TABLE email_templates (
      id TEXT PRIMARY KEY, tenant_id TEXT, template_key TEXT NOT NULL,
      subject TEXT, body_text TEXT, body_html TEXT, status TEXT DEFAULT 'active'
    );
    INSERT INTO email_templates(id,tenant_id,template_key,subject,body_html)
    VALUES('tpl_welcome','tenant_companionscpas','newsletter_welcome','Welcome, {{first_name}}','<p>Hi {{first_name}}</p>');
  `);
  const D1 = {
    prepare(sql) {
      const stmt = db.prepare(sql);
      return {
        bind(...params) {
          return {
            first: async () => stmt.get(...params) ?? null,
            all: async () => ({ results: stmt.all(...params) }),
            run: async () => ({ meta: { changes: Number(stmt.run(...params).changes) } }),
          };
        },
        first: async () => stmt.get() ?? null,
        all: async () => ({ results: stmt.all() }),
        run: async () => ({ meta: { changes: Number(stmt.run().changes) } }),
      };
    },
  };
  return { db, env: { DB: D1, RESEND_API_KEY: "test-only" } };
}

async function route(env, method, pathname, payload) {
  const u = new URL(pathname, "https://example.org");
  const req = new Request(u, {
    method, ...(payload === undefined ? {} : {
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  });
  return paymentsEmailRoutes(req, env, u);
}

test("subscriber remains pending until real token confirmation; duplicate cannot re-send", async () => {
  const { db, env } = fixture();
  const sent = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://api.resend.com/emails");
    const payload = JSON.parse(options.body);
    sent.push(payload);
    return new Response(JSON.stringify({ id: "email_mock_" + sent.length }), { status: 200 });
  };
  try {
    let response = await route(env, "POST", "/api/newsletter/subscribe", {
      email: "TEST@EXAMPLE.ORG", first_name: "Teresa",
      component_id: "home_newsletter", path: "/",
    });
    assert.equal(response.status, 201);
    const first = db.prepare("SELECT * FROM newsletter_subscribers").get();
    assert.equal(first.email, "test@example.org");
    assert.equal(first.first_name, "Teresa");
    assert.equal(first.source_type, "form");
    assert.equal(first.source_ref, "home_newsletter");
    assert.equal(first.status, "pending");
    assert.equal(first.confirm_token_hash.length, 64);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].subject.includes("Confirm"), true);
    const logged = db.prepare("SELECT body_html, body_text FROM email_logs WHERE email_type='newsletter_confirmation'").get();
    assert.equal(logged.body_html, "[confirmation link redacted]");
    assert.equal(logged.body_text, "[confirmation link redacted]");
    assert.equal(logged.body_html.includes("token="), false);

    response = await route(env, "POST", "/api/newsletter/subscribe", {
      email: "test@example.org", first_name: "Teresa",
    });
    assert.equal(response.status, 201);
    assert.equal(db.prepare("SELECT count(*) n FROM newsletter_subscribers").get().n, 1);
    assert.equal(sent.length, 1);

    const href = sent[0].html.match(/href="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
    assert.ok(href, "confirmation link rendered");
    response = await route(env, "GET", href.replace("https://example.org", ""));
    assert.equal(response.status, 200);
    const confirmed = db.prepare("SELECT status, confirmed_at, confirm_token_hash FROM newsletter_subscribers").get();
    assert.equal(confirmed.status, "subscribed");
    assert.ok(confirmed.confirmed_at);
    assert.equal(confirmed.confirm_token_hash, null);
    assert.equal(sent.length, 2);
    assert.equal(sent[1].subject, "Welcome, Teresa");
    response = await route(env, "GET", href.replace("https://example.org", ""));
    assert.equal(response.status, 400, "confirmation token is single use");
  } finally {
    globalThis.fetch = previousFetch;
    db.close();
  }
});

test("bounced and complained contacts never regain subscribed status", async () => {
  const { db, env } = fixture();
  const previousFetch = globalThis.fetch;
  let sends = 0;
  globalThis.fetch = async () => { sends++; throw Error("suppressed contact must not email"); };
  try {
    for (const status of ["bounced", "complained", "subscribed"]) {
      const email = status + "@example.org";
      db.prepare("INSERT INTO newsletter_subscribers(id,email,status,unsubscribe_token) VALUES(?,?,?,?)")
        .run("sub_" + status, email, status, "unsubscribe_" + status);
      const response = await route(env, "POST", "/api/newsletter/subscribe", {
        email, first_name: "Test",
      });
      assert.equal(response.status, 201);
      assert.equal(db.prepare("SELECT status FROM newsletter_subscribers WHERE email = ?").get(email).status, status);
    }
    assert.equal(sends, 0);
  } finally {
    globalThis.fetch = previousFetch;
    db.close();
  }
});
