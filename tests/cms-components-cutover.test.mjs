import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const migration = readFileSync(
  new URL("../db/migrations/20261028_cms_components_v2_cutover.sql", import.meta.url), "utf8"
);

test("CMS components cutover preserves IDs, Stripe release data, v2 columns, and index", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(`
      CREATE TABLE cms_components (
        id TEXT PRIMARY KEY, label TEXT NOT NULL, type TEXT NOT NULL,
        config_json TEXT NOT NULL DEFAULT '{}', sort_order INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1, updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE cms_components_new (
        id TEXT PRIMARY KEY, type TEXT NOT NULL, provider TEXT, label TEXT NOT NULL,
        action_type TEXT NOT NULL DEFAULT 'href',
        action_value TEXT, logo_asset_key TEXT,
        style_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(style_json)),
        config_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(config_json)),
        placement TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_cms_components_lookup ON cms_components_new(type,status,placement,sort_order);
      INSERT INTO cms_components(id,label,type,config_json) VALUES
        ('payment_stripe_donation_modal','Old Stripe','payment_modal',
          '{"active_version":"v7","rollback_asset_url":"https://assets.example.org/rollback.js","sha256":"abc"}'),
        ('payment_paypal','PayPal','payment_button','{"url":"https://example.org/new"}');
      INSERT INTO cms_components_new(id,type,provider,label,action_type,action_value,style_json,config_json,placement)
        VALUES
        ('payment_stripe','button','stripe','Card donate','event','donate','{"background":"#fff"}','{"tooltip":"Card"}','donate_options'),
        ('payment_paypal','button','paypal','PayPal','href','https://example.org/new','{"background":"#eef5ff"}','{"tooltip":"PayPal"}','donate_options');
    `);
    // Exactly 10 rows, matching the audited production cohort.
    for (let i = 0; i < 8; i++) {
      const id = "additional_" + i;
      db.prepare("INSERT INTO cms_components(id,label,type,config_json) VALUES (?,?,'share_action','{}')")
        .run(id, id);
      db.prepare("INSERT INTO cms_components_new(id,label,type,action_type,config_json) VALUES (?,?,'share_action','copy','{}')")
        .run(id, id);
    }
    db.exec("BEGIN IMMEDIATE;\n" + migration + "\nCOMMIT;");
    assert.equal(db.prepare("SELECT COUNT(*) n FROM cms_components").get().n, 10);
    assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='cms_components_new'").get(), undefined);
    const oldId = db.prepare("SELECT type,provider,action_type,action_value,style_json,config_json FROM cms_components WHERE id='payment_stripe_donation_modal'").get();
    assert.equal(oldId.type, "button");
    assert.equal(oldId.provider, "stripe");
    assert.equal(oldId.action_type, "event");
    assert.equal(oldId.action_value, "donate");
    const cfg = JSON.parse(oldId.config_json);
    assert.equal(cfg.tooltip, "Card");
    assert.equal(cfg.release.active_version, "v7");
    assert.equal(cfg.release.sha256, "abc");
    assert.equal(cfg.release.rollback_asset_url, "https://assets.example.org/rollback.js");
    assert.equal(JSON.parse(oldId.style_json).background, "#fff");
    assert.equal(db.prepare("SELECT action_value FROM cms_components WHERE id='payment_paypal'").get().action_value, "https://example.org/new");
    const idx = db.prepare("SELECT tbl_name FROM sqlite_master WHERE type='index' AND name='idx_cms_components_lookup'").get();
    assert.equal(idx.tbl_name, "cms_components");
  } finally {
    db.close();
  }
});
